import { ArrowRight, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ProductImage } from '../components/ProductImage';
import { useCart } from '../context/CartContext';
import { setPageSeo, useRouter } from '../context/RouterContext';
import type { BasketEstimate, BusinessSettings } from '../types';

export function QuantityPage({ settings }: { settings: BusinessSettings | null }) {
  const { navigate } = useRouter();
  const { items, updateItemQuantity, updateItemSize, removeItem, clearBasket } = useCart();

  const [estimate, setEstimate] = useState<BasketEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fulfilmentType, setFulfilmentType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [enquirySubmittedNotice, setEnquirySubmittedNotice] = useState(false);

  useEffect(() => {
    setPageSeo(
      'Quantity & Order Summary | Sam Kay Animal Feeds',
      'Review your selected Rabbit, Dog, and Cat feeds, check your estimated order total, and send your order enquiry on WhatsApp.'
    );
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setEstimate(null);
      return;
    }
    setLoadingEstimate(true);
    fetch('/api/basket/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          sizeLabel: i.sizeLabel,
          quantity: i.quantity,
        })),
      }),
    })
      .then((r) => r.json())
      .then((data: BasketEstimate) => setEstimate(data))
      .catch(() => setEstimate(null))
      .finally(() => setLoadingEstimate(false));
  }, [items]);

  const currency = estimate?.currencySymbol || settings?.currency_symbol || '₦';
  const waDigits = settings?.whatsapp_digits || '2349042450053';

  const whatsappMessage = useMemo(() => {
    const lines: string[] = [];
    lines.push('SAM KAY ANIMAL FEEDS — ORDER ENQUIRY');
    lines.push('-----------------------------------');
    lines.push(`Customer Name: ${customerName.trim() || '(Please enter name)'}`);
    lines.push(`Phone Number: ${customerPhone.trim() || '(Please enter phone)'}`);
    lines.push('');
    lines.push('Selected Feeds:');

    const sourceItems = estimate?.items || [];
    if (sourceItems.length > 0) {
      sourceItems.forEach((item, idx) => {
        lines.push(
          `${idx + 1}. ${item.productName} (${item.animalType}) — ${item.sizeLabel} x ${item.quantity}`
        );
        if (item.needsQuote) {
          lines.push('   Price: Request a quotation on WhatsApp');
        } else {
          const base = `${currency}${(item.lineTotal ?? 0).toLocaleString()}`;
          if (item.discountAmount > 0) {
            lines.push(
              `   Line Total: ${base} (Includes ${currency}${item.discountAmount.toLocaleString()} wholesale discount)`
            );
          } else {
            lines.push(`   Line Total: ${base}`);
          }
        }
      });
    } else {
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.productName} (${item.animalType}) — ${item.sizeLabel} x ${item.quantity}`);
      });
    }

    lines.push('');
    if (estimate?.hasPricedItems) {
      lines.push(`Estimated Subtotal: ${currency}${estimate.calculableSubtotal.toLocaleString()}`);
      if (estimate.calculableDiscount > 0) {
        lines.push(`Wholesale Discounts: -${currency}${estimate.calculableDiscount.toLocaleString()}`);
      }
      lines.push(
        `Estimated Order Total: ${currency}${estimate.estimatedTotal.toLocaleString()}${
          estimate.hasUnpricedItems ? ' (+ unpriced items pending WhatsApp quotation)' : ''
        }`
      );
    } else {
      lines.push('Estimated Order Total: Quotation requested on WhatsApp');
    }

    lines.push('');
    lines.push(
      `Fulfilment: ${fulfilmentType === 'pickup' ? 'Customer Pickup at Tanke' : 'Delivery'}`
    );
    if (fulfilmentType === 'delivery' && deliveryLocation.trim()) {
      lines.push(`Delivery Location: ${deliveryLocation.trim()}`);
    }
    if (customerNotes.trim()) {
      lines.push(`Notes / Instructions: ${customerNotes.trim()}`);
    }
    lines.push('');
    lines.push('Please confirm final availability, delivery charges (if applicable), and order confirmation.');

    return lines.join('\n');
  }, [
    customerName,
    customerPhone,
    estimate,
    items,
    currency,
    fulfilmentType,
    deliveryLocation,
    customerNotes,
  ]);

  const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(whatsappMessage)}`;

  const isFormValid =
    items.length > 0 &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    (fulfilmentType === 'pickup' || deliveryLocation.trim().length > 0);

  const handleWhatsAppLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!customerName.trim() || !customerPhone.trim()) {
      e.preventDefault();
      setFormError('Please enter your name and phone number before preparing the WhatsApp enquiry.');
      return;
    }
    if (fulfilmentType === 'delivery' && !deliveryLocation.trim()) {
      e.preventDefault();
      setFormError('Please enter your delivery location or select Pickup at Tanke.');
      return;
    }
    if (items.length === 0) {
      e.preventDefault();
      setFormError('Your basket is empty.');
      return;
    }

    setFormError(null);
    setEnquirySubmittedNotice(true);

    // Log enquiry asynchronously to server analytics without blocking WhatsApp click-to-chat
    fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        fulfilmentType,
        deliveryLocation: deliveryLocation.trim(),
        customerNotes: customerNotes.trim(),
        items: items.map((i) => ({
          productId: i.productId,
          sizeLabel: i.sizeLabel,
          quantity: i.quantity,
        })),
      }),
    }).catch(() => {});
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#f2f1ec] mx-auto flex items-center justify-center text-[#0f6b5e]">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h1 className="font-display text-3xl font-bold text-[#18221d]">Your Quantity Basket is Empty</h1>
        <p className="text-sm sm:text-base text-[#525b56] max-w-md mx-auto leading-relaxed">
          Browse Rabbit, Dog, and Cat feeds to choose your package sizes and quantities. You can combine items from multiple animal categories in one order enquiry.
        </p>
        <button
          type="button"
          onClick={() => navigate('/feeds')}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold hover:bg-[#0c594e] min-h-[44px]"
        >
          <span>Explore Feeds</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e3da] pb-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18221d] tracking-tight">
            Quantity &amp; Order Summary
          </h1>
          <p className="text-sm sm:text-base text-[#525b56]">
            Adjust package sizes or quantities below, then send your order enquiry to Sam Kay Animal Feeds on WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/feeds')}
            className="text-sm font-semibold text-[#0f6b5e] hover:underline whitespace-nowrap"
          >
            + Add More Feeds
          </button>
          <button
            type="button"
            onClick={clearBasket}
            className="text-sm text-[#525b56] hover:text-[#dc2626] whitespace-nowrap"
          >
            Clear Basket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Line Items */}
        <div className="lg:col-span-7 space-y-4">
          {items.map((item) => {
            const est = estimate?.items.find(
              (e) => e.productId === item.productId && e.sizeLabel === item.sizeLabel
            );
            const availableSizes = est?.availableSizes || [item.sizeLabel];

            return (
              <div
                key={`${item.productId}-${item.sizeLabel}`}
                className="bg-white border border-[#e5e3da] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
              >
                <div className="flex items-start gap-4">
                  <a
                    href={`/feeds/${item.productSlug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/feeds/${item.productSlug}`);
                    }}
                    className="w-24 aspect-[3/2] rounded-lg bg-[#f7f6f2] border border-[#e5e3da] overflow-hidden shrink-0"
                  >
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.productName}
                      title={item.productName}
                      className="w-full h-full object-cover"
                    />
                  </a>
                  <div className="space-y-1.5">
                    <p className="text-xs text-[#525b56]">{item.categoryName}</p>
                    <h2 className="font-display text-base font-bold text-[#18221d]">
                      <a
                        href={`/feeds/${item.productSlug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/feeds/${item.productSlug}`);
                        }}
                        className="hover:text-[#0f6b5e]"
                      >
                        {item.productName}
                      </a>
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <label className="text-xs text-[#525b56] flex items-center gap-1.5">
                        <span>Size:</span>
                        <select
                          aria-label={`Package size for ${item.productName}`}
                          value={item.sizeLabel}
                          onChange={(e) => updateItemSize(item.productId, item.sizeLabel, e.target.value)}
                          className="rounded-md border border-[#d6d3c7] bg-white px-2 py-1 text-xs font-mono font-medium text-[#18221d] min-h-[36px]"
                        >
                          {availableSizes.map((sz) => (
                            <option key={sz} value={sz}>
                              {sz}
                            </option>
                          ))}
                        </select>
                      </label>

                      {est?.stockStatus === 'out_of_stock' && (
                        <span className="text-xs font-semibold text-[#dc2626]">
                          Currently Out of Stock
                        </span>
                      )}
                      {est?.stockStatus === 'low_stock' && (
                        <span className="text-xs font-semibold text-[#b45309]">Low Stock</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 border-[#e5e3da] pt-3 sm:pt-0">
                  <div className="inline-flex items-center border border-[#d6d3c7] rounded-lg bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        updateItemQuantity(item.productId, item.sizeLabel, Math.max(1, item.quantity - 1))
                      }
                      aria-label={`Decrease quantity for ${item.productName}`}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#18221d] hover:bg-[#f2f1ec]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      aria-label={`Quantity for ${item.productName}`}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = Math.floor(Number(e.target.value));
                        if (Number.isInteger(val) && val > 0) {
                          updateItemQuantity(item.productId, item.sizeLabel, val);
                        }
                      }}
                      className="w-14 text-center font-mono text-sm font-semibold tabular-nums py-1.5 border-x border-[#d6d3c7] text-[#18221d] min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.productId, item.sizeLabel, item.quantity + 1)}
                      aria-label={`Increase quantity for ${item.productName}`}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#18221d] hover:bg-[#f2f1ec]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right space-y-1">
                    {loadingEstimate ? (
                      <span className="text-xs text-[#525b56]">Calculating…</span>
                    ) : est?.needsQuote || !est ? (
                      <p className="text-xs font-semibold text-[#0f6b5e]">
                        Request a quotation on WhatsApp
                      </p>
                    ) : (
                      <div>
                        <p className="font-mono text-sm font-bold text-[#18221d] tabular-nums">
                          {currency}
                          {(est.lineTotal ?? 0).toLocaleString()}
                        </p>
                        {est.discountAmount > 0 && (
                          <p className="text-xs text-[#15803d] font-medium">
                            Saved {currency}
                            {est.discountAmount.toLocaleString()} ({est.discountDescription})
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.sizeLabel)}
                      className="inline-flex items-center gap-1 text-xs text-[#525b56] hover:text-[#dc2626]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary + Customer & WhatsApp Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#e5e3da] rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-[#18221d]">Estimated Order Summary</h2>

            <dl className="space-y-2.5 text-sm border-b border-[#e5e3da] pb-4">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#525b56]">Estimated Subtotal</dt>
                <dd className="font-mono font-semibold text-[#18221d] tabular-nums">
                  {estimate?.hasPricedItems
                    ? `${currency}${estimate.calculableSubtotal.toLocaleString()}`
                    : 'Pending WhatsApp quote'}
                </dd>
              </div>
              {estimate && estimate.calculableDiscount > 0 && (
                <div className="flex items-center justify-between gap-4 text-[#15803d]">
                  <dt>Wholesale Discount Savings</dt>
                  <dd className="font-mono font-semibold tabular-nums">
                    -{currency}
                    {estimate.calculableDiscount.toLocaleString()}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#e5e3da] text-base font-bold text-[#18221d]">
                <dt>Estimated Order Total</dt>
                <dd className="font-mono tabular-nums">
                  {estimate?.hasPricedItems
                    ? `${currency}${estimate.estimatedTotal.toLocaleString()}`
                    : 'Request quotation'}
                </dd>
              </div>
            </dl>

            {estimate?.hasUnpricedItems && (
              <p className="text-xs text-[#b45309] font-medium leading-relaxed">
                One or more selected package sizes do not yet have a listed price and are marked “Request a quotation on WhatsApp”.
              </p>
            )}

            <p className="text-xs text-[#525b56] leading-relaxed">
              This total is an estimate based on current configured pricing and wholesale rules. Final availability, delivery charges, and order confirmation are subject to business confirmation by Sam Kay Animal Feeds.
            </p>
          </div>

          {/* Customer Details & Fulfilment */}
          <div className="bg-white border border-[#e5e3da] rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#18221d]">
              Customer &amp; Fulfilment Details
            </h2>

            <div className="space-y-3">
              <div>
                <label htmlFor="cust-name" className="block text-xs font-semibold text-[#18221d] mb-1">
                  Your Name <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  id="cust-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#d6d3c7] text-sm text-[#18221d] min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="cust-phone" className="block text-xs font-semibold text-[#18221d] mb-1">
                  Phone / WhatsApp Number <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  id="cust-phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0803 000 0000"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#d6d3c7] text-sm text-[#18221d] min-h-[44px]"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#18221d] mb-1.5">
                  Fulfilment Choice
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfilmentType('pickup')}
                    className={`px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold min-h-[44px] transition-colors ${
                      fulfilmentType === 'pickup'
                        ? 'bg-[#0f6b5e] text-white border-[#0f6b5e]'
                        : 'bg-white text-[#18221d] border-[#d6d3c7]'
                    }`}
                  >
                    Pickup at Tanke
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfilmentType('delivery')}
                    className={`px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold min-h-[44px] transition-colors ${
                      fulfilmentType === 'delivery'
                        ? 'bg-[#0f6b5e] text-white border-[#0f6b5e]'
                        : 'bg-white text-[#18221d] border-[#d6d3c7]'
                    }`}
                  >
                    Delivery
                  </button>
                </div>
              </div>

              {fulfilmentType === 'pickup' ? (
                <p className="text-xs text-[#525b56] bg-[#f2f1ec] rounded-lg p-3 leading-relaxed">
                  {settings?.pickup_address || 'Pickup at Tanke, Kwara State, Nigeria.'}{' '}
                  {settings?.pickup_hours ? `Hours: ${settings.pickup_hours}` : ''}
                </p>
              ) : (
                <div>
                  <label htmlFor="delivery-loc" className="block text-xs font-semibold text-[#18221d] mb-1">
                    Delivery Location / Address <span className="text-[#dc2626]">*</span>
                  </label>
                  <input
                    id="delivery-loc"
                    type="text"
                    required
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="Street, area, and landmark in Ilorin / Kwara"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#d6d3c7] text-sm text-[#18221d] min-h-[44px]"
                  />
                  <p className="text-xs text-[#525b56] mt-1">
                    Delivery coverage and charges are confirmed on WhatsApp.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="cust-notes" className="block text-xs font-semibold text-[#18221d] mb-1">
                  Notes / Special Instructions (Optional)
                </label>
                <textarea
                  id="cust-notes"
                  rows={2}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Preferred pickup time, bulk packaging questions, etc."
                  className="w-full px-3.5 py-2 rounded-lg border border-[#d6d3c7] text-sm text-[#18221d]"
                />
              </div>
            </div>

            {formError && (
              <p role="alert" className="text-xs font-semibold text-[#dc2626]">
                {formError}
              </p>
            )}

            <a
              href={isFormValid ? waUrl : '#'}
              target={isFormValid ? '_blank' : undefined}
              rel={isFormValid ? 'noopener noreferrer' : undefined}
              onClick={handleWhatsAppLinkClick}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold hover:bg-[#0c594e] transition-colors min-h-[48px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send Order Enquiry on WhatsApp</span>
            </a>

            {enquirySubmittedNotice && (
              <div role="status" className="text-xs text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-3">
                Your pre-filled order message has been prepared for WhatsApp. Please send the message in WhatsApp so our team can review and confirm your order.
              </div>
            )}

            <p className="text-xs text-[#525b56] leading-relaxed">
              Opening WhatsApp does not confirm an order automatically. You must send the message, and Sam Kay Animal Feeds will reply to confirm stock, delivery charges, and payment.
            </p>

            <details className="text-xs text-[#525b56] border-t border-[#e5e3da] pt-3">
              <summary className="cursor-pointer font-medium text-[#18221d]">
                Preview WhatsApp Message
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] bg-[#f2f1ec] p-3 rounded-lg text-[#18221d] overflow-x-auto">
                {whatsappMessage}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
