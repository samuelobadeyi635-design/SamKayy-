import { ChevronDown, Menu, MessageCircle, Phone, ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useRouter } from '../context/RouterContext';
import type { BusinessSettings } from '../types';

export const BRAND_LOGO_URL = '/assets/aistudio/pet_feeds_logo_cutout_2469b935.png';

function formatTelHref(rawPhone: string, fallbackDigits: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('2340') && digits.length === 14) {
    return `tel:+234${digits.slice(4)}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `tel:+234${digits.slice(1)}`;
  }
  if (digits.length > 0) {
    return `tel:+${digits}`;
  }
  return `tel:+${fallbackDigits}`;
}

export function Navbar({ settings }: { settings: BusinessSettings | null }) {
  const { pathname, navigate } = useRouter();
  const { totalUnits, lastAddedFeedback, clearFeedback } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === '/';
  const isFeeds = pathname === '/feeds' || pathname.startsWith('/feeds/');
  const isQuantity = pathname === '/quantity';

  const waDigits = settings?.whatsapp_digits || '2349042450053';
  const displayPhone = settings?.contact_phone || settings?.whatsapp_number || '+234 09042450053';
  const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    'Hello Sam Kay Animal Feeds, I would like to enquire about placing a feed order.'
  )}`;
  const telHref = formatTelHref(displayPhone, waDigits);

  useEffect(() => {
    if (!contactOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContactOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setContactOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contactOpen]);

  const handleNav = (to: string) => {
    setMobileOpen(false);
    setContactOpen(false);
    navigate(to);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#fafaf8]/95 backdrop-blur-sm border-b border-[#e5e3da]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNav('/');
          }}
          className="flex items-center gap-2.5 sm:gap-3 whitespace-nowrap shrink-0 group min-w-0"
        >
          <img
            src={BRAND_LOGO_URL}
            alt="Sam Kay Animal Feeds logo"
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#18221d] group-hover:text-[#0f6b5e] transition-colors truncate">
            Sam Kay Animal Feeds
          </span>
        </a>

        {/* Primary navigation strictly limited to HOME, FEEDS, QUANTITY */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/');
            }}
            className={`text-sm font-semibold tracking-wide whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              isHome
                ? 'text-[#0f6b5e] border-[#0f6b5e]'
                : 'text-[#525b56] border-transparent hover:text-[#18221d]'
            }`}
          >
            HOME
          </a>
          <a
            href="/feeds"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/feeds');
            }}
            className={`text-sm font-semibold tracking-wide whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              isFeeds
                ? 'text-[#0f6b5e] border-[#0f6b5e]'
                : 'text-[#525b56] border-transparent hover:text-[#18221d]'
            }`}
          >
            FEEDS
          </a>
          <a
            href="/quantity"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/quantity');
            }}
            className={`inline-flex items-center gap-2 text-sm font-semibold tracking-wide whitespace-nowrap shrink-0 px-3.5 py-2 rounded-lg transition-colors ${
              isQuantity
                ? 'bg-[#0f6b5e] text-white'
                : 'bg-[#f2f1ec] text-[#18221d] hover:bg-[#e5e3da]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>QUANTITY</span>
            <span className="font-mono text-xs tabular-nums">({totalUnits})</span>
          </a>
        </nav>

        {/* Right Header Action: WhatsApp & Call Toggle + Mobile Menu */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setContactOpen((prev) => !prev);
              }}
              aria-expanded={contactOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-[#0f6b5e] text-white text-xs sm:text-sm font-semibold hover:bg-[#0c594e] transition-colors min-h-[44px] md:min-h-[40px] whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">WhatsApp / Call</span>
              <span className="sm:hidden">WhatsApp</span>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 transition-transform ${contactOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {contactOpen && (
              <div
                role="menu"
                aria-label="WhatsApp and phone contact options"
                className="absolute right-0 mt-2 w-72 bg-white border border-[#e5e3da] rounded-xl shadow-lg p-2 z-50 space-y-1"
              >
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={() => setContactOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-lg hover:bg-[#f2f1ec] transition-colors"
                >
                  <span className="w-9 h-9 rounded-lg bg-[#0f6b5e] text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#18221d]">Chat on WhatsApp</p>
                    <p className="text-xs text-[#525b56] truncate">Order enquiry &amp; quotes</p>
                  </div>
                </a>

                <a
                  href={telHref}
                  role="menuitem"
                  onClick={() => setContactOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-lg hover:bg-[#f2f1ec] transition-colors"
                >
                  <span className="w-9 h-9 rounded-lg bg-[#f2f1ec] text-[#0f6b5e] border border-[#e5e3da] flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#18221d]">Call Direct</p>
                    <p className="font-mono text-xs text-[#525b56] tabular-nums truncate">{displayPhone}</p>
                  </div>
                </a>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setContactOpen(false);
              setMobileOpen((prev) => !prev);
            }}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border border-[#e5e3da] bg-white text-[#18221d]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile primary navigation"
          className="md:hidden border-t border-[#e5e3da] bg-white px-4 py-3 flex flex-col gap-1"
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/');
            }}
            className={`px-3 py-3 rounded-lg text-sm font-semibold ${
              isHome ? 'bg-[#f2f1ec] text-[#0f6b5e]' : 'text-[#18221d]'
            }`}
          >
            HOME
          </a>
          <a
            href="/feeds"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/feeds');
            }}
            className={`px-3 py-3 rounded-lg text-sm font-semibold ${
              isFeeds ? 'bg-[#f2f1ec] text-[#0f6b5e]' : 'text-[#18221d]'
            }`}
          >
            FEEDS
          </a>
          <a
            href="/quantity"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/quantity');
            }}
            className={`px-3 py-3 rounded-lg text-sm font-semibold flex items-center justify-between ${
              isQuantity ? 'bg-[#0f6b5e] text-white' : 'text-[#18221d]'
            }`}
          >
            <span>QUANTITY</span>
            <span className="font-mono text-xs tabular-nums">{totalUnits} items</span>
          </a>
        </nav>
      )}

      {lastAddedFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="bg-[#0f6b5e] text-white text-xs sm:text-sm px-4 py-2.5"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <span className="truncate">{lastAddedFeedback}</span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  clearFeedback();
                  navigate('/quantity');
                }}
                className="underline font-semibold whitespace-nowrap hover:opacity-90"
              >
                View Basket
              </button>
              <button
                type="button"
                onClick={clearFeedback}
                aria-label="Dismiss notification"
                className="p-1 hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
