import { ChevronDown, MapPin, MessageCircle, Phone, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BRAND_LOGO_URL } from '../components/Navbar';
import { setPageSeo, useRouter } from '../context/RouterContext';
import type { BusinessSettings, FaqItem } from '../types';

export function AboutPage({ settings }: { settings: BusinessSettings | null }) {
  const { navigate } = useRouter();
  useEffect(() => {
    setPageSeo(
      'About Us | Sam Kay Animal Feeds',
      'Learn about Sam Kay Animal Feeds, a manufacturer and supplier of rabbit, dog, and cat feeds in Tanke, Kwara State, Nigeria.'
    );
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b border-[#e5e3da] pb-8">
        <img
          src={BRAND_LOGO_URL}
          alt="Sam Kay Animal Feeds logo"
          className="w-24 h-24 object-contain shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18221d]">
            About {settings?.business_name || 'Sam Kay Animal Feeds'}
          </h1>
          <p className="text-sm sm:text-base text-[#525b56]">
            {settings?.business_location || 'Tanke, Kwara State, Nigeria'}
          </p>
        </div>
      </div>

      <div className="space-y-6 text-sm sm:text-base text-[#525b56] leading-relaxed">
        <p>
          Sam Kay Animal Feeds manufactures and supplies dependable feeds for rabbits, dogs, and cats. Based in Tanke, Kwara State, Nigeria, we serve household pet owners, breeders, farms, and wholesale buyers seeking consistent feed quality and straightforward ordering.
        </p>
        <p>
          Every feed category on our website is separated and clearly named—from Timothy hay, rabbit pellets, and fresh greens for rabbits, to complete dry kibble, hearty wet food, and treats for dogs and cats.
        </p>
        <p>
          Customers can select the exact package sizes and quantities they need across multiple animal categories, review an estimated order total in the Quantity summary, and send their enquiry directly to our WhatsApp desk for confirmation and pickup at Tanke or scheduled delivery.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/feeds')}
          className="px-5 py-3 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold min-h-[44px]"
        >
          Browse Feeds
        </button>
        <button
          type="button"
          onClick={() => navigate('/contact')}
          className="px-5 py-3 rounded-lg bg-white border border-[#d6d3c7] text-[#18221d] text-sm font-semibold min-h-[44px]"
        >
          Contact Us
        </button>
      </div>
    </div>
  );
}

export function ContactPage({ settings }: { settings: BusinessSettings | null }) {
  useEffect(() => {
    setPageSeo(
      'Contact Us | Sam Kay Animal Feeds',
      'Contact Sam Kay Animal Feeds in Tanke, Kwara State via WhatsApp or phone for retail and wholesale feed enquiries.'
    );
  }, []);

  const waDigits = settings?.whatsapp_digits || '2349042450053';
  const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    'Hello Sam Kay Animal Feeds, I have an enquiry.'
  )}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18221d]">Contact Us</h1>
        <p className="text-sm sm:text-base text-[#525b56]">
          Reach Sam Kay Animal Feeds directly for product questions, wholesale quotes, Tanke pickup directions, or delivery confirmation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e5e3da] rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#18221d]">Business Desk</h2>
          <div className="space-y-3 text-sm text-[#525b56]">
            <p className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#0f6b5e] mt-0.5 shrink-0" />
              <span>{settings?.pickup_address || 'Tanke, Kwara State, Nigeria'}</span>
            </p>
            <p className="flex items-center gap-2.5 font-mono text-xs sm:text-sm tabular-nums">
              <Phone className="w-4 h-4 text-[#0f6b5e] shrink-0" />
              <span>{settings?.contact_phone || '+234 09042450053'}</span>
            </p>
            {settings?.contact_email && (
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#0f6b5e] shrink-0" />
                <span>{settings.contact_email}</span>
              </p>
            )}
          </div>
          <p className="text-xs text-[#525b56] pt-2 border-t border-[#e5e3da]">
            Hours: {settings?.pickup_hours || 'Monday – Saturday, 8:00 AM – 6:00 PM'}
          </p>
        </div>

        <div className="bg-[#f2f1ec] border border-[#e5e3da] rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="font-display text-lg font-bold text-[#18221d]">WhatsApp Order &amp; Support</h2>
            <p className="text-sm text-[#525b56] leading-relaxed">
              For the fastest response on feed availability, package pricing quotations, and wholesale orders, send us a message on WhatsApp.
            </p>
          </div>
          <div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold hover:bg-[#0c594e] min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageSeo(
      'Frequently Asked Questions | Sam Kay Animal Feeds',
      'Answers to common questions about ordering, package sizes, wholesale discounts, Tanke pickup, and WhatsApp confirmation.'
    );
    fetch('/api/faqs')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setFaqs(list);
        if (list[0]) setOpenId(list[0].id);
      })
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18221d]">
          Frequently Asked Questions
        </h1>
        <p className="text-sm sm:text-base text-[#525b56]">
          Everything you need to know about browsing feeds, selecting quantities, and ordering via WhatsApp.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-white border border-[#e5e3da] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className="bg-white border border-[#e5e3da] rounded-xl overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left font-display text-base font-bold text-[#18221d] hover:bg-[#fafaf8]"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[#525b56] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-[#525b56] leading-relaxed border-t border-[#e5e3da] pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PickupDeliveryPage({ settings }: { settings: BusinessSettings | null }) {
  useEffect(() => {
    setPageSeo(
      'Pickup & Delivery Information | Sam Kay Animal Feeds',
      'Customer pickup details at Tanke, Kwara State and delivery confirmation process for Sam Kay Animal Feeds.'
    );
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18221d]">
          Pickup &amp; Delivery Information
        </h1>
        <p className="text-sm sm:text-base text-[#525b56]">
          How order collection at Tanke and local delivery confirmation work.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e5e3da] rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-xl font-bold text-[#18221d]">Customer Pickup at Tanke</h2>
          <p className="text-sm text-[#525b56] leading-relaxed">
            {settings?.pickup_address || 'Pickup is available at Tanke, Kwara State, Nigeria.'}
          </p>
          <p className="text-xs font-medium text-[#18221d]">
            Operating Hours: {settings?.pickup_hours || 'Monday – Saturday, 8:00 AM – 6:00 PM'}
          </p>
          <p className="text-xs text-[#525b56] leading-relaxed">
            Once you send your order enquiry on WhatsApp, our team will confirm when your feeds are packed and ready for collection.
          </p>
        </div>

        <div className="bg-white border border-[#e5e3da] rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-xl font-bold text-[#18221d]">Delivery Enquiries</h2>
          <p className="text-sm text-[#525b56] leading-relaxed">
            {settings?.delivery_info ||
              'Delivery availability, charges, and timelines depend on your location and order volume and are confirmed directly on WhatsApp.'}
          </p>
          <p className="text-xs text-[#525b56] leading-relaxed">
            Select “Delivery” on the Quantity page and enter your street or area landmark so we can provide an accurate delivery quote.
          </p>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  useEffect(() => {
    setPageSeo(
      'Privacy Policy | Sam Kay Animal Feeds',
      'How Sam Kay Animal Feeds handles customer names, phone numbers, and order enquiry information.'
    );
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#18221d]">Privacy Policy</h1>
      <div className="space-y-4 text-sm text-[#525b56] leading-relaxed">
        <p>
          Sam Kay Animal Feeds collects only the information necessary to prepare and respond to your feed order enquiry: your name, phone number, selected feed items, pickup or delivery preference, and any optional notes you enter.
        </p>
        <p>
          Your Quantity basket is stored locally in your browser so you do not lose your selected items while browsing. When you submit a WhatsApp order enquiry, your enquiry summary is prepared for WhatsApp Click to Chat and logged for internal order follow-up.
        </p>
        <p>
          We do not process online card payments on this website and do not sell or share your contact details with third parties for marketing purposes.
        </p>
      </div>
    </div>
  );
}

export function TermsPage() {
  useEffect(() => {
    setPageSeo(
      'Terms & Conditions | Sam Kay Animal Feeds',
      'Terms governing estimated basket totals, stock confirmation, pickup at Tanke, and WhatsApp order enquiries.'
    );
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#18221d]">Terms &amp; Conditions</h1>
      <div className="space-y-4 text-sm text-[#525b56] leading-relaxed">
        <p>
          <strong>1. Order Enquiries &amp; Confirmation:</strong> Opening WhatsApp from this website prepares an order enquiry message. Submitting or opening WhatsApp does not constitute a binding contract or confirmed order until you send the message and receive confirmation from Sam Kay Animal Feeds.
        </p>
        <p>
          <strong>2. Estimated Totals &amp; Quotations:</strong> Totals shown on the Quantity page are estimates calculated from currently configured pricing and wholesale rules. Items without configured pricing are marked “Request a quotation on WhatsApp”. Final availability, delivery charges, and pricing are confirmed by our team.
        </p>
        <p>
          <strong>3. Pickup &amp; Delivery:</strong> Pickup is available at Tanke, Kwara State, during business hours once your order is confirmed ready. Delivery timelines and fees depend on location and service coverage.
        </p>
      </div>
    </div>
  );
}
