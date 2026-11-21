import { db } from './db.ts';

export interface BasketItemInput {
  productId: number;
  sizeLabel: string;
  quantity: number;
}

export interface EstimatedLineItem {
  productId: number;
  productName: string;
  productSlug: string;
  categoryName: string;
  animalType: string;
  imageUrl: string;
  sizeLabel: string;
  quantity: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  availableSizes: string[];
  hasConfiguredPrice: boolean;
  unitPrice: number | null;
  lineSubtotal: number | null;
  discountAmount: number;
  discountDescription: string | null;
  lineTotal: number | null;
  needsQuote: boolean;
}

export interface BasketEstimateResult {
  items: EstimatedLineItem[];
  calculableSubtotal: number;
  calculableDiscount: number;
  estimatedTotal: number;
  hasPricedItems: boolean;
  hasUnpricedItems: boolean;
  hasOutOfStockItems: boolean;
  currencySymbol: string;
}

interface DiscountRuleRow {
  id: number;
  name: string;
  product_id: number | null;
  size_label: string | null;
  min_quantity: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export function calculateBasketEstimate(rawItems: BasketItemInput[]): BasketEstimateResult {
  const currencyRow = db
    .prepare("SELECT value FROM business_settings WHERE key = 'currency_symbol'")
    .get() as { value: string } | undefined;
  const currencySymbol = currencyRow?.value || '₦';

  const activeDiscounts = db
    .prepare('SELECT id, name, product_id, size_label, min_quantity, discount_type, discount_value FROM discount_rules WHERE active = 1')
    .all() as DiscountRuleRow[];

  const estimatedItems: EstimatedLineItem[] = [];
  let calculableSubtotal = 0;
  let calculableDiscount = 0;
  let hasPricedItems = false;
  let hasUnpricedItems = false;
  let hasOutOfStockItems = false;

  for (const item of rawItems) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    const sizeLabel = String(item.sizeLabel || '').trim();

    if (!Number.isInteger(productId) || productId <= 0) continue;
    if (!Number.isInteger(quantity) || quantity <= 0) continue;

    const product = db
      .prepare(`
        SELECT p.id, p.name, p.slug, p.wholesale_eligible, c.name AS category_name, c.animal_type,
               COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1), '') AS image_url
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.id = ? AND p.published = 1
      `)
      .get(productId) as {
        id: number;
        name: string;
        slug: string;
        wholesale_eligible: number;
        category_name: string;
        animal_type: string;
        image_url: string;
      } | undefined;

    if (!product) continue;

    const enabledSizeRows = db
      .prepare('SELECT size_label FROM package_sizes WHERE product_id = ? AND enabled = 1 ORDER BY sort_order ASC')
      .all(productId) as Array<{ size_label: string }>;
    const availableSizes = enabledSizeRows.map((s) => s.size_label);

    if (!availableSizes.includes(sizeLabel)) continue;

    const invRow = db
      .prepare('SELECT stock_status FROM inventory WHERE product_id = ? AND size_label = ?')
      .get(productId, sizeLabel) as { stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' } | undefined;
    const stockStatus = invRow?.stock_status || 'in_stock';
    if (stockStatus === 'out_of_stock') {
      hasOutOfStockItems = true;
    }

    const priceRow = db
      .prepare('SELECT price_ngn FROM product_prices WHERE product_id = ? AND size_label = ?')
      .get(productId, sizeLabel) as { price_ngn: number | null } | undefined;

    const unitPrice = priceRow && priceRow.price_ngn !== null && Number.isFinite(priceRow.price_ngn) && priceRow.price_ngn > 0
      ? Number(priceRow.price_ngn)
      : null;

    if (unitPrice === null) {
      hasUnpricedItems = true;
      estimatedItems.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        categoryName: product.category_name,
        animalType: product.animal_type,
        imageUrl: product.image_url,
        sizeLabel,
        quantity,
        stockStatus,
        availableSizes,
        hasConfiguredPrice: false,
        unitPrice: null,
        lineSubtotal: null,
        discountAmount: 0,
        discountDescription: null,
        lineTotal: null,
        needsQuote: true,
      });
      continue;
    }

    hasPricedItems = true;
    const lineSubtotal = Math.round(unitPrice * quantity * 100) / 100;

    let bestDiscount = 0;
    let bestRuleName: string | null = null;

    if (product.wholesale_eligible === 1) {
      for (const rule of activeDiscounts) {
        if (rule.product_id !== null && rule.product_id !== product.id) continue;
        if (rule.size_label !== null && rule.size_label !== '' && rule.size_label !== sizeLabel) continue;
        if (quantity < rule.min_quantity) continue;

        let candidateDiscount = 0;
        if (rule.discount_type === 'percentage') {
          candidateDiscount = Math.round(lineSubtotal * (rule.discount_value / 100) * 100) / 100;
        } else {
          // Fixed discount applied per unit for qualifying wholesale orders
          candidateDiscount = Math.min(lineSubtotal, Math.round(rule.discount_value * quantity * 100) / 100);
        }

        if (candidateDiscount > bestDiscount) {
          bestDiscount = candidateDiscount;
          bestRuleName =
            rule.discount_type === 'percentage'
              ? `${rule.name} (${rule.discount_value}% off for ${rule.min_quantity}+)`
              : `${rule.name} (${currencySymbol}${rule.discount_value.toLocaleString()} off/unit for ${rule.min_quantity}+)`;
        }
      }
    }

    const lineTotal = Math.max(0, Math.round((lineSubtotal - bestDiscount) * 100) / 100);
    calculableSubtotal += lineSubtotal;
    calculableDiscount += bestDiscount;

    estimatedItems.push({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      categoryName: product.category_name,
      animalType: product.animal_type,
      imageUrl: product.image_url,
      sizeLabel,
      quantity,
      stockStatus,
      availableSizes,
      hasConfiguredPrice: true,
      unitPrice,
      lineSubtotal,
      discountAmount: bestDiscount,
      discountDescription: bestRuleName,
      lineTotal,
      needsQuote: false,
    });
  }

  const estimatedTotal = Math.max(0, Math.round((calculableSubtotal - calculableDiscount) * 100) / 100);

  return {
    items: estimatedItems,
    calculableSubtotal: Math.round(calculableSubtotal * 100) / 100,
    calculableDiscount: Math.round(calculableDiscount * 100) / 100,
    estimatedTotal,
    hasPricedItems,
    hasUnpricedItems,
    hasOutOfStockItems,
    currencySymbol,
  };
}
