import { ArrowRight, CheckCircle2, MapPin, MessageCircle, PackageCheck, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BRAND_LOGO_URL } from '../components/Navbar';
import { ProductImage } from '../components/ProductImage';
import { setPageSeo, useRouter } from '../context/RouterContext';
import type { BusinessSettings, Category } from '../types';

export function HomePage({ settings }: { settings: BusinessSettings | null }) {
  const { navigate } = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    setPageSeo(
      'Sam Kay Animal Feeds – Rabbit, Dog & Cat Feeds | Tanke, Kwara State',
      'Manufacturer and supplier of quality rabbit, dog, and cat feeds in Tanke, Kwara State, Nigeria. Browse feeds, select package sizes, and order on WhatsApp.'
    );
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false));
  }, []);

  const waDigits = settings?.whatsapp_digits || '2349042450053';
  const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    'Hello Sam Kay Animal Feeds, I would like to enquire about placing a feed order.'
  )}`;

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* 1. Storefront Hero */}
      <section className="bg-[#f2f1ec] border-b border-[#e5e3da]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <p className="text-sm font-medium text-[#0f6b5e]">
              Tanke, Kwara State, Nigeria · Manufacturer &amp; Direct Supplier
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#18221d] leading-[1.1] [text-wrap:balance]">
              Quality feeds for rabbits, dogs, and cats — direct from Sam Kay Animal Feeds.
            </h1>
            <p className="text-base sm:text-lg text-[#525b56] max-w-2xl leading-relaxed">
              We manufacture and supply dependable animal feeds for everyday pet owners and wholesale buyers. Browse our separated feeds by animal, choose your package sizes and quantities, and send your order enquiry straight to our WhatsApp desk.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/feeds')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold hover:bg-[#0c594e] transition-colors min-h-[44px] whitespace-nowrap"
              >
                <span>Explore Feeds</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white border border-[#d6d3c7] text-[#18221d] text-sm font-semibold hover:border-[#0f6b5e] hover:text-[#0f6b5e] transition-colors min-h-[44px] whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-[#0f6b5e]" />
                <span>Order on WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-white border border-[#e5e3da] rounded-2xl p-8 flex flex-col items-center text-center space-y-4">
              <img
                src={BRAND_LOGO_URL}
                alt="Sam Kay Animal Feeds — Cat, Dog and Rabbit Pet Feeds logo"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="pt-2 border-t border-[#e5e3da] w-full">
                <p className="font-display text-lg font-bold text-[#18221d]">
                  {settings?.business_name || 'Sam Kay Animal Feeds'}
                </p>
                <p className="text-xs text-[#525b56] mt-1">
                  Rabbit Feeds · Dog Feeds · Cat Feeds
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Three Prominent Category Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18221d] tracking-tight">
              Browse by Animal Category
            </h2>
            <p className="text-sm sm:text-base text-[#525b56] max-w-2xl">
              Every feed type is separated and clearly named so you can select the exact nutrition and pack sizes for your animals.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/feeds')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f6b5e] hover:underline whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <span>View Full Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loadingCats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-[#e5e3da] rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[3/2] bg-[#f2f1ec]" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-[#f2f1ec] rounded w-1/2" />
                  <div className="h-4 bg-[#f2f1ec] rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <article
                key={cat.id}
                className="bg-white border border-[#e5e3da] rounded-xl overflow-hidden flex flex-col hover:border-[#0f6b5e]/50 transition-colors"
              >
                <div className="aspect-[3/2] bg-[#f7f6f2] overflow-hidden border-b border-[#e5e3da]">
                  <ProductImage
                    src={cat.cover_image}
                    alt={`${cat.name} category cover`}
                    title={cat.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#525b56]">
                      {cat.animal_type} · {cat.product_count || 0} feed options
                    </p>
                    <h3 className="font-display text-xl font-bold text-[#18221d]">{cat.name}</h3>
                    <p className="text-sm text-[#525b56] leading-relaxed">{cat.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/feeds?category=${encodeURIComponent(cat.slug)}`)}
                    className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-[#f2f1ec] text-[#18221d] text-sm font-semibold hover:bg-[#0f6b5e] hover:text-white transition-colors min-h-[44px]"
                  >
                    <span>Explore {cat.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 3. Manufacturing, Wholesale & Tanke Pickup Highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-[#e5e3da] rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-3">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18221d] tracking-tight [text-wrap:balance]">
              Reliable feed manufacturing and supply in Tanke
            </h2>
            <p className="text-sm sm:text-base text-[#525b56] leading-relaxed">
              Sam Kay Animal Feeds manufactures and supplies feeds for rabbits, dogs, and cats—serving households, breeders, farms, and retail stockists across Kwara State.
            </p>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[#0f6b5e] font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Affordable &amp; Quality Feeds</span>
              </div>
              <p className="text-sm text-[#525b56] leading-relaxed">
                Consistent, clearly labelled feeds separated by animal species with flexible package sizes from 1kg to 25kg where offered.
              </p>
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[#0f6b5e] font-semibold text-sm">
                <PackageCheck className="w-4 h-4 shrink-0" />
                <span>Wholesale &amp; Retail Supply</span>
              </div>
              <p className="text-sm text-[#525b56] leading-relaxed">
                No general minimum order quantity. Wholesale bulk discounts apply automatically in your Quantity summary when configured.
              </p>
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[#0f6b5e] font-semibold text-sm">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Customer Pickup at Tanke</span>
              </div>
              <p className="text-sm text-[#525b56] leading-relaxed">
                Convenient customer pickup in Tanke, Kwara State. Pickup timing and exact landmark are confirmed via WhatsApp.
              </p>
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[#0f6b5e] font-semibold text-sm">
                <Truck className="w-4 h-4 shrink-0" />
                <span>Delivery Confirmation</span>
              </div>
              <p className="text-sm text-[#525b56] leading-relaxed">
                Need delivery instead of pickup? Share your delivery location in your Quantity enquiry and our team will confirm coverage and charges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How to Order + Direct WhatsApp CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18221d] tracking-tight">
            How to Order in Four Simple Steps
          </h2>
          <p className="text-sm sm:text-base text-[#525b56]">
            No online card payment required—prepare your basket and send your order enquiry directly on WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Browse Feeds',
              desc: 'Explore Rabbit, Dog, and Cat feeds and open any feed item to check available sizes.',
            },
            {
              step: '02',
              title: 'Choose Size & Quantity',
              desc: 'Select from the package sizes enabled for that product and enter the exact quantity you need.',
            },
            {
              step: '03',
              title: 'Review Quantity Basket',
              desc: 'Combine multiple categories in one basket, view your estimated order total, and choose pickup or delivery.',
            },
            {
              step: '04',
              title: 'Send Order on WhatsApp',
              desc: 'Tap the WhatsApp order button to send your pre-filled enquiry for confirmation by our team.',
            },
          ].map((item) => (
            <div key={item.step} className="bg-white border border-[#e5e3da] rounded-xl p-6 space-y-2">
              <span className="font-mono text-xs font-semibold text-[#0f6b5e] tabular-nums">{item.step}</span>
              <h3 className="font-display text-lg font-bold text-[#18221d]">{item.title}</h3>
              <p className="text-sm text-[#525b56] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#18221d] text-white rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Ready to prepare your feed order?
            </h2>
            <p className="text-sm sm:text-base text-[#d5dbd7]">
              Start browsing Rabbit, Dog, and Cat feeds or message our Tanke desk directly on WhatsApp for wholesale enquiries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/feeds')}
              className="px-5 py-3 rounded-lg bg-white text-[#18221d] text-sm font-semibold hover:bg-[#f2f1ec] transition-colors min-h-[44px] whitespace-nowrap"
            >
              Browse Catalogue
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold hover:bg-[#0c594e] transition-colors min-h-[44px] whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Message on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
