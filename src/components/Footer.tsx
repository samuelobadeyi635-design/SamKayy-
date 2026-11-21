import { MapPin, MessageCircle, Phone } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import type { BusinessSettings } from '../types';
import { BRAND_LOGO_URL } from './Navbar';

export function Footer({ settings }: { settings: BusinessSettings | null }) {
  const { navigate } = useRouter();
  const waDigits = settings?.whatsapp_digits || '2349042450053';
  const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    'Hello Sam Kay Animal Feeds, I would like to make an enquiry.'
  )}`;

  const link = (to: string, label: string) => (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      className="text-sm text-[#525b56] hover:text-[#0f6b5e] transition-colors"
    >
      {label}
    </a>
  );

  return (
    <footer className="bg-[#f2f1ec] border-t border-[#e5e3da] mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_LOGO_URL}
              alt="Sam Kay Animal Feeds logo"
              className="w-11 h-11 object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="font-display text-lg font-bold text-[#18221d]">
                {settings?.business_name || 'Sam Kay Animal Feeds'}
              </p>
              <p className="text-xs text-[#525b56]">
                {settings?.business_location || 'Tanke, Kwara State, Nigeria'}
              </p>
            </div>
          </div>
          <p className="text-sm text-[#525b56] max-w-md leading-relaxed">
            {settings?.business_tagline ||
              'Manufacturer and supplier of quality rabbit, dog, and cat feeds for retail pet owners and wholesale buyers.'}
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-[#18221d]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#0f6b5e]" />
              <span>Pickup available at Tanke</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums">
              <Phone className="w-4 h-4 text-[#0f6b5e]" />
              <span>{settings?.whatsapp_number || '+234 09042450053'}</span>
            </span>
          </div>
          <div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold hover:bg-[#0c594e] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-[#18221d]">Explore</h3>
          <ul className="space-y-2">
            <li>{link('/', 'Home')}</li>
            <li>{link('/feeds', 'All Animal Feeds')}</li>
            <li>{link('/feeds?category=rabbit-feeds', 'Rabbit Feeds')}</li>
            <li>{link('/feeds?category=dog-feeds', 'Dog Feeds')}</li>
            <li>{link('/feeds?category=cat-feeds', 'Cat Feeds')}</li>
            <li>{link('/quantity', 'Quantity & Basket')}</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-[#18221d]">Information</h3>
          <ul className="space-y-2">
            <li>{link('/about', 'About Us')}</li>
            <li>{link('/pickup-delivery', 'Pickup & Delivery')}</li>
            <li>{link('/faq', 'Frequently Asked Questions')}</li>
            <li>{link('/contact', 'Contact Us')}</li>
            <li>{link('/privacy', 'Privacy Policy')}</li>
            <li>{link('/terms', 'Terms & Conditions')}</li>
            <li className="pt-2 border-t border-[#e5e3da]">{link('/admin/login', 'Admin Portal')}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#e5e3da]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#525b56]">
          <p>© {new Date().getFullYear()} Sam Kay Animal Feeds. Tanke, Kwara State, Nigeria.</p>
          <p>Final availability and order confirmation handled via WhatsApp.</p>
        </div>
      </div>
    </footer>
  );
}
