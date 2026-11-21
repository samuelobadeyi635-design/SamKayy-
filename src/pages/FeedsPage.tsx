import { ArrowRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ProductImage } from '../components/ProductImage';
import { setPageSeo, useRouter } from '../context/RouterContext';
import type { Category, PublicProduct } from '../types';

export function FeedsPage() {
  const { search, navigate } = useRouter();
  const initialCategory = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get('category') || 'all';
  }, [search]);

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setPageSeo(
      'Feed Catalogue – Rabbit, Dog & Cat Feeds | Sam Kay Animal Feeds',
      'Browse separated Rabbit, Dog, and Cat feeds from Sam Kay Animal Feeds. Choose available package sizes and quantities on each product page.'
    );
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ])
      .then(([cats, prods]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        setProducts(Array.isArray(prods) ? prods : []);
      })
      .catch(() => {
        setCategories([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeCategory !== 'all' && p.categorySlug !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.animalType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, activeCategory, searchQuery]);

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
    navigate(slug === 'all' ? '/feeds' : `/feeds?category=${encodeURIComponent(slug)}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-8">
      <div className="space-y-3 max-w-2xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18221d] tracking-tight">
          Animal Feed Catalogue
        </h1>
        <p className="text-sm sm:text-base text-[#525b56] leading-relaxed">
          Select a feed product to choose from its available package sizes and add the quantity you need to your basket. Estimated totals and wholesale discounts are calculated in your Quantity summary.
        </p>
      </div>

      {/* Category Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#e5e3da]">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#f2f1ec] rounded-lg self-start">
          <button
            type="button"
            onClick={() => handleCategoryChange('all')}
            className={`px-3.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] ${
              activeCategory === 'all'
                ? 'bg-white text-[#18221d] shadow-xs'
                : 'text-[#525b56] hover:text-[#18221d]'
            }`}
          >
            All Feeds
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-3.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] ${
                activeCategory === cat.slug
                  ? 'bg-white text-[#18221d] shadow-xs'
                  : 'text-[#525b56] hover:text-[#18221d]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#525b56] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="feed-search" className="sr-only">
            Search feeds
          </label>
          <input
            id="feed-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rabbit, dog, cat feeds..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-[#e5e3da] text-sm text-[#18221d] placeholder:text-[#7c8580] min-h-[44px]"
          />
        </div>
      </div>

      {/* Product Grid — strictly NO individual prices on public catalogue cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-[#e5e3da] rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[3/2] bg-[#f2f1ec]" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-[#f2f1ec] rounded w-1/3" />
                <div className="h-5 bg-[#f2f1ec] rounded w-3/4" />
                <div className="h-4 bg-[#f2f1ec] rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-[#e5e3da] rounded-xl p-10 text-center space-y-3">
          <p className="font-display text-lg font-bold text-[#18221d]">No matching feeds found</p>
          <p className="text-sm text-[#525b56]">
            Try clearing your search or switching to another animal category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              handleCategoryChange('all');
            }}
            className="px-4 py-2.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold min-h-[44px]"
          >
            Show All Feeds
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const primaryImage = product.images[0];
            const inStockSizes = product.packageSizes.filter((s) => s.stockStatus !== 'out_of_stock');
            const availabilityText =
              product.packageSizes.length === 0
                ? 'Sizes pending'
                : inStockSizes.length > 0
                  ? `${product.packageSizes.length} package ${product.packageSizes.length === 1 ? 'size' : 'sizes'} · In Stock`
                  : 'Currently Out of Stock';

            return (
              <article
                key={product.id}
                className="bg-white border border-[#e5e3da] rounded-xl overflow-hidden flex flex-col hover:border-[#0f6b5e]/60 transition-colors"
              >
                <a
                  href={`/feeds/${product.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/feeds/${product.slug}`);
                  }}
                  className="block aspect-[3/2] bg-[#f7f6f2] border-b border-[#e5e3da] overflow-hidden"
                >
                  <ProductImage
                    src={primaryImage?.imageUrl}
                    alt={primaryImage?.altText || product.name}
                    title={product.name}
                    className="w-full h-full object-cover"
                  />
                </a>
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#525b56]">
                      <span>{product.categoryName}</span>
                      <span
                        className={
                          inStockSizes.length > 0 ? 'text-[#15803d] font-medium' : 'text-[#dc2626] font-medium'
                        }
                      >
                        {inStockSizes.length > 0 ? 'Available' : 'Out of Stock'}
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-[#18221d] leading-snug">
                      <a
                        href={`/feeds/${product.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/feeds/${product.slug}`);
                        }}
                        className="hover:text-[#0f6b5e] transition-colors"
                      >
                        {product.name}
                      </a>
                    </h2>
                    <p className="text-sm text-[#525b56] leading-relaxed">{product.shortDescription}</p>
                    <p className="text-xs text-[#525b56] pt-1 font-mono tabular-nums">
                      {product.packageSizes.map((s) => s.sizeLabel).join(' · ') || availabilityText}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/feeds/${product.slug}`)}
                    className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold hover:bg-[#0c594e] transition-colors min-h-[44px]"
                  >
                    <span>Select Size &amp; Quantity</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
