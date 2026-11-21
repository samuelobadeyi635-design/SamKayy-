import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db, verifyPassword } from './db.ts';

const COOKIE_NAME = 'samkay_admin_session';
const SESSION_TTL_HOURS = 24;

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'samkay-local-dev-session-secret-change-in-prod';
}

function signToken(token: string): string {
  const hmac = crypto.createHmac('sha256', getSessionSecret()).update(token).digest('hex');
  return `${token}.${hmac}`;
}

function verifySignedToken(signed: string | undefined): string | null {
  if (!signed) return null;
  const dotIdx = signed.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const token = signed.slice(0, dotIdx);
  const providedSig = signed.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(token).digest('hex');
  const a = Buffer.from(providedSig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return token;
}

export function authenticateAdmin(email: string, password: string): AdminUser | null {
  const normalized = email.trim().toLowerCase();
  const row = db
    .prepare('SELECT id, email, full_name, role, password_hash FROM admin_profiles WHERE LOWER(email) = ?')
    .get(normalized) as (AdminUser & { password_hash: string }) | undefined;

  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
  };
}

export function createAdminSession(adminId: number, req: Request, res: Response): void {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  db.prepare("DELETE FROM admin_sessions WHERE expires_at < datetime('now')").run();
  db.prepare('INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    adminId,
    expiresAt
  );

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const signed = signToken(token);
  res.cookie(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: SESSION_TTL_HOURS * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAdminSession(req: Request, res: Response): void {
  const signed = req.cookies?.[COOKIE_NAME] as string | undefined;
  const token = verifySignedToken(signed);
  if (token) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function getAdminFromRequest(req: Request): AdminUser | null {
  const signed = req.cookies?.[COOKIE_NAME] as string | undefined;
  const token = verifySignedToken(signed);
  if (!token) return null;

  const row = db
    .prepare(`
      SELECT a.id, a.email, a.full_name, a.role, s.expires_at
      FROM admin_sessions s
      JOIN admin_profiles a ON a.id = s.admin_id
      WHERE s.token = ?
    `)
    .get(token) as (AdminUser & { expires_at: string }) | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
  };
}

export interface AuthenticatedRequest extends Request {
  adminUser?: AdminUser;
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    res.status(401).json({ error: 'Administrator authentication required.' });
    return;
  }
  req.adminUser = admin;
  next();
}
