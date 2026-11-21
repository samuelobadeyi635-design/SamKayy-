import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'samkay.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const STANDARD_PACKAGE_SIZES = ['1kg', '2kg', '5kg', '10kg', '20kg', '25kg'] as const;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES admin_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      animal_type TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      short_description TEXT NOT NULL DEFAULT '',
      full_description TEXT NOT NULL DEFAULT '',
      ingredients TEXT NOT NULL DEFAULT '',
      feeding_guidance TEXT NOT NULL DEFAULT '',
      wholesale_eligible INTEGER NOT NULL DEFAULT 1,
      published INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS package_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      size_label TEXT NOT NULL,
      weight_kg REAL NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(product_id, size_label),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      size_label TEXT NOT NULL,
      price_ngn REAL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(product_id, size_label),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS discount_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      product_id INTEGER,
      size_label TEXT,
      min_quantity INTEGER NOT NULL DEFAULT 5,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed')),
      discount_value REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      size_label TEXT NOT NULL,
      stock_quantity INTEGER,
      stock_status TEXT NOT NULL DEFAULT 'in_stock' CHECK(stock_status IN ('in_stock', 'low_stock', 'out_of_stock')),
      show_quantity_to_customers INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(product_id, size_label),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nutritional_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      nutrient_name TEXT NOT NULL,
      nutrient_value TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      fulfilment_type TEXT NOT NULL CHECK(fulfilment_type IN ('pickup', 'delivery')),
      delivery_location TEXT NOT NULL DEFAULT '',
      customer_notes TEXT NOT NULL DEFAULT '',
      items_json TEXT NOT NULL,
      estimated_subtotal REAL NOT NULL DEFAULT 0,
      estimated_discount REAL NOT NULL DEFAULT 0,
      estimated_total REAL NOT NULL DEFAULT 0,
      has_unpriced_items INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const adminCount = db.prepare('SELECT COUNT(*) AS count FROM admin_profiles').get() as { count: number };
  if (adminCount.count === 0) {
    const email = (process.env.ADMIN_EMAIL || 'admin@samkayanimalfeeds.com').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'SamKayAdmin!2026';
    db.prepare(
      'INSERT INTO admin_profiles (email, full_name, role, password_hash) VALUES (?, ?, ?, ?)'
    ).run(email, 'Sam Kay Administrator', 'admin', hashPassword(password));
  }

  const settingsDefaults: Array<[string, string]> = [
    ['business_name', 'Sam Kay Animal Feeds'],
    ['business_location', 'Tanke, Kwara State, Nigeria'],
    ['business_tagline', 'Manufacturer and supplier of quality rabbit, dog, and cat feeds.'],
    ['whatsapp_number', '+234 09042450053'],
    ['contact_phone', '+234 09042450053'],
    ['contact_email', 'orders@samkayanimalfeeds.com'],
    ['pickup_address', 'Tanke, Ilorin, Kwara State, Nigeria (Exact pickup landmark confirmed upon order enquiry)'],
    ['pickup_hours', 'Monday – Saturday, 8:00 AM – 6:00 PM'],
    ['delivery_info', 'Delivery is available across Tanke and neighbouring Ilorin areas, subject to confirmation of service coverage, delivery charges, and dispatch timing on WhatsApp.'],
    ['wholesale_note', 'Wholesale and bulk supply available across Rabbit, Dog, and Cat feeds. Contact us or select larger quantities in your basket for bulk order enquiries.'],
    ['currency_symbol', '₦'],
  ];

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO business_settings (key, value) VALUES (?, ?)'
  );
  for (const [k, v] of settingsDefaults) {
    insertSetting.run(k, v);
  }

  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };
  if (categoryCount.count === 0) {
    const insertCat = db.prepare(
      'INSERT INTO categories (name, slug, animal_type, description, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    insertCat.run(
      'Rabbit Feeds',
      'rabbit-feeds',
      'Rabbit',
      'Fibre-rich Timothy hay, balanced rabbit pellets, and fresh leafy greens for daily rabbit nutrition.',
      1
    );
    insertCat.run(
      'Dog Feeds',
      'dog-feeds',
      'Dog',
      'Complete dry kibble, hearty wet stew, and salmon bite treats formulated for dogs.',
      2
    );
    insertCat.run(
      'Cat Feeds',
      'cat-feeds',
      'Cat',
      'Crunchy daily kibble, moist salmon pate wet food, and bite-sized chicken treats for cats.',
      3
    );
  }

  const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
  if (productCount.count === 0) {
    const catRows = db.prepare('SELECT id, slug FROM categories').all() as Array<{ id: number; slug: string }>;
    const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));

    const initialProducts = [
      // RABBIT FEEDS (from PDF pages 6-7)
      {
        categorySlug: 'rabbit-feeds',
        name: 'Rabbit Hay - Timothy Hay',
        slug: 'rabbit-hay-timothy-hay',
        shortDescription: 'Timothy hay - the main daily fibre for rabbits.',
        fullDescription: 'Timothy hay - the main daily fibre for rabbits. Supplied clean and dry for daily rabbit feeding at retail and wholesale volumes.',
        imageUrl: '/assets/products/rabbit-hay-timothy-hay.jpg',
        altText: 'Rabbit beside a bundle of Rabbit Hay - Timothy Hay labelled only hay feed',
        enabledSizes: ['1kg', '2kg', '5kg', '10kg', '20kg', '25kg'],
        featured: 1,
        sortOrder: 1,
      },
      {
        categorySlug: 'rabbit-feeds',
        name: 'Rabbit Pellets',
        slug: 'rabbit-pellets',
        shortDescription: 'Balanced pellets for daily nutrition.',
        fullDescription: 'Balanced pellets for daily nutrition. Suitable for daily rabbit feeding and bulk farm or pet-owner supply.',
        imageUrl: '/assets/products/rabbit-pellets.jpg',
        altText: 'Rabbit next to a ceramic bowl of Rabbit Pellets',
        enabledSizes: ['1kg', '2kg', '5kg', '10kg', '20kg', '25kg'],
        featured: 1,
        sortOrder: 2,
      },
      {
        categorySlug: 'rabbit-feeds',
        name: 'Rabbit Fresh Greens - Carrots & Leafy Vegetables',
        slug: 'rabbit-fresh-greens-carrots-leafy-vegetables',
        shortDescription: 'Fresh carrots, kale, romaine and leafy greens.',
        fullDescription: 'Fresh carrots, kale, romaine and leafy greens prepared for rabbit feeding. Available in smaller fresh-pack sizes.',
        imageUrl: '/assets/products/rabbit-fresh-greens-carrots-leafy-vegetables.jpg',
        altText: 'Rabbit with a plate of Rabbit Fresh Greens - Carrots & Leafy Vegetables including carrots, kale, and romaine',
        enabledSizes: ['1kg', '2kg', '5kg'],
        featured: 0,
        sortOrder: 3,
      },
      // DOG FEEDS (from PDF pages 4-5)
      {
        categorySlug: 'dog-feeds',
        name: 'Dog Dry Kibble - Chicken & Brown Rice',
        slug: 'dog-dry-kibble-chicken-brown-rice',
        shortDescription: 'Complete dry kibble with chicken and brown rice.',
        fullDescription: 'Complete dry kibble with chicken and brown rice. Suitable for everyday dog feeding across retail bags and bulk supply.',
        imageUrl: '/assets/products/dog-dry-kibble-chicken-brown-rice.jpg',
        altText: 'Dog beside kraft feed bag and bowl of Dog Dry Kibble - Chicken & Brown Rice',
        enabledSizes: ['1kg', '2kg', '5kg', '10kg', '20kg', '25kg'],
        featured: 1,
        sortOrder: 1,
      },
      {
        categorySlug: 'dog-feeds',
        name: 'Dog Wet Food - Beef Stew',
        slug: 'dog-wet-food-beef-stew',
        shortDescription: 'Hearty beef stew wet food, served moist.',
        fullDescription: 'Hearty beef stew wet food, served moist. Ideal as a standalone moist meal or topper for dogs.',
        imageUrl: '/assets/products/dog-wet-food-beef-stew.jpg',
        altText: 'Dog looking at a bowl of Dog Wet Food - Beef Stew',
        enabledSizes: ['1kg', '2kg', '5kg'],
        featured: 0,
        sortOrder: 2,
      },
      {
        categorySlug: 'dog-feeds',
        name: 'Dog Treats - Salmon Bites',
        slug: 'dog-treats-salmon-bites',
        shortDescription: 'Soft salmon bite treats for rewards.',
        fullDescription: 'Soft salmon bite treats for rewards and training sessions.',
        imageUrl: '/assets/products/dog-treats-salmon-bites.jpg',
        altText: 'Dog beside a bowl of Dog Treats - Salmon Bites',
        enabledSizes: ['1kg', '2kg'],
        featured: 0,
        sortOrder: 3,
      },
      // CAT FEEDS (from PDF pages 2-3)
      {
        categorySlug: 'cat-feeds',
        name: 'Cat Dry Kibble',
        slug: 'cat-dry-kibble',
        shortDescription: 'Dry, crunchy kibble for daily feeding.',
        fullDescription: 'Dry, crunchy kibble for daily feeding. Convenient for household cat owners and bulk cattery or retail orders.',
        imageUrl: '/assets/products/cat-dry-kibble.jpg',
        altText: 'Orange tabby cat beside a bowl of Cat Dry Kibble',
        enabledSizes: ['1kg', '2kg', '5kg', '10kg', '20kg', '25kg'],
        featured: 1,
        sortOrder: 1,
      },
      {
        categorySlug: 'cat-feeds',
        name: 'Cat Wet Food - Salmon Pate',
        slug: 'cat-wet-food-salmon-pate',
        shortDescription: 'Soft, moist salmon pate - high in hydration.',
        fullDescription: 'Soft, moist salmon pate - high in hydration. Easy to serve for daily cat feeding.',
        imageUrl: '/assets/products/cat-wet-food-salmon-pate.jpg',
        altText: 'Tabby cat beside a bowl of Cat Wet Food - Salmon Pate',
        enabledSizes: ['1kg', '2kg', '5kg'],
        featured: 0,
        sortOrder: 2,
      },
      {
        categorySlug: 'cat-feeds',
        name: 'Cat Treats - Chicken Bites',
        slug: 'cat-treats-chicken-bites',
        shortDescription: 'Small bite-sized chicken treats for training & rewards.',
        fullDescription: 'Small bite-sized chicken treats for training & rewards.',
        imageUrl: '/assets/products/cat-treats-chicken-bites.jpg',
        altText: 'Tabby cat beside a dish of Cat Treats - Chicken Bites',
        enabledSizes: ['1kg', '2kg'],
        featured: 0,
        sortOrder: 3,
      },
    ];

    const insertProduct = db.prepare(`
      INSERT INTO products (category_id, name, slug, short_description, full_description, wholesale_eligible, published, featured, sort_order)
      VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)
    `);
    const insertImage = db.prepare(`
      INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (?, ?, ?, 1, 1)
    `);
    const insertSize = db.prepare(`
      INSERT INTO package_sizes (product_id, size_label, weight_kg, enabled, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertInventory = db.prepare(`
      INSERT INTO inventory (product_id, size_label, stock_quantity, stock_status, show_quantity_to_customers)
      VALUES (?, ?, NULL, 'in_stock', 0)
    `);
    const insertPrice = db.prepare(`
      INSERT INTO product_prices (product_id, size_label, price_ngn, currency)
      VALUES (?, ?, NULL, 'NGN')
    `);

    const seedTxn = db.transaction(() => {
      for (const p of initialProducts) {
        const categoryId = catBySlug.get(p.categorySlug);
        if (!categoryId) continue;
        const result = insertProduct.run(
          categoryId,
          p.name,
          p.slug,
          p.shortDescription,
          p.fullDescription,
          p.featured,
          p.sortOrder
        );
        const productId = Number(result.lastInsertRowid);
        insertImage.run(productId, p.imageUrl, p.altText);

        STANDARD_PACKAGE_SIZES.forEach((sizeLabel, idx) => {
          const weightKg = parseFloat(sizeLabel.replace('kg', ''));
          const enabled = p.enabledSizes.includes(sizeLabel) ? 1 : 0;
          insertSize.run(productId, sizeLabel, weightKg, enabled, idx + 1);
          insertInventory.run(productId, sizeLabel);
          insertPrice.run(productId, sizeLabel);
        });
      }
    });
    seedTxn();
  }

  const faqCount = db.prepare('SELECT COUNT(*) AS count FROM faqs').get() as { count: number };
  if (faqCount.count === 0) {
    const insertFaq = db.prepare(
      'INSERT INTO faqs (question, answer, sort_order, published) VALUES (?, ?, ?, 1)'
    );
    insertFaq.run(
      'How do I place an order with Sam Kay Animal Feeds?',
      'Browse our Rabbit, Dog, or Cat feeds, select your preferred package size and quantity on each product page, and add them to your Quantity basket. On the Quantity page, enter your name, phone number, and pickup or delivery preference, then tap Send Order on WhatsApp to submit your enquiry directly to our team.',
      1
    );
    insertFaq.run(
      'Why are individual product prices not displayed on the catalogue cards?',
      'We keep individual unit pricing private on public catalogue listings and calculate your estimated order total—including any applicable wholesale discounts—directly in your Quantity basket. For package sizes without a listed quote, you can request an instant quotation on WhatsApp.',
      2
    );
    insertFaq.run(
      'Is there a minimum order quantity?',
      'No. There is no general minimum order quantity—you can order a single bag or pack, or combine multiple sizes and animal categories in one basket.',
      3
    );
    insertFaq.run(
      'Do you offer wholesale or bulk supply?',
      'Yes. Sam Kay Animal Feeds manufactures and supplies feeds for both retail pet owners and wholesale buyers. Wholesale discounts configured by our team are automatically applied in the Quantity summary when qualifying quantities are selected.',
      4
    );
    insertFaq.run(
      'Where can I pick up my order?',
      'Customer pickup is available at Tanke, Kwara State, Nigeria. Exact pickup directions and readiness timing are confirmed with you on WhatsApp after you send your order enquiry.',
      5
    );
    insertFaq.run(
      'Does opening WhatsApp confirm my order immediately?',
      'No. Opening WhatsApp prepares your pre-filled order message. You must send the message in WhatsApp, and our team will confirm final product availability, delivery charges (if applicable), and order confirmation.',
      6
    );
  }
}

export function getBusinessSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM business_settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
}

export function normalizeWhatsAppDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('2340') && digits.length === 14) {
    return '234' + digits.slice(4);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return '234' + digits.slice(1);
  }
  return digits;
}
