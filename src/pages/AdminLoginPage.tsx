import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BRAND_LOGO_URL } from '../components/Navbar';
import { setPageSeo, useRouter } from '../context/RouterContext';
import type { AdminUser } from '../types';

export function AdminLoginPage({ onAuthenticated }: { onAuthenticated: (user: AdminUser) => void }) {
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPageSeo('Admin Login | Sam Kay Animal Feeds', 'Protected administrator portal for Sam Kay Animal Feeds.');
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.admin) {
          onAuthenticated(data.admin);
          navigate('/admin/dashboard');
        }
      })
      .catch(() => {});
  }, [navigate, onAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Invalid credentials.');
        return;
      }
      onAuthenticated(data.admin);
      navigate('/admin/dashboard');
    } catch {
      setError('Unable to reach server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#e5e3da] rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <img
            src={BRAND_LOGO_URL}
            alt="Sam Kay Animal Feeds logo"
            className="w-11 h-11 object-contain"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="font-display text-xl font-bold text-[#18221d]">Administrator Sign In</h1>
            <p className="text-xs text-[#525b56]">Sam Kay Animal Feeds — Private Management Portal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-semibold text-[#18221d] mb-1">
              Administrator Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@samkayanimalfeeds.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#d6d3c7] text-sm text-[#18221d] min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold text-[#18221d] mb-1">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter administrator password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#d6d3c7] text-sm text-[#18221d] min-h-[44px]"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-[#dc2626]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold hover:bg-[#0c594e] disabled:opacity-60 min-h-[44px]"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? 'Signing In…' : 'Sign In'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-[#e5e3da] flex items-center justify-between text-xs text-[#525b56]">
          <span>No public registration.</span>
          <button type="button" onClick={() => navigate('/')} className="text-[#0f6b5e] font-semibold hover:underline">
            ← Return to Storefront
          </button>
        </div>
      </div>
    </div>
  );
}
