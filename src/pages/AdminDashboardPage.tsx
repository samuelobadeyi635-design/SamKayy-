import {
  BarChart3,
  Boxes,
  DollarSign,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Package,
  Percent,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BRAND_LOGO_URL } from '../components/Navbar';
import { ProductImage } from '../components/ProductImage';
import { setPageSeo, useRouter } from '../context/RouterContext';
import type { AdminUser } from '../types';

const ALL_SIZES = ['1kg', '2kg', '5kg', '10kg', '20kg', '25kg'];

type AdminSection =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'pricing'
  | 'discounts'
  | 'inventory'
  | 'settings'
  | 'analytics';

interface AdminProductRow {
  id: number;
  category_id: number;
  category_name: string;
  animal_type: string;
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  ingredients: string;
  feeding_guidance: string;
  wholesale_eligible: number;
  published: number;
  featured: number;
  images: Array<{ id: number; image_url: string; alt_text: string }>;
  packageSizes: Array<{ size_label: string; enabled: number }>;
  nutritionalInfo: Array<{ id: number; nutrient_name: string; nutrient_value: string }>;
}

interface PricingRow {
  product_id: number;
  product_name: string;
  category_name: string;
  size_label: string;
  enabled: number;
  price_ngn: number | null;
}

interface InventoryRow {
  product_id: number;
  product_name: string;
  category_name: string;
  size_label: string;
  enabled: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  stock_quantity: number | null;
  show_quantity_to_customers: number;
}

interface DiscountRuleRow {
  id: number;
  name: string;
  product_id: number | null;
  product_name?: string | null;
  size_label: string | null;
  min_quantity: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  active: number;
}

interface EnquiryRow {
  id: number;
  customer_name: string;
  customer_phone: string;
  fulfilment_type: string;
  delivery_location: string;
  customer_notes: string;
  items_json: string;
  estimated_subtotal: number;
  estimated_discount: number;
  estimated_total: number;
  has_unpriced_items: number;
  created_at: string;
}

export function AdminDashboardPage({
  section,
  adminUser,
  onLogout,
  onSettingsUpdated,
}: {
  section: AdminSection;
  adminUser: AdminUser | null;
  onLogout: () => void;
  onSettingsUpdated: () => void;
}) {
  const { navigate } = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(!adminUser);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(adminUser);
  const [toast, setToast] = useState<string | null>(null);

  // Overview state
  const [overview, setOverview] = useState<{
    totalProducts: number;
    publishedProducts: number;
    configuredPrices: number;
    totalEnabledSizes: number;
    activeDiscounts: number;
    outOfStockCount: number;
    totalEnquiries: number;
    recentEnquiries: EnquiryRow[];
  } | null>(null);

  // Products state
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string; animal_type: string; description: string; sort_order: number }>>([]);
  const [editingProduct, setEditingProduct] = useState<{
    id?: number;
    name: string;
    categoryId: number;
    shortDescription: string;
    fullDescription: string;
    ingredients: string;
    feedingGuidance: string;
    wholesaleEligible: boolean;
    published: boolean;
    featured: boolean;
    imageUrl: string;
    altText: string;
    enabledSizes: string[];
    nutritionalInfo: Array<{ nutrientName: string; nutrientValue: string }>;
  } | null>(null);

  // Pricing state
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([]);
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});

  // Discounts state
  const [discounts, setDiscounts] = useState<DiscountRuleRow[]>([]);
  const [newDiscount, setNewDiscount] = useState({
    name: '',
    productId: '',
    sizeLabel: '',
    minQuantity: '5',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '5',
  });

  // Inventory state
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [inventoryEdits, setInventoryEdits] = useState<
    Record<string, { stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'; stockQuantity: string; showQuantityToCustomers: boolean }>
  >({});

  // Settings & FAQs
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [faqs, setFaqs] = useState<Array<{ id: number; question: string; answer: string; sort_order: number; published: number }>>([]);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  // Enquiries
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setPageSeo(`Admin — ${section} | Sam Kay Animal Feeds`, 'Administrator dashboard for Sam Kay Animal Feeds.');
  }, [section]);

  useEffect(() => {
    if (adminUser) {
      setCurrentUser(adminUser);
      setCheckingAuth(false);
      return;
    }
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.admin) {
          navigate('/admin/login');
        } else {
          setCurrentUser(data.admin);
        }
      })
      .catch(() => navigate('/admin/login'))
      .finally(() => setCheckingAuth(false));
  }, [adminUser, navigate]);

  const loadSectionData = useCallback(async () => {
    if (!currentUser) return;
    if (section === 'dashboard') {
      const r = await fetch('/api/admin/overview');
      if (r.ok) setOverview(await r.json());
    } else if (section === 'products') {
      const [pr, cr] = await Promise.all([fetch('/api/admin/products'), fetch('/api/admin/categories')]);
      if (pr.ok) setProducts(await pr.json());
      if (cr.ok) setCategories(await cr.json());
    } else if (section === 'categories') {
      const cr = await fetch('/api/admin/categories');
      if (cr.ok) setCategories(await cr.json());
    } else if (section === 'pricing') {
      const r = await fetch('/api/admin/pricing');
      if (r.ok) {
        const rows: PricingRow[] = await r.json();
        setPricingRows(rows);
        const edits: Record<string, string> = {};
        rows.forEach((row) => {
          edits[`${row.product_id}:${row.size_label}`] =
            row.price_ngn !== null && row.price_ngn !== undefined ? String(row.price_ngn) : '';
        });
        setPriceEdits(edits);
      }
    } else if (section === 'discounts') {
      const [dr, pr] = await Promise.all([fetch('/api/admin/discounts'), fetch('/api/admin/products')]);
      if (dr.ok) setDiscounts(await dr.json());
      if (pr.ok) setProducts(await pr.json());
    } else if (section === 'inventory') {
      const r = await fetch('/api/admin/inventory');
      if (r.ok) {
        const rows: InventoryRow[] = await r.json();
        setInventoryRows(rows);
        const edits: Record<string, { stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'; stockQuantity: string; showQuantityToCustomers: boolean }> = {};
        rows.forEach((row) => {
          edits[`${row.product_id}:${row.size_label}`] = {
            stockStatus: row.stock_status,
            stockQuantity: row.stock_quantity !== null && row.stock_quantity !== undefined ? String(row.stock_quantity) : '',
            showQuantityToCustomers: row.show_quantity_to_customers === 1,
          };
        });
        setInventoryEdits(edits);
      }
    } else if (section === 'settings') {
      const [sr, fr] = await Promise.all([fetch('/api/admin/settings'), fetch('/api/admin/faqs')]);
      if (sr.ok) setSettingsForm(await sr.json());
      if (fr.ok) setFaqs(await fr.json());
    } else if (section === 'analytics') {
      const r = await fetch('/api/admin/enquiries');
      if (r.ok) setEnquiries(await r.json());
    }
  }, [currentUser, section]);

  useEffect(() => {
    loadSectionData();
  }, [loadSectionData]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    onLogout();
    navigate('/admin/login');
  };

  if (checkingAuth || !currentUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-[#525b56]">
        Verifying administrator session…
      </div>
    );
  }

  const navItems: Array<{ id: AdminSection; label: string; path: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', path: '/admin/products', icon: Package },
    { id: 'categories', label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { id: 'pricing', label: 'Private Pricing', path: '/admin/pricing', icon: DollarSign },
    { id: 'discounts', label: 'Wholesale Discounts', path: '/admin/discounts', icon: Percent },
    { id: 'inventory', label: 'Inventory', path: '/admin/inventory', icon: Boxes },
    { id: 'settings', label: 'Settings & FAQs', path: '/admin/settings', icon: Settings },
    { id: 'analytics', label: 'Order Enquiries', path: '/admin/analytics', icon: BarChart3 },
  ];

  // Handlers
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, filename: file.name.replace(/\.[^/.]+$/, '') }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditingProduct({ ...editingProduct, imageUrl: data.imageUrl });
        showNotice('Image uploaded.');
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const url = editingProduct.id ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
    const method = editingProduct.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingProduct),
    });
    if (res.ok) {
      setEditingProduct(null);
      await loadSectionData();
      showNotice('Product saved.');
    } else {
      const err = await res.json();
      showNotice(err.error || 'Could not save product.');
    }
  };

  const togglePublish = async (p: AdminProductRow) => {
    await fetch(`/api/admin/products/${p.id}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: p.published !== 1 }),
    });
    await loadSectionData();
    showNotice(p.published === 1 ? 'Product unpublished.' : 'Product published.');
  };

  const deleteProduct = async (id: number) => {
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    await loadSectionData();
    showNotice('Product deleted.');
  };

  const savePricing = async () => {
    const updates = pricingRows.map((row) => {
      const raw = priceEdits[`${row.product_id}:${row.size_label}`] ?? '';
      return {
        productId: row.product_id,
        sizeLabel: row.size_label,
        priceNgn: raw.trim() === '' ? null : Number(raw),
      };
    });
    const res = await fetch('/api/admin/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    if (res.ok) {
      await loadSectionData();
      showNotice('Private pricing updated.');
    }
  };

  const createDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newDiscount.name,
        productId: newDiscount.productId ? Number(newDiscount.productId) : null,
        sizeLabel: newDiscount.sizeLabel || null,
        minQuantity: Number(newDiscount.minQuantity),
        discountType: newDiscount.discountType,
        discountValue: Number(newDiscount.discountValue),
        active: true,
      }),
    });
    if (res.ok) {
      setNewDiscount({ name: '', productId: '', sizeLabel: '', minQuantity: '5', discountType: 'percentage', discountValue: '5' });
      await loadSectionData();
      showNotice('Wholesale discount rule created.');
    }
  };

  const toggleDiscountActive = async (rule: DiscountRuleRow) => {
    await fetch(`/api/admin/discounts/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: rule.name,
        productId: rule.product_id,
        sizeLabel: rule.size_label,
        minQuantity: rule.min_quantity,
        discountType: rule.discount_type,
        discountValue: rule.discount_value,
        active: rule.active !== 1,
      }),
    });
    await loadSectionData();
  };

  const deleteDiscount = async (id: number) => {
    await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' });
    await loadSectionData();
    showNotice('Discount rule deleted.');
  };

  const saveInventory = async () => {
    const updates = inventoryRows.map((row) => {
      const edit = inventoryEdits[`${row.product_id}:${row.size_label}`];
      return {
        productId: row.product_id,
        sizeLabel: row.size_label,
        stockStatus: edit?.stockStatus || 'in_stock',
        stockQuantity: edit?.stockQuantity.trim() ? Number(edit.stockQuantity) : null,
        showQuantityToCustomers: Boolean(edit?.showQuantityToCustomers),
      };
    });
    const res = await fetch('/api/admin/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    if (res.ok) {
      await loadSectionData();
      showNotice('Inventory updated.');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm),
    });
    if (res.ok) {
      onSettingsUpdated();
      showNotice('Business settings updated.');
    }
  };

  const addFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/faqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFaq),
    });
    if (res.ok) {
      setNewFaq({ question: '', answer: '' });
      await loadSectionData();
      showNotice('FAQ added.');
    }
  };

  const deleteFaq = async (id: number) => {
    await fetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
    await loadSectionData();
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordForm),
    });
    const data = await res.json();
    if (res.ok) {
      setPasswordForm({ currentPassword: '', newPassword: '' });
      showNotice('Administrator password updated.');
    } else {
      showNotice(data.error || 'Could not update password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#e5e3da] shrink-0 flex flex-col justify-between">
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_LOGO_URL}
              alt="Sam Kay Animal Feeds"
              className="w-9 h-9 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-[#18221d] truncate">Sam Kay Admin</p>
              <p className="text-xs text-[#525b56] truncate">{currentUser.email}</p>
            </div>
          </div>

          <nav aria-label="Admin navigation" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-left transition-colors min-h-[40px] ${
                    active ? 'bg-[#0f6b5e] text-white' : 'text-[#525b56] hover:bg-[#f2f1ec] hover:text-[#18221d]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#e5e3da] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-[#0f6b5e] hover:underline"
          >
            View Storefront
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#525b56] hover:text-[#dc2626]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-[#e5e3da] px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-sm text-[#525b56]">
            <span>Admin</span>
            <span className="mx-2">/</span>
            <span className="font-semibold text-[#18221d] capitalize">{section}</span>
          </div>
          {toast && (
            <span role="status" className="text-xs font-semibold text-[#0f6b5e]">
              {toast}
            </span>
          )}
        </header>

        <div className="p-6 max-w-6xl space-y-6">
          {/* 1. DASHBOARD */}
          {section === 'dashboard' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#e5e3da] rounded-xl p-5 space-y-1">
                  <p className="text-xs text-[#525b56]">Published Feeds</p>
                  <p className="font-mono text-2xl font-bold text-[#18221d] tabular-nums">
                    {overview.publishedProducts} / {overview.totalProducts}
                  </p>
                </div>
                <div className="bg-white border border-[#e5e3da] rounded-xl p-5 space-y-1">
                  <p className="text-xs text-[#525b56]">Configured Package Prices</p>
                  <p className="font-mono text-2xl font-bold text-[#18221d] tabular-nums">
                    {overview.configuredPrices} / {overview.totalEnabledSizes}
                  </p>
                </div>
                <div className="bg-white border border-[#e5e3da] rounded-xl p-5 space-y-1">
                  <p className="text-xs text-[#525b56]">Active Wholesale Rules</p>
                  <p className="font-mono text-2xl font-bold text-[#18221d] tabular-nums">
                    {overview.activeDiscounts}
                  </p>
                </div>
                <div className="bg-white border border-[#e5e3da] rounded-xl p-5 space-y-1">
                  <p className="text-xs text-[#525b56]">WhatsApp Enquiries Logged</p>
                  <p className="font-mono text-2xl font-bold text-[#18221d] tabular-nums">
                    {overview.totalEnquiries}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#e5e3da] rounded-xl p-6 space-y-3">
                <h2 className="font-display text-lg font-bold text-[#18221d]">Owner Pre-Launch Checklist</h2>
                <ul className="text-sm text-[#525b56] space-y-2 list-disc pl-5">
                  <li>Confirm active WhatsApp number, Tanke pickup address, and operating hours under <strong>Settings &amp; FAQs</strong>.</li>
                  <li>Verify enabled package sizes (1kg–25kg) for each feed under <strong>Products</strong>.</li>
                  <li>Set private NGN prices per product and package size under <strong>Private Pricing</strong> (unpriced items display “Request a quotation on WhatsApp”).</li>
                  <li>Configure wholesale quantity thresholds and discounts under <strong>Wholesale Discounts</strong>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS */}
          {section === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-[#18221d]">Feed Products</h1>
                <button
                  type="button"
                  onClick={() =>
                    setEditingProduct({
                      name: '',
                      categoryId: categories[0]?.id || 1,
                      shortDescription: '',
                      fullDescription: '',
                      ingredients: '',
                      feedingGuidance: '',
                      wholesaleEligible: true,
                      published: true,
                      featured: false,
                      imageUrl: '',
                      altText: '',
                      enabledSizes: ['1kg', '2kg', '5kg'],
                      nutritionalInfo: [],
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              {editingProduct && (
                <form onSubmit={saveProduct} className="bg-white border border-[#e5e3da] rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-[#e5e3da] pb-3">
                    <h2 className="font-display text-lg font-bold text-[#18221d]">
                      {editingProduct.id ? `Edit: ${editingProduct.name}` : 'New Feed Product'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="text-xs font-semibold text-[#525b56] hover:text-[#18221d]"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#18221d] mb-1">Product Name</label>
                      <input
                        type="text"
                        required
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#18221d] mb-1">Animal Category</label>
                      <select
                        value={editingProduct.categoryId}
                        onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#18221d] mb-1">Short Description</label>
                      <input
                        type="text"
                        value={editingProduct.shortDescription}
                        onChange={(e) => setEditingProduct({ ...editingProduct, shortDescription: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#18221d] mb-1">Full Description</label>
                      <textarea
                        rows={3}
                        value={editingProduct.fullDescription}
                        onChange={(e) => setEditingProduct({ ...editingProduct, fullDescription: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#18221d] mb-1">
                        Verified Ingredients (Only enter owner-confirmed details)
                      </label>
                      <textarea
                        rows={2}
                        value={editingProduct.ingredients}
                        onChange={(e) => setEditingProduct({ ...editingProduct, ingredients: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#18221d] mb-1">
                        Verified Feeding Guidance
                      </label>
                      <textarea
                        rows={2}
                        value={editingProduct.feedingGuidance}
                        onChange={(e) => setEditingProduct({ ...editingProduct, feedingGuidance: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#18221d] mb-1">Product Image URL or Upload</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingProduct.imageUrl}
                          onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                          placeholder="/assets/products/..."
                          className="flex-1 px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                        />
                        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f2f1ec] border border-[#d6d3c7] text-xs font-semibold cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload</span>
                          <input type="file" accept="image/*" onChange={handleImageFileSelect} className="hidden" />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#18221d] mb-1">Image Alt Text</label>
                      <input
                        type="text"
                        value={editingProduct.altText}
                        onChange={(e) => setEditingProduct({ ...editingProduct, altText: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-[#18221d] mb-2">
                      Enabled Package Sizes (Configured independently per product)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {ALL_SIZES.map((sz) => {
                        const checked = editingProduct.enabledSizes.includes(sz);
                        return (
                          <label
                            key={sz}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono cursor-pointer ${
                              checked ? 'bg-[#0f6b5e] text-white border-[#0f6b5e]' : 'bg-white border-[#d6d3c7]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...editingProduct.enabledSizes, sz]
                                  : editingProduct.enabledSizes.filter((s) => s !== sz);
                                setEditingProduct({ ...editingProduct, enabledSizes: next });
                              }}
                              className="sr-only"
                            />
                            <span>{sz}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 text-xs font-medium text-[#18221d]">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProduct.published}
                        onChange={(e) => setEditingProduct({ ...editingProduct, published: e.target.checked })}
                      />
                      <span>Published on storefront</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProduct.wholesaleEligible}
                        onChange={(e) => setEditingProduct({ ...editingProduct, wholesaleEligible: e.target.checked })}
                      />
                      <span>Eligible for wholesale discounts</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold min-h-[42px]"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Product</span>
                  </button>
                </form>
              )}

              <div className="bg-white border border-[#e5e3da] rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f2f1ec] text-xs font-semibold text-[#525b56] border-b border-[#e5e3da]">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Enabled Sizes</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e3da]">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-[#fafaf8]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 aspect-[3/2] rounded bg-[#f7f6f2] overflow-hidden border border-[#e5e3da] shrink-0">
                              <ProductImage src={p.images[0]?.image_url} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-semibold text-[#18221d]">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#525b56]">{p.category_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#18221d]">
                          {p.packageSizes.filter((s) => s.enabled === 1).map((s) => s.size_label).join(', ')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => togglePublish(p)}
                            className={`text-xs font-semibold ${
                              p.published === 1 ? 'text-[#15803d]' : 'text-[#525b56]'
                            }`}
                          >
                            {p.published === 1 ? 'Published' : 'Unpublished'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingProduct({
                                id: p.id,
                                name: p.name,
                                categoryId: p.category_id,
                                shortDescription: p.short_description,
                                fullDescription: p.full_description,
                                ingredients: p.ingredients || '',
                                feedingGuidance: p.feeding_guidance || '',
                                wholesaleEligible: p.wholesale_eligible === 1,
                                published: p.published === 1,
                                featured: p.featured === 1,
                                imageUrl: p.images[0]?.image_url || '',
                                altText: p.images[0]?.alt_text || p.name,
                                enabledSizes: p.packageSizes.filter((s) => s.enabled === 1).map((s) => s.size_label),
                                nutritionalInfo: p.nutritionalInfo.map((n) => ({
                                  nutrientName: n.nutrient_name,
                                  nutrientValue: n.nutrient_value,
                                })),
                              })
                            }
                            className="text-xs font-semibold text-[#0f6b5e] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(p.id)}
                            className="text-xs font-semibold text-[#dc2626] hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. CATEGORIES */}
          {section === 'categories' && (
            <div className="space-y-4">
              <h1 className="font-display text-2xl font-bold text-[#18221d]">Animal Categories</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categories.map((c) => (
                  <div key={c.id} className="bg-white border border-[#e5e3da] rounded-xl p-5 space-y-3">
                    <p className="text-xs text-[#525b56]">Animal: {c.animal_type}</p>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) =>
                        setCategories(categories.map((cat) => (cat.id === c.id ? { ...cat, name: e.target.value } : cat)))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm font-semibold"
                    />
                    <textarea
                      rows={3}
                      value={c.description}
                      onChange={(e) =>
                        setCategories(
                          categories.map((cat) => (cat.id === c.id ? { ...cat, description: e.target.value } : cat))
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-xs"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/categories/${c.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(c),
                        });
                        showNotice(`${c.name} updated.`);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#0f6b5e] text-white text-xs font-semibold"
                    >
                      Save Category
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. PRIVATE PRICING */}
          {section === 'pricing' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#18221d]">Private Package Pricing (₦)</h1>
                  <p className="text-xs text-[#525b56]">
                    Individual prices are hidden on public catalogue pages and used server-side for Quantity basket estimates. Leave blank for “Request a quotation on WhatsApp”.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={savePricing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold shrink-0 min-h-[42px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Save All Prices</span>
                </button>
              </div>

              <div className="bg-white border border-[#e5e3da] rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f2f1ec] text-xs font-semibold text-[#525b56] border-b border-[#e5e3da]">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Storefront Status</th>
                      <th className="px-4 py-3 text-right">Unit Price (₦ NGN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e3da]">
                    {pricingRows
                      .filter((r) => r.enabled === 1)
                      .map((row) => {
                        const key = `${row.product_id}:${row.size_label}`;
                        return (
                          <tr key={key}>
                            <td className="px-4 py-2.5 font-medium text-[#18221d]">{row.product_name}</td>
                            <td className="px-4 py-2.5 text-[#525b56]">{row.category_name}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{row.size_label}</td>
                            <td className="px-4 py-2.5 text-xs text-[#525b56]">
                              {priceEdits[key]?.trim() ? 'Priced in Basket' : 'WhatsApp Quotation'}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="Unset"
                                value={priceEdits[key] ?? ''}
                                onChange={(e) => setPriceEdits({ ...priceEdits, [key]: e.target.value })}
                                className="w-36 px-3 py-1.5 rounded-lg border border-[#d6d3c7] text-right font-mono text-sm tabular-nums"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. WHOLESALE DISCOUNTS */}
          {section === 'discounts' && (
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-bold text-[#18221d]">Wholesale Discount Rules</h1>

              <form onSubmit={createDiscount} className="bg-white border border-[#e5e3da] rounded-xl p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#18221d] mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={newDiscount.name}
                    onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                    placeholder="e.g. Bulk 10+ Bags Discount"
                    className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#18221d] mb-1">Product Scope</label>
                  <select
                    value={newDiscount.productId}
                    onChange={(e) => setNewDiscount({ ...newDiscount, productId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                  >
                    <option value="">All Eligible Products</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#18221d] mb-1">Min Qty</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newDiscount.minQuantity}
                    onChange={(e) => setNewDiscount({ ...newDiscount, minQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] font-mono text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#18221d] mb-1">Type &amp; Value</label>
                  <div className="flex gap-1">
                    <select
                      value={newDiscount.discountType}
                      onChange={(e) =>
                        setNewDiscount({ ...newDiscount, discountType: e.target.value as 'percentage' | 'fixed' })
                      }
                      className="px-2 py-2 rounded-lg border border-[#d6d3c7] text-xs"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">₦/unit</option>
                    </select>
                    <input
                      type="number"
                      min={0.1}
                      step="any"
                      required
                      value={newDiscount.discountValue}
                      onChange={(e) => setNewDiscount({ ...newDiscount, discountValue: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-lg border border-[#d6d3c7] font-mono text-sm tabular-nums"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold min-h-[40px]"
                >
                  Add Rule
                </button>
              </form>

              <div className="bg-white border border-[#e5e3da] rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f2f1ec] text-xs font-semibold text-[#525b56] border-b border-[#e5e3da]">
                    <tr>
                      <th className="px-4 py-3">Rule</th>
                      <th className="px-4 py-3">Scope</th>
                      <th className="px-4 py-3">Min Qty</th>
                      <th className="px-4 py-3">Discount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e3da]">
                    {discounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#525b56]">
                          No wholesale discount rules configured yet.
                        </td>
                      </tr>
                    ) : (
                      discounts.map((d) => (
                        <tr key={d.id}>
                          <td className="px-4 py-3 font-medium text-[#18221d]">{d.name}</td>
                          <td className="px-4 py-3 text-xs text-[#525b56]">{d.product_name || 'All Eligible Products'}</td>
                          <td className="px-4 py-3 font-mono text-xs tabular-nums">{d.min_quantity}+</td>
                          <td className="px-4 py-3 font-mono text-xs tabular-nums">
                            {d.discount_type === 'percentage' ? `${d.discount_value}%` : `₦${d.discount_value}/unit`}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggleDiscountActive(d)}
                              className={`text-xs font-semibold ${d.active === 1 ? 'text-[#15803d]' : 'text-[#525b56]'}`}
                            >
                              {d.active === 1 ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => deleteDiscount(d.id)}
                              className="text-xs font-semibold text-[#dc2626] hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. INVENTORY */}
          {section === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-[#18221d]">Inventory &amp; Stock Availability</h1>
                <button
                  type="button"
                  onClick={saveInventory}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold min-h-[42px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Inventory</span>
                </button>
              </div>

              <div className="bg-white border border-[#e5e3da] rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f2f1ec] text-xs font-semibold text-[#525b56] border-b border-[#e5e3da]">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Availability Status</th>
                      <th className="px-4 py-3">Stock Qty (Optional)</th>
                      <th className="px-4 py-3">Show Qty Publicly</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e3da]">
                    {inventoryRows
                      .filter((r) => r.enabled === 1)
                      .map((row) => {
                        const key = `${row.product_id}:${row.size_label}`;
                        const edit = inventoryEdits[key] || {
                          stockStatus: 'in_stock',
                          stockQuantity: '',
                          showQuantityToCustomers: false,
                        };
                        return (
                          <tr key={key}>
                            <td className="px-4 py-2.5 font-medium text-[#18221d]">{row.product_name}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{row.size_label}</td>
                            <td className="px-4 py-2.5">
                              <select
                                value={edit.stockStatus}
                                onChange={(e) =>
                                  setInventoryEdits({
                                    ...inventoryEdits,
                                    [key]: {
                                      ...edit,
                                      stockStatus: e.target.value as 'in_stock' | 'low_stock' | 'out_of_stock',
                                    },
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-[#d6d3c7] text-xs font-medium"
                              >
                                <option value="in_stock">In Stock</option>
                                <option value="low_stock">Low Stock</option>
                                <option value="out_of_stock">Out of Stock</option>
                              </select>
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="number"
                                min={0}
                                placeholder="—"
                                value={edit.stockQuantity}
                                onChange={(e) =>
                                  setInventoryEdits({
                                    ...inventoryEdits,
                                    [key]: { ...edit, stockQuantity: e.target.value },
                                  })
                                }
                                className="w-24 px-2.5 py-1.5 rounded-lg border border-[#d6d3c7] font-mono text-xs tabular-nums"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="checkbox"
                                checked={edit.showQuantityToCustomers}
                                onChange={(e) =>
                                  setInventoryEdits({
                                    ...inventoryEdits,
                                    [key]: { ...edit, showQuantityToCustomers: e.target.checked },
                                  })
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. SETTINGS & FAQS */}
          {section === 'settings' && (
            <div className="space-y-8">
              <form onSubmit={saveSettings} className="bg-white border border-[#e5e3da] rounded-xl p-6 space-y-4">
                <h1 className="font-display text-2xl font-bold text-[#18221d]">Business Settings</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['business_name', 'Business Name'],
                    ['business_location', 'Business Location'],
                    ['whatsapp_number', 'WhatsApp Number'],
                    ['contact_phone', 'Contact Phone'],
                    ['contact_email', 'Contact Email'],
                    ['pickup_hours', 'Tanke Pickup Hours'],
                  ].map(([k, label]) => (
                    <div key={k}>
                      <label className="block text-xs font-semibold text-[#18221d] mb-1">{label}</label>
                      <input
                        type="text"
                        value={settingsForm[k] || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, [k]: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                      />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#18221d] mb-1">Tanke Pickup Address / Directions</label>
                    <textarea
                      rows={2}
                      value={settingsForm.pickup_address || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, pickup_address: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#18221d] mb-1">Delivery Information</label>
                    <textarea
                      rows={2}
                      value={settingsForm.delivery_info || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, delivery_info: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Business Settings</span>
                </button>
              </form>

              <div className="bg-white border border-[#e5e3da] rounded-xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#18221d]">Manage FAQs</h2>
                <form onSubmit={addFaq} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="FAQ Question"
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                  />
                  <textarea
                    rows={2}
                    required
                    placeholder="FAQ Answer"
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                  />
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#0f6b5e] text-white text-xs font-semibold">
                    Add FAQ
                  </button>
                </form>
                <div className="divide-y divide-[#e5e3da]">
                  {faqs.map((f) => (
                    <div key={f.id} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#18221d]">{f.question}</p>
                        <p className="text-xs text-[#525b56] mt-1">{f.answer}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteFaq(f.id)}
                        className="text-xs text-[#dc2626] hover:underline shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={changePassword} className="bg-white border border-[#e5e3da] rounded-xl p-6 space-y-4 max-w-md">
                <h2 className="font-display text-lg font-bold text-[#18221d]">Change Administrator Password</h2>
                <input
                  type="password"
                  required
                  placeholder="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="New Password (8+ characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#d6d3c7] text-sm"
                />
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#18221d] text-white text-xs font-semibold">
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* 8. ANALYTICS / ORDER ENQUIRIES */}
          {section === 'analytics' && (
            <div className="space-y-4">
              <h1 className="font-display text-2xl font-bold text-[#18221d]">WhatsApp Order Enquiries</h1>
              <div className="bg-white border border-[#e5e3da] rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f2f1ec] text-xs font-semibold text-[#525b56] border-b border-[#e5e3da]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Fulfilment</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3 text-right">Est. Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e3da]">
                    {enquiries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#525b56]">
                          No WhatsApp order enquiries have been logged yet.
                        </td>
                      </tr>
                    ) : (
                      enquiries.map((enq) => {
                        let parsedItems: Array<{ productName: string; sizeLabel: string; quantity: number }> = [];
                        try {
                          parsedItems = JSON.parse(enq.items_json);
                        } catch {
                          parsedItems = [];
                        }
                        return (
                          <tr key={enq.id}>
                            <td className="px-4 py-3 font-mono text-xs text-[#525b56] whitespace-nowrap">
                              {enq.created_at.slice(0, 16)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#18221d]">{enq.customer_name}</p>
                              <p className="font-mono text-xs text-[#525b56]">{enq.customer_phone}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#525b56]">
                              {enq.fulfilment_type === 'pickup' ? 'Tanke Pickup' : `Delivery: ${enq.delivery_location}`}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#18221d]">
                              {parsedItems.map((i, idx) => (
                                <div key={idx}>
                                  {i.productName} ({i.sizeLabel} × {i.quantity})
                                </div>
                              ))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                              {enq.estimated_total > 0 ? `₦${enq.estimated_total.toLocaleString()}` : 'Quote'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
