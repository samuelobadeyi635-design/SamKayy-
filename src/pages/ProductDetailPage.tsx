import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductImage } from '../components/ProductImage';
import { useCart } from '../context/CartContext';
import { setPageSeo, useRouter } from '../context/RouterContext';
import type { PublicProduct } from '../types';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate } = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: PublicProduct) => {
        setProduct(data);
        const firstAvailable =
          data.packageSizes.find((s) => s.stockStatus !== 'out_of_stock')?.sizeLabel ||
          data.packageSizes[0]?.sizeLabel ||
          '';
        setSelectedSize(firstAvailable);
        setPageSeo(
          `${data.name} | ${data.categoryName} | Sam Kay Animal Feeds`,
          data.shortDescription || `Select package size and quantity for ${data.name} from Sam Kay Animal Feeds.`
        );
      })
      .catch(() => {
        setNotFound(true);
        setPageSeo('Feed Not Found | Sam Kay Animal Feeds', 'The requested feed product could not be found.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
          <div className="lg:col-span-6 aspect-[3/2] bg-[#f2f1ec] rounded-2xl" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-4 bg-[#f2f1ec] rounded w-1/4" />
            <div className="h-8 bg-[#f2f1ec] rounded w-3/4" />
            <div className="h-20 bg-[#f2f1ec] rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#18221d]">Feed product not found</h1>
        <p className="text-sm text-[#525b56]">
          This feed may have been unpublished or moved. Return to our catalogue to browse available Rabbit, Dog, and Cat feeds.
        </p>
        <button
          type="button"
          onClick={() => navigate('/feeds')}
          className="px-5 py-3 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold min-h-[44px]"
        >
          Back to Feeds
        </button>
      </div>
    );
  }

  const activeSizeObj = product.packageSizes.find((s) => s.sizeLabel === selectedSize);
  const parsedQty = Math.floor(Number(quantityInput));
  const isValidQty = Number.isInteger(parsedQty) && parsedQty > 0;
  const isOutOfStock = activeSizeObj?.stockStatus === 'out_of_stock';
  const primaryImage = product.images[0];

  const stockLabel =
    activeSizeObj?.stockStatus === 'out_of_stock'
      ? 'Out of Stock'
      : activeSizeObj?.stockStatus === 'low_stock'
        ? 'Low Stock'
        : 'In Stock';

  const stockColorClass =
    activeSizeObj?.stockStatus === 'out_of_stock'
      ? 'text-[#dc2626]'
      : activeSizeObj?.stockStatus === 'low_stock'
        ? 'text-[#b45309]'
        : 'text-[#15803d]';

  const handleStep = (delta: number) => {
    const base = isValidQty ? parsedQty : 1;
    const next = Math.max(1, base + delta);
    setQuantityInput(String(next));
  };

  const handleAdd = () => {
    if (!selectedSize || !isValidQty || isOutOfStock) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      categoryName: product.categoryName,
      animalType: product.animalType,
      imageUrl: primaryImage?.imageUrl || '',
      sizeLabel: selectedSize,
      quantity: parsedQty,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2400);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-[#525b56]">
        <button
          type="button"
          onClick={() => navigate('/feeds')}
          className="inline-flex items-center gap-1.5 hover:text-[#0f6b5e] font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Feeds</span>
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          onClick={() => navigate(`/feeds?category=${encodeURIComponent(product.categorySlug)}`)}
          className="hover:text-[#0f6b5e]"
        >
          {product.categoryName}
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-[#18221d] font-medium truncate">{product.name}</span>
      </nav>

      {/* Contiguous Purchase / Selection Module (strictly NO individual price displayed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4">
          <div className="aspect-[3/2] bg-[#f7f6f2] border border-[#e5e3da] rounded-2xl overflow-hidden">
            <ProductImage
              src={primaryImage?.imageUrl}
              alt={primaryImage?.altText || product.name}
              title={product.name}
              eager
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-[#e5e3da] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2 border-b border-[#e5e3da] pb-5">
            <p className="text-xs font-medium text-[#525b56]">
              {product.categoryName} · {product.animalType}
              {product.wholesaleEligible ? ' · Wholesale Eligible' : ''}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#18221d] tracking-tight">
              {product.name}
            </h1>
            <p className="text-sm sm:text-base text-[#525b56] leading-relaxed">
              {product.fullDescription || product.shortDescription}
            </p>
          </div>

          {/* Package Size Selection (only sizes enabled for this product) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#18221d]">Package Size</span>
              {activeSizeObj && (
                <span className={`text-xs font-semibold ${stockColorClass}`}>
                  {stockLabel}
                  {activeSizeObj.visibleStockQuantity !== null
                    ? ` (${activeSizeObj.visibleStockQuantity} units)`
                    : ''}
                </span>
              )}
            </div>

            {product.packageSizes.length === 0 ? (
              <p className="text-sm text-[#525b56]">
                No package sizes are currently enabled for this product. Please contact us on WhatsApp.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {product.packageSizes.map((size) => {
                  const selected = size.sizeLabel === selectedSize;
                  const out = size.stockStatus === 'out_of_stock';
                  return (
                    <button
                      key={size.sizeLabel}
                      type="button"
                      onClick={() => setSelectedSize(size.sizeLabel)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-mono font-medium tabular-nums min-h-[44px] transition-colors ${
                        selected
                          ? 'bg-[#0f6b5e] text-white border-[#0f6b5e]'
                          : out
                            ? 'bg-[#f2f1ec] text-[#7c8580] border-[#e5e3da]'
                            : 'bg-white text-[#18221d] border-[#d6d3c7] hover:border-[#0f6b5e]'
                      }`}
                    >
                      {size.sizeLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quantity Controls */}
          <div className="space-y-2">
            <label htmlFor="product-qty-input" className="block text-sm font-semibold text-[#18221d]">
              Quantity (No minimum order quantity)
            </label>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-[#d6d3c7] rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleStep(-1)}
                  aria-label="Decrease quantity"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#18221d] hover:bg-[#f2f1ec]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  id="product-qty-input"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  className="w-20 text-center font-mono text-sm font-semibold tabular-nums py-2.5 border-x border-[#d6d3c7] bg-white text-[#18221d] min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => handleStep(1)}
                  aria-label="Increase quantity"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#18221d] hover:bg-[#f2f1ec]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {!isValidQty && (
                <span className="text-xs font-medium text-[#dc2626]" role="alert">
                  Enter a whole number of 1 or more.
                </span>
              )}
            </div>
          </div>

          {/* Add to Basket Action */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={!selectedSize || !isValidQty || isOutOfStock}
              onClick={handleAdd}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold hover:bg-[#0c594e] disabled:bg-[#cbd0cd] disabled:text-[#525b56] disabled:cursor-not-allowed transition-colors min-h-[48px]"
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Quantity Basket</span>
                </>
              ) : isOutOfStock ? (
                <span>Selected Size Out of Stock</span>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Quantity Basket</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between gap-4 pt-1 text-xs text-[#525b56]">
              <span>Estimated order total is shown on the Quantity page.</span>
              <button
                type="button"
                onClick={() => navigate('/quantity')}
                className="font-semibold text-[#0f6b5e] hover:underline whitespace-nowrap shrink-0"
              >
                Go to Quantity →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Ingredients, Feeding Guidance & Nutritional Specifications */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-[#e5e3da] pt-10">
        <div className="bg-white border border-[#e5e3da] rounded-xl p-6 space-y-2">
          <h2 className="font-display text-base font-bold text-[#18221d]">Ingredients</h2>
          <p className="text-sm text-[#525b56] leading-relaxed">
            {product.ingredients?.trim()
              ? product.ingredients
              : 'Verified ingredient details are confirmed by Sam Kay Animal Feeds and can be updated from the Admin Dashboard.'}
          </p>
        </div>
        <div className="bg-white border border-[#e5e3da] rounded-xl p-6 space-y-2">
          <h2 className="font-display text-base font-bold text-[#18221d]">Feeding Guidance</h2>
          <p className="text-sm text-[#525b56] leading-relaxed">
            {product.feedingGuidance?.trim()
              ? product.feedingGuidance
              : 'Feeding guidance is supplied only when confirmed by the owner. Ask on WhatsApp for age- or weight-specific recommendations.'}
          </p>
        </div>
        <div className="bg-white border border-[#e5e3da] rounded-xl p-6 space-y-2">
          <h2 className="font-display text-base font-bold text-[#18221d]">Nutritional Specifications</h2>
          {product.nutritionalInfo && product.nutritionalInfo.length > 0 ? (
            <dl className="divide-y divide-[#e5e3da] text-sm">
              {product.nutritionalInfo.map((n) => (
                <div key={n.id} className="py-1.5 flex items-center justify-between gap-4">
                  <dt className="text-[#525b56]">{n.nutrientName}</dt>
                  <dd className="font-mono font-medium text-[#18221d] tabular-nums">{n.nutrientValue}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-[#525b56] leading-relaxed">
              Exact nutritional specifications are listed only after owner verification.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
