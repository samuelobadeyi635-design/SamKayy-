import { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
  eager?: boolean;
}

export function ProductImage({ src, alt, title, className = '', eager = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#f2f1ec] text-[#525b56] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 mb-2 text-[#0f6b5e] opacity-70" strokeWidth={1.5} />
        {title && <span className="text-xs font-medium text-[#18221d] max-w-[180px] truncate">{title}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
