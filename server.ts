import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  authenticateAdmin,
  clearAdminSession,
  createAdminSession,
  getAdminFromRequest,
  requireAdmin,
  type AuthenticatedRequest,
} from './server/auth.ts';
import {
  db,
  getBusinessSettings,
  hashPassword,
  initDatabase,
  normalizeWhatsAppDigits,
  STANDARD_PACKAGE_SIZES,
} from './server/db.ts';
import { calculateBasketEstimate, type BasketItemInput } from './server/pricing.ts';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPublicProductList(categorySlug?: string, search?: string) {
  let query = `
    SELECT p.id, p.category_id, p.name, p.slug, p.short_description, p.full_description,
           p.wholesale_eligible, p.featured, p.sort_order,
           c.name AS category_name, c.slug AS category_slug, c.animal_type
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.published = 1
  `;
  const params: Array<string> = [];

  if (categorySlug && categorySlug !== 'all') {
    query += ' AND c.slug = ?';
    params.push(categorySlug);
  }
  if (search && search.trim()) {
    query += ' AND (LOWER(p.name) LIKE ? OR LOWER(p.short_description) LIKE ? OR LOWER(c.animal_type) LIKE ?)';
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY c.sort_order ASC, p.sort_order ASC, p.id ASC';

  const rows = db.prepare(query).all(...params) as Array<{
    id: number;
    category_id: number;
    name: string;
    slug: string;
    short_description: string;
    full_description: string;
    wholesale_eligible: number;
    featured: number;
    sort_order: number;
    category_name: string;
    category_slug: string;
    animal_type: string;
  }>;

  return rows.map((p) => {
    const images = db
      .prepare('SELECT id, image_url, alt_text, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC')
      .all(p.id) as Array<{ id: number; image_url: string; alt_text: string; is_primary: number }>;

    const sizes = db
      .prepare(`
        SELECT ps.size_label, ps.weight_kg,
               COALESCE(inv.stock_status, 'in_stock') AS stock_status,
               CASE WHEN COALESCE(inv.show_quantity_to_customers, 0) = 1 THEN inv.stock_quantity ELSE NULL END AS visible_stock_quantity
        FROM package_sizes ps
        LEFT JOIN inventory inv ON inv.product_id = ps.product_id AND inv.size_label = ps.size_label
        WHERE ps.product_id = ? AND ps.enabled = 1
        ORDER BY ps.sort_order ASC
      `)
      .all(p.id) as Array<{
        size_label: string;
        weight_kg: number;
        stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
        visible_stock_quantity: number | null;
      }>;

    // Strictly NO prices returned on public product payloads
    return {
      id: p.id,
      categoryId: p.category_id,
      categoryName: p.category_name,
      categorySlug: p.category_slug,
      animalType: p.animal_type,
      name: p.name,
      slug: p.slug,
      shortDescription: p.short_description,
      fullDescription: p.full_description,
      wholesaleEligible: p.wholesale_eligible === 1,
      featured: p.featured === 1,
      images: images.map((img) => ({
        id: img.id,
        imageUrl: img.image_url,
        altText: img.alt_text,
        isPrimary: img.is_primary === 1,
      })),
      packageSizes: sizes.map((s) => ({
        sizeLabel: s.size_label,
        weightKg: s.weight_kg,
        stockStatus: s.stock_status,
        visibleStockQuantity: s.visible_stock_quantity,
      })),
    };
  });
}

// ---------- PUBLIC API ROUTES ----------

app.get('/api/settings', (_req, res) => {
  const settings = getBusinessSettings();
  const whatsappDigits = normalizeWhatsAppDigits(settings.whatsapp_number || '');
  res.json({
    ...settings,
    whatsapp_digits: whatsappDigits,
  });
});

app.get('/api/categories', (_req, res) => {
  const categories = db
    .prepare(`
      SELECT c.id, c.name, c.slug, c.animal_type, c.description, c.sort_order,
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.published = 1) AS product_count,
             (SELECT pi.image_url FROM products p2 JOIN product_images pi ON pi.product_id = p2.id
              WHERE p2.category_id = c.id AND p2.published = 1
              ORDER BY p2.featured DESC, p2.sort_order ASC, pi.is_primary DESC LIMIT 1) AS cover_image
      FROM categories c
      ORDER BY c.sort_order ASC, c.id ASC
    `)
    .all();
  res.json(categories);
});

app.get('/api/products', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  res.json(getPublicProductList(category, search));
});

app.get('/api/products/:slug', (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const p = db
    .prepare(`
      SELECT p.id, p.category_id, p.name, p.slug, p.short_description, p.full_description,
             p.ingredients, p.feeding_guidance, p.wholesale_eligible, p.featured,
             c.name AS category_name, c.slug AS category_slug, c.animal_type
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ? AND p.published = 1
    `)
    .get(slug) as {
      id: number;
      category_id: number;
      name: string;
      slug: string;
      short_description: string;
      full_description: string;
      ingredients: string;
      feeding_guidance: string;
      wholesale_eligible: number;
      featured: number;
      category_name: string;
      category_slug: string;
      animal_type: string;
    } | undefined;

  if (!p) {
    res.status(404).json({ error: 'Feed product not found.' });
    return;
  }

  const images = db
    .prepare('SELECT id, image_url, alt_text, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC')
    .all(p.id) as Array<{ id: number; image_url: string; alt_text: string; is_primary: number }>;

  const sizes = db
    .prepare(`
      SELECT ps.size_label, ps.weight_kg,
             COALESCE(inv.stock_status, 'in_stock') AS stock_status,
             CASE WHEN COALESCE(inv.show_quantity_to_customers, 0) = 1 THEN inv.stock_quantity ELSE NULL END AS visible_stock_quantity
      FROM package_sizes ps
      LEFT JOIN inventory inv ON inv.product_id = ps.product_id AND inv.size_label = ps.size_label
      WHERE ps.product_id = ? AND ps.enabled = 1
      ORDER BY ps.sort_order ASC
    `)
    .all(p.id) as Array<{
      size_label: string;
      weight_kg: number;
      stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
      visible_stock_quantity: number | null;
    }>;

  const nutrition = db
    .prepare('SELECT id, nutrient_name, nutrient_value FROM nutritional_info WHERE product_id = ? ORDER BY sort_order ASC, id ASC')
    .all(p.id) as Array<{ id: number; nutrient_name: string; nutrient_value: string }>;

  // Strictly NO prices returned on public product detail payloads
  res.json({
    id: p.id,
    categoryId: p.category_id,
    categoryName: p.category_name,
    categorySlug: p.category_slug,
    animalType: p.animal_type,
    name: p.name,
    slug: p.slug,
    shortDescription: p.short_description,
    fullDescription: p.full_description,
    ingredients: p.ingredients,
    feedingGuidance: p.feeding_guidance,
    wholesaleEligible: p.wholesale_eligible === 1,
    featured: p.featured === 1,
    images: images.map((img) => ({
      id: img.id,
      imageUrl: img.image_url,
      altText: img.alt_text,
      isPrimary: img.is_primary === 1,
    })),
    packageSizes: sizes.map((s) => ({
      sizeLabel: s.size_label,
      weightKg: s.weight_kg,
      stockStatus: s.stock_status,
      visibleStockQuantity: s.visible_stock_quantity,
    })),
    nutritionalInfo: nutrition.map((n) => ({
      id: n.id,
      nutrientName: n.nutrient_name,
      nutrientValue: n.nutrient_value,
    })),
  });
});

app.get('/api/faqs', (_req, res) => {
  const rows = db
    .prepare('SELECT id, question, answer, sort_order FROM faqs WHERE published = 1 ORDER BY sort_order ASC, id ASC')
    .all();
  res.json(rows);
});

app.post('/api/basket/estimate', (req, res) => {
  const items = Array.isArray(req.body?.items) ? (req.body.items as BasketItemInput[]) : [];
  const estimate = calculateBasketEstimate(items);
  res.json(estimate);
});

app.post('/api/enquiries', (req, res) => {
  const customerName = String(req.body?.customerName || '').trim();
  const customerPhone = String(req.body?.customerPhone || '').trim();
  const fulfilmentType = req.body?.fulfilmentType === 'delivery' ? 'delivery' : 'pickup';
  const deliveryLocation = String(req.body?.deliveryLocation || '').trim();
  const customerNotes = String(req.body?.customerNotes || '').trim();
  const rawItems = Array.isArray(req.body?.items) ? (req.body.items as BasketItemInput[]) : [];

  if (!customerName || !customerPhone) {
    res.status(400).json({ error: 'Customer name and phone number are required.' });
    return;
  }
  if (fulfilmentType === 'delivery' && !deliveryLocation) {
    res.status(400).json({ error: 'Please enter a delivery location or choose Tanke pickup.' });
    return;
  }

  const estimate = calculateBasketEstimate(rawItems);
  if (estimate.items.length === 0) {
    res.status(400).json({ error: 'Your basket is empty or contains unavailable items.' });
    return;
  }

  const result = db
    .prepare(`
      INSERT INTO order_enquiries (
        customer_name, customer_phone, fulfilment_type, delivery_location, customer_notes,
        items_json, estimated_subtotal, estimated_discount, estimated_total, has_unpriced_items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      customerName,
      customerPhone,
      fulfilmentType,
      deliveryLocation,
      customerNotes,
      JSON.stringify(estimate.items),
      estimate.calculableSubtotal,
      estimate.calculableDiscount,
      estimate.estimatedTotal,
      estimate.hasUnpricedItems ? 1 : 0
    );

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    estimate,
  });
});

// ---------- SEO: ROBOTS.TXT & SITEMAP.XML ----------

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.SITE_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = (process.env.SITE_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const staticPaths = ['/', '/feeds', '/quantity', '/about', '/contact', '/faq', '/pickup-delivery', '/privacy', '/terms'];
  const productSlugs = db
    .prepare('SELECT slug, updated_at FROM products WHERE published = 1 ORDER BY id ASC')
    .all() as Array<{ slug: string; updated_at: string }>;

  const urls = [
    ...staticPaths.map((p) => `<url><loc>${baseUrl}${p}</loc><changefreq>weekly</changefreq></url>`),
    ...productSlugs.map(
      (p) => `<url><loc>${baseUrl}/feeds/${encodeURIComponent(p.slug)}</loc><lastmod>${p.updated_at.slice(0, 10)}</lastmod><changefreq>weekly</changefreq></url>`
    ),
  ].join('\n  ');

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls}\n</urlset>`
  );
});

// ---------- ADMIN AUTH ROUTES ----------

app.post('/api/admin/login', (req, res) => {
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const admin = authenticateAdmin(email, password);
  if (!admin) {
    res.status(401).json({ error: 'Invalid administrator credentials.' });
    return;
  }

  createAdminSession(admin.id, req, res);
  res.json({ admin });
});

app.post('/api/admin/logout', (req, res) => {
  clearAdminSession(req, res);
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ admin });
});

app.post('/api/admin/change-password', requireAdmin, (req: AuthenticatedRequest, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!currentPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters.' });
    return;
  }
  const verified = authenticateAdmin(req.adminUser!.email, currentPassword);
  if (!verified) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }
  db.prepare("UPDATE admin_profiles SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
    hashPassword(newPassword),
    req.adminUser!.id
  );
  res.json({ ok: true });
});

// ---------- PROTECTED ADMIN DATA ROUTES ----------

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const totalProducts = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c;
  const publishedProducts = (db.prepare('SELECT COUNT(*) AS c FROM products WHERE published = 1').get() as { c: number }).c;
  const configuredPrices = (
    db.prepare(`
      SELECT COUNT(*) AS c FROM product_prices pp
      JOIN package_sizes ps ON ps.product_id = pp.product_id AND ps.size_label = pp.size_label
      WHERE ps.enabled = 1 AND pp.price_ngn IS NOT NULL AND pp.price_ngn > 0
    `).get() as { c: number }
  ).c;
  const totalEnabledSizes = (
    db.prepare('SELECT COUNT(*) AS c FROM package_sizes WHERE enabled = 1').get() as { c: number }
  ).c;
  const activeDiscounts = (db.prepare('SELECT COUNT(*) AS c FROM discount_rules WHERE active = 1').get() as { c: number }).c;
  const outOfStockCount = (
    db.prepare(`
      SELECT COUNT(*) AS c FROM inventory inv
      JOIN package_sizes ps ON ps.product_id = inv.product_id AND ps.size_label = inv.size_label
      WHERE ps.enabled = 1 AND inv.stock_status = 'out_of_stock'
    `).get() as { c: number }
  ).c;
  const totalEnquiries = (db.prepare('SELECT COUNT(*) AS c FROM order_enquiries').get() as { c: number }).c;
  const recentEnquiries = db
    .prepare('SELECT * FROM order_enquiries ORDER BY id DESC LIMIT 10')
    .all();

  res.json({
    totalProducts,
    publishedProducts,
    configuredPrices,
    totalEnabledSizes,
    activeDiscounts,
    outOfStockCount,
    totalEnquiries,
    recentEnquiries,
  });
});

app.get('/api/admin/products', requireAdmin, (_req, res) => {
  const products = db
    .prepare(`
      SELECT p.*, c.name AS category_name, c.animal_type
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ORDER BY c.sort_order ASC, p.sort_order ASC, p.id ASC
    `)
    .all() as Array<Record<string, unknown>>;

  const enriched = products.map((p) => {
    const id = Number(p.id);
    const images = db
      .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC')
      .all(id);
    const packageSizes = db
      .prepare('SELECT * FROM package_sizes WHERE product_id = ? ORDER BY sort_order ASC')
      .all(id);
    const prices = db
      .prepare('SELECT * FROM product_prices WHERE product_id = ?')
      .all(id);
    const inventory = db
      .prepare('SELECT * FROM inventory WHERE product_id = ?')
      .all(id);
    const nutritionalInfo = db
      .prepare('SELECT * FROM nutritional_info WHERE product_id = ? ORDER BY sort_order ASC')
      .all(id);
    return {
      ...p,
      images,
      packageSizes,
      prices,
      inventory,
      nutritionalInfo,
    };
  });

  res.json(enriched);
});

app.post('/api/admin/upload-image', requireAdmin, (req, res) => {
  const dataUrl = String(req.body?.dataUrl || '');
  const filenameHint = String(req.body?.filename || 'feed-image').replace(/[^a-zA-Z0-9_-]/g, '');
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    res.status(400).json({ error: 'Invalid image format. Upload PNG, JPG, or WebP.' });
    return;
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const safeName = `${filenameHint || 'product'}-${Date.now()}.${ext}`;
  const outPath = path.join(uploadsDir, safeName);
  fs.writeFileSync(outPath, buffer);
  res.json({ imageUrl: `/uploads/${safeName}` });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const categoryId = Number(req.body?.categoryId);
  const shortDescription = String(req.body?.shortDescription || '').trim();
  const fullDescription = String(req.body?.fullDescription || '').trim();
  const ingredients = String(req.body?.ingredients || '').trim();
  const feedingGuidance = String(req.body?.feedingGuidance || '').trim();
  const wholesaleEligible = req.body?.wholesaleEligible !== false ? 1 : 0;
  const published = req.body?.published !== false ? 1 : 0;
  const featured = req.body?.featured === true ? 1 : 0;
  const imageUrl = String(req.body?.imageUrl || '').trim();
  const altText = String(req.body?.altText || name).trim();
  const enabledSizes = Array.isArray(req.body?.enabledSizes) ? (req.body.enabledSizes as string[]) : ['1kg', '2kg', '5kg'];
  const nutritionalInfo = Array.isArray(req.body?.nutritionalInfo)
    ? (req.body.nutritionalInfo as Array<{ nutrientName: string; nutrientValue: string }>)
    : [];

  if (!name || !Number.isInteger(categoryId) || categoryId <= 0) {
    res.status(400).json({ error: 'Product name and category are required.' });
    return;
  }

  let slug = slugify(String(req.body?.slug || name));
  const existing = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const txn = db.transaction(() => {
    const result = db
      .prepare(`
        INSERT INTO products (
          category_id, name, slug, short_description, full_description,
          ingredients, feeding_guidance, wholesale_eligible, published, featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        categoryId,
        name,
        slug,
        shortDescription,
        fullDescription,
        ingredients,
        feedingGuidance,
        wholesaleEligible,
        published,
        featured
      );
    const productId = Number(result.lastInsertRowid);

    if (imageUrl) {
      db.prepare(
        'INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary) VALUES (?, ?, ?, 1, 1)'
      ).run(productId, imageUrl, altText);
    }

    STANDARD_PACKAGE_SIZES.forEach((sizeLabel, idx) => {
      const weightKg = parseFloat(sizeLabel.replace('kg', ''));
      const isEnabled = enabledSizes.includes(sizeLabel) ? 1 : 0;
      db.prepare(
        'INSERT INTO package_sizes (product_id, size_label, weight_kg, enabled, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).run(productId, sizeLabel, weightKg, isEnabled, idx + 1);
      db.prepare(
        "INSERT INTO inventory (product_id, size_label, stock_quantity, stock_status, show_quantity_to_customers) VALUES (?, ?, NULL, 'in_stock', 0)"
      ).run(productId, sizeLabel);
      db.prepare(
        "INSERT INTO product_prices (product_id, size_label, price_ngn, currency) VALUES (?, ?, NULL, 'NGN')"
      ).run(productId, sizeLabel);
    });

    nutritionalInfo.forEach((n, idx) => {
      if (n.nutrientName?.trim() && n.nutrientValue?.trim()) {
        db.prepare(
          'INSERT INTO nutritional_info (product_id, nutrient_name, nutrient_value, sort_order) VALUES (?, ?, ?, ?)'
        ).run(productId, n.nutrientName.trim(), n.nutrientValue.trim(), idx + 1);
      }
    });

    return productId;
  });

  const productId = txn();
  res.status(201).json({ id: productId, slug });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: 'Invalid product ID.' });
    return;
  }

  const existing = db.prepare('SELECT id, slug FROM products WHERE id = ?').get(productId) as
    | { id: number; slug: string }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const name = String(req.body?.name || '').trim();
  const categoryId = Number(req.body?.categoryId);
  const shortDescription = String(req.body?.shortDescription || '').trim();
  const fullDescription = String(req.body?.fullDescription || '').trim();
  const ingredients = String(req.body?.ingredients || '').trim();
  const feedingGuidance = String(req.body?.feedingGuidance || '').trim();
  const wholesaleEligible = req.body?.wholesaleEligible !== false ? 1 : 0;
  const published = req.body?.published !== false ? 1 : 0;
  const featured = req.body?.featured === true ? 1 : 0;
  const imageUrl = String(req.body?.imageUrl || '').trim();
  const altText = String(req.body?.altText || name).trim();
  const enabledSizes = Array.isArray(req.body?.enabledSizes) ? (req.body.enabledSizes as string[]) : null;
  const nutritionalInfo = Array.isArray(req.body?.nutritionalInfo)
    ? (req.body.nutritionalInfo as Array<{ nutrientName: string; nutrientValue: string }>)
    : null;

  if (!name || !Number.isInteger(categoryId) || categoryId <= 0) {
    res.status(400).json({ error: 'Product name and category are required.' });
    return;
  }

  const txn = db.transaction(() => {
    db.prepare(`
      UPDATE products
      SET category_id = ?, name = ?, short_description = ?, full_description = ?,
          ingredients = ?, feeding_guidance = ?, wholesale_eligible = ?,
          published = ?, featured = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      categoryId,
      name,
      shortDescription,
      fullDescription,
      ingredients,
      feedingGuidance,
      wholesaleEligible,
      published,
      featured,
      productId
    );

    if (imageUrl) {
      const currentImg = db
        .prepare('SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1')
        .get(productId) as { id: number } | undefined;
      if (currentImg) {
        db.prepare('UPDATE product_images SET image_url = ?, alt_text = ? WHERE id = ?').run(
          imageUrl,
          altText,
          currentImg.id
        );
      } else {
        db.prepare(
          'INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary) VALUES (?, ?, ?, 1, 1)'
        ).run(productId, imageUrl, altText);
      }
    }

    if (enabledSizes) {
      for (const sizeLabel of STANDARD_PACKAGE_SIZES) {
        const isEnabled = enabledSizes.includes(sizeLabel) ? 1 : 0;
        db.prepare('UPDATE package_sizes SET enabled = ? WHERE product_id = ? AND size_label = ?').run(
          isEnabled,
          productId,
          sizeLabel
        );
      }
    }

    if (nutritionalInfo) {
      db.prepare('DELETE FROM nutritional_info WHERE product_id = ?').run(productId);
      nutritionalInfo.forEach((n, idx) => {
        if (n.nutrientName?.trim() && n.nutrientValue?.trim()) {
          db.prepare(
            'INSERT INTO nutritional_info (product_id, nutrient_name, nutrient_value, sort_order) VALUES (?, ?, ?, ?)'
          ).run(productId, n.nutrientName.trim(), n.nutrientValue.trim(), idx + 1);
        }
      });
    }
  });

  txn();
  res.json({ ok: true });
});

app.patch('/api/admin/products/:id/publish', requireAdmin, (req, res) => {
  const productId = Number(req.params.id);
  const published = req.body?.published ? 1 : 0;
  db.prepare("UPDATE products SET published = ?, updated_at = datetime('now') WHERE id = ?").run(published, productId);
  res.json({ ok: true });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const productId = Number(req.params.id);
  db.prepare('DELETE FROM products WHERE id = ?').run(productId);
  res.json({ ok: true });
});

app.get('/api/admin/categories', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all());
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const sortOrder = Number(req.body?.sort_order ?? 0);
  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  db.prepare("UPDATE categories SET name = ?, description = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?").run(
    name,
    description,
    sortOrder,
    id
  );
  res.json({ ok: true });
});

app.get('/api/admin/pricing', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(`
      SELECT p.id AS product_id, p.name AS product_name, c.name AS category_name,
             ps.size_label, ps.enabled, pp.price_ngn
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN package_sizes ps ON ps.product_id = p.id
      LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.size_label = ps.size_label
      ORDER BY c.sort_order ASC, p.sort_order ASC, ps.sort_order ASC
    `)
    .all();
  res.json(rows);
});

app.put('/api/admin/pricing', requireAdmin, (req, res) => {
  const updates = Array.isArray(req.body?.updates)
    ? (req.body.updates as Array<{ productId: number; sizeLabel: string; priceNgn: number | null }>)
    : [];

  const upsert = db.prepare(`
    INSERT INTO product_prices (product_id, size_label, price_ngn, currency, updated_at)
    VALUES (?, ?, ?, 'NGN', datetime('now'))
    ON CONFLICT(product_id, size_label)
    DO UPDATE SET price_ngn = excluded.price_ngn, updated_at = datetime('now')
  `);

  const txn = db.transaction(() => {
    for (const u of updates) {
      const priceVal =
        u.priceNgn === null || u.priceNgn === undefined || String(u.priceNgn).trim() === ''
          ? null
          : Number(u.priceNgn);
      if (priceVal !== null && (!Number.isFinite(priceVal) || priceVal < 0)) continue;
      upsert.run(u.productId, u.sizeLabel, priceVal);
    }
  });
  txn();
  res.json({ ok: true });
});

app.get('/api/admin/discounts', requireAdmin, (_req, res) => {
  const rules = db
    .prepare(`
      SELECT d.*, p.name AS product_name
      FROM discount_rules d
      LEFT JOIN products p ON p.id = d.product_id
      ORDER BY d.id DESC
    `)
    .all();
  res.json(rules);
});

app.post('/api/admin/discounts', requireAdmin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const productId = req.body?.productId ? Number(req.body.productId) : null;
  const sizeLabel = req.body?.sizeLabel ? String(req.body.sizeLabel).trim() : null;
  const minQuantity = Number(req.body?.minQuantity);
  const discountType = req.body?.discountType === 'fixed' ? 'fixed' : 'percentage';
  const discountValue = Number(req.body?.discountValue);
  const active = req.body?.active !== false ? 1 : 0;

  if (!name || !Number.isInteger(minQuantity) || minQuantity < 1 || !Number.isFinite(discountValue) || discountValue <= 0) {
    res.status(400).json({ error: 'Provide a valid rule name, minimum quantity (>= 1), and discount value.' });
    return;
  }
  if (discountType === 'percentage' && discountValue > 100) {
    res.status(400).json({ error: 'Percentage discount cannot exceed 100%.' });
    return;
  }

  const result = db
    .prepare(`
      INSERT INTO discount_rules (name, product_id, size_label, min_quantity, discount_type, discount_value, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(name, productId, sizeLabel, minQuantity, discountType, discountValue, active);

  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

app.put('/api/admin/discounts/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || '').trim();
  const productId = req.body?.productId ? Number(req.body.productId) : null;
  const sizeLabel = req.body?.sizeLabel ? String(req.body.sizeLabel).trim() : null;
  const minQuantity = Number(req.body?.minQuantity);
  const discountType = req.body?.discountType === 'fixed' ? 'fixed' : 'percentage';
  const discountValue = Number(req.body?.discountValue);
  const active = req.body?.active ? 1 : 0;

  if (!name || !Number.isInteger(minQuantity) || minQuantity < 1 || !Number.isFinite(discountValue) || discountValue <= 0) {
    res.status(400).json({ error: 'Invalid discount rule parameters.' });
    return;
  }

  db.prepare(`
    UPDATE discount_rules
    SET name = ?, product_id = ?, size_label = ?, min_quantity = ?,
        discount_type = ?, discount_value = ?, active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, productId, sizeLabel, minQuantity, discountType, discountValue, active, id);

  res.json({ ok: true });
});

app.delete('/api/admin/discounts/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM discount_rules WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/inventory', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(`
      SELECT p.id AS product_id, p.name AS product_name, c.name AS category_name,
             ps.size_label, ps.enabled,
             COALESCE(inv.stock_status, 'in_stock') AS stock_status,
             inv.stock_quantity,
             COALESCE(inv.show_quantity_to_customers, 0) AS show_quantity_to_customers
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN package_sizes ps ON ps.product_id = p.id
      LEFT JOIN inventory inv ON inv.product_id = p.id AND inv.size_label = ps.size_label
      ORDER BY c.sort_order ASC, p.sort_order ASC, ps.sort_order ASC
    `)
    .all();
  res.json(rows);
});

app.put('/api/admin/inventory', requireAdmin, (req, res) => {
  const updates = Array.isArray(req.body?.updates)
    ? (req.body.updates as Array<{
        productId: number;
        sizeLabel: string;
        stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
        stockQuantity: number | null;
        showQuantityToCustomers: boolean;
      }>)
    : [];

  const upsert = db.prepare(`
    INSERT INTO inventory (product_id, size_label, stock_quantity, stock_status, show_quantity_to_customers, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(product_id, size_label)
    DO UPDATE SET stock_quantity = excluded.stock_quantity,
                  stock_status = excluded.stock_status,
                  show_quantity_to_customers = excluded.show_quantity_to_customers,
                  updated_at = datetime('now')
  `);

  const txn = db.transaction(() => {
    for (const u of updates) {
      const validStatus = ['in_stock', 'low_stock', 'out_of_stock'].includes(u.stockStatus)
        ? u.stockStatus
        : 'in_stock';
      const qty =
        u.stockQuantity === null || u.stockQuantity === undefined || String(u.stockQuantity).trim() === ''
          ? null
          : Math.max(0, Math.floor(Number(u.stockQuantity)));
      upsert.run(u.productId, u.sizeLabel, qty, validStatus, u.showQuantityToCustomers ? 1 : 0);
    }
  });
  txn();
  res.json({ ok: true });
});

app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  res.json(getBusinessSettings());
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const entries = req.body && typeof req.body === 'object' ? Object.entries(req.body as Record<string, string>) : [];
  const upsert = db.prepare(`
    INSERT INTO business_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);
  const txn = db.transaction(() => {
    for (const [k, v] of entries) {
      if (typeof v === 'string') {
        upsert.run(k, v.trim());
      }
    }
  });
  txn();
  res.json({ ok: true });
});

app.get('/api/admin/faqs', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC').all());
});

app.post('/api/admin/faqs', requireAdmin, (req, res) => {
  const question = String(req.body?.question || '').trim();
  const answer = String(req.body?.answer || '').trim();
  const sortOrder = Number(req.body?.sortOrder ?? 10);
  const published = req.body?.published !== false ? 1 : 0;
  if (!question || !answer) {
    res.status(400).json({ error: 'Question and answer are required.' });
    return;
  }
  const r = db
    .prepare('INSERT INTO faqs (question, answer, sort_order, published) VALUES (?, ?, ?, ?)')
    .run(question, answer, sortOrder, published);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.put('/api/admin/faqs/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const question = String(req.body?.question || '').trim();
  const answer = String(req.body?.answer || '').trim();
  const sortOrder = Number(req.body?.sortOrder ?? 10);
  const published = req.body?.published ? 1 : 0;
  db.prepare(
    "UPDATE faqs SET question = ?, answer = ?, sort_order = ?, published = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(question, answer, sortOrder, published, id);
  res.json({ ok: true });
});

app.delete('/api/admin/faqs/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM faqs WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/enquiries', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM order_enquiries ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});

// ---------- VITE / STATIC SERVING ----------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sam Kay Animal Feeds server listening on http://localhost:${PORT}`);
  });
}

startServer();
