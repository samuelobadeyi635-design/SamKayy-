export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface BusinessSettings {
  business_name: string;
  business_location: string;
  business_tagline: string;
  whatsapp_number: string;
  whatsapp_digits: string;
  contact_phone: string;
  contact_email: string;
  pickup_address: string;
  pickup_hours: string;
  delivery_info: string;
  wholesale_note: string;
  currency_symbol: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  animal_type: string;
  description: string;
  sort_order: number;
  product_count?: number;
  cover_image?: string;
}

export interface ProductImageItem {
  id: number;
  imageUrl: string;
  altText: string;
  isPrimary: boolean;
}

export interface PackageSizeOption {
  sizeLabel: string;
  weightKg: number;
  stockStatus: StockStatus;
  visibleStockQuantity: number | null;
}

export interface NutritionalItem {
  id: number;
  nutrientName: string;
  nutrientValue: string;
}

export interface PublicProduct {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  animalType: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  ingredients?: string;
  feedingGuidance?: string;
  wholesaleEligible: boolean;
  featured: boolean;
  images: ProductImageItem[];
  packageSizes: PackageSizeOption[];
  nutritionalInfo?: NutritionalItem[];
}

export interface BasketItem {
  productId: number;
  productSlug: string;
  productName: string;
  categoryName: string;
  animalType: string;
  imageUrl: string;
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
  stockStatus: StockStatus;
  availableSizes: string[];
  hasConfiguredPrice: boolean;
  unitPrice: number | null;
  lineSubtotal: number | null;
  discountAmount: number;
  discountDescription: string | null;
  lineTotal: number | null;
  needsQuote: boolean;
}

export interface BasketEstimate {
  items: EstimatedLineItem[];
  calculableSubtotal: number;
  calculableDiscount: number;
  estimatedTotal: number;
  hasPricedItems: boolean;
  hasUnpricedItems: boolean;
  hasOutOfStockItems: boolean;
  currencySymbol: string;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
}
