-- Sam Kay Animal Feeds — PostgreSQL / Supabase Schema & Row Level Security (RLS)
-- Reference migration aligned with the Website Development Master Prompt.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  animal_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '',
  feeding_guidance TEXT NOT NULL DEFAULT '',
  wholesale_eligible BOOLEAN NOT NULL DEFAULT true,
  published BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);

CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS package_sizes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, size_label)
);

-- PRIVATE TABLE: Never readable directly by anonymous/public users
CREATE TABLE IF NOT EXISTS product_prices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL,
  price_ngn NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'NGN',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, size_label)
);

-- PRIVATE TABLE: Never readable directly by anonymous/public users
CREATE TABLE IF NOT EXISTS discount_rules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  size_label TEXT,
  min_quantity INTEGER NOT NULL DEFAULT 5,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL,
  stock_quantity INTEGER,
  stock_status TEXT NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock')),
  show_quantity_to_customers BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, size_label)
);

CREATE TABLE IF NOT EXISTS nutritional_info (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  nutrient_name TEXT NOT NULL,
  nutrient_value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faqs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_enquiries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  fulfilment_type TEXT NOT NULL CHECK (fulfilment_type IN ('pickup', 'delivery')),
  delivery_location TEXT NOT NULL DEFAULT '',
  customer_notes TEXT NOT NULL DEFAULT '',
  items_json JSONB NOT NULL,
  estimated_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  has_unpriced_items BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutritional_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_enquiries ENABLE ROW LEVEL SECURITY;

-- Helper function checking admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Public read access ONLY for published catalogue data
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read published products" ON products FOR SELECT USING (published = true OR is_admin());
CREATE POLICY "Public read product images" ON product_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM products WHERE id = product_images.product_id AND (published = true OR is_admin()))
);
CREATE POLICY "Public read enabled package sizes" ON package_sizes FOR SELECT USING (
  enabled = true OR is_admin()
);
CREATE POLICY "Public read inventory status" ON inventory FOR SELECT USING (true);
CREATE POLICY "Public read nutritional info" ON nutritional_info FOR SELECT USING (
  EXISTS (SELECT 1 FROM products WHERE id = nutritional_info.product_id AND (published = true OR is_admin()))
);
CREATE POLICY "Public read published faqs" ON faqs FOR SELECT USING (published = true OR is_admin());
CREATE POLICY "Public read business settings" ON business_settings FOR SELECT USING (true);

-- Strict private tables: Admin only (public pricing calculations run via server-side service role)
CREATE POLICY "Admin only product prices" ON product_prices FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin only discount rules" ON discount_rules FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin only order enquiries read" ON order_enquiries FOR SELECT USING (is_admin());
CREATE POLICY "Public insert order enquiries" ON order_enquiries FOR INSERT WITH CHECK (true);

-- Admin write policies for catalogue tables
CREATE POLICY "Admin write categories" ON categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write products" ON products FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write product images" ON product_images FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write package sizes" ON package_sizes FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write inventory" ON inventory FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write nutritional info" ON nutritional_info FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write faqs" ON faqs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin write business settings" ON business_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
