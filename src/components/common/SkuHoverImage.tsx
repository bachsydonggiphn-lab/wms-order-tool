import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, ZoomIn, ExternalLink, Loader2, Copy, Check } from 'lucide-react';

// In-memory cache lưu trữ ảnh SKU trên toàn client để hiển thị 0ms khi rê chuột lại
export const globalSkuImageCache = new Map<string, {
  imageUrl?: string;
  productId?: string;
  status: 'loading' | 'loaded' | 'none' | 'error';
}>();

export interface SkuHoverImageProps {
  sku: string;
  productId?: string;
  productTitle?: string;
  className?: string;
  badgeClassName?: string;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export const SkuHoverImage: React.FC<SkuHoverImageProps> = ({
  sku,
  productId,
  productTitle,
  className = '',
  badgeClassName = '',
  children,
  onClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, placement: 'bottom' });
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageState, setImageState] = useState<{
    imageUrl?: string;
    productId?: string;
    status: 'idle' | 'loading' | 'loaded' | 'none' | 'error';
  }>(() => {
    const cached = globalSkuImageCache.get(sku.trim());
    if (cached) {
      return { imageUrl: cached.imageUrl, productId: cached.productId, status: cached.status };
    }
    return { status: 'idle' };
  });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const hoverTimeoutRef = useRef<any>(null);
  const closeTimeoutRef = useRef<any>(null);

  // Hàm tải ảnh từ backend API
  const loadImage = useCallback(async () => {
    const cleanSku = sku.trim();
    if (!cleanSku && !productId) return;

    const cached = globalSkuImageCache.get(cleanSku);
    if (cached && (cached.status === 'loaded' || cached.status === 'none')) {
      setImageState({ imageUrl: cached.imageUrl, productId: cached.productId, status: cached.status });
      return;
    }

    setImageState(prev => ({ ...prev, status: 'loading' }));
    globalSkuImageCache.set(cleanSku, { status: 'loading' });

    try {
      const params = new URLSearchParams();
      if (cleanSku) params.set('sku', cleanSku);
      if (productId) params.set('productId', productId);

      const res = await fetch(`/api/wms/sku-image?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.imageUrl) {
          const loadedData = {
            imageUrl: data.imageUrl,
            productId: data.productId || productId,
            status: 'loaded' as const
          };
          globalSkuImageCache.set(cleanSku, loadedData);
          setImageState(loadedData);
          return;
        }
      }

      // Nếu không có ảnh
      const noneData = { status: 'none' as const, productId };
      globalSkuImageCache.set(cleanSku, noneData);
      setImageState(noneData);
    } catch (err) {
      const errData = { status: 'error' as const, productId };
      globalSkuImageCache.set(cleanSku, errData);
      setImageState(errData);
    }
  }, [sku, productId]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const CARD_WIDTH = 270;
    const CARD_HEIGHT = 320;

    // Tính toán trục ngang (left)
    let left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
    if (left + CARD_WIDTH > window.innerWidth - 12) {
      left = window.innerWidth - CARD_WIDTH - 12;
    }
    if (left < 12) {
      left = 12;
    }

    // Tính toán trục dọc (top / bottom)
    let top = rect.bottom + 6;
    let placement: 'top' | 'bottom' = 'bottom';
    if (rect.bottom + CARD_HEIGHT > window.innerHeight - 12) {
      // Lật lên trên
      top = Math.max(12, rect.top - CARD_HEIGHT - 6);
      placement = 'top';
    }

    setCoords({ top, left, placement });
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    // Bắt đầu tải ảnh ngầm ngay lập tức
    loadImage();

    // Hiển thị popup sau 60ms (siêu nhạy nhưng vẫn êm)
    hoverTimeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, 60);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200); // 200ms để người dùng thoải mái lia chuột vào card
  };

  const handleCardMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleCardMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleCopySku = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sku.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setIsOpen(prev => !prev);
    loadImage();
    if (onClick) onClick(e);
  };

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`inline-flex items-center gap-1 cursor-pointer transition-all duration-150 group/sku active:scale-95 touch-manipulation ${className}`}
      >
        {children ? (
          children
        ) : (
          <span
            className={`px-2.5 py-0.5 rounded-md font-mono text-xs transition-all duration-150 ${badgeClassName || 'bg-slate-100 border border-slate-200 text-slate-900 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 group-hover:shadow-xs group-hover:scale-105 font-bold'}`}
          >
            {sku}
          </span>
        )}
      </span>

      {/* Floating Hover Card trên Desktop HOẶC Mobile Modal Card trên Mobile */}
      {isOpen &&
        createPortal(
          isMobile ? (
            /* CHẾ ĐỘ MOBILE: Modal Card ở giữa màn hình có backdrop làm mờ, chống tràn 100% */
            <div
              className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="w-full max-w-[320px] bg-white rounded-3xl p-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 text-slate-800"
                onClick={e => e.stopPropagation()}
              >
                {/* Header: SKU, Copy & Nút Đóng */}
                <div className="flex items-center justify-between gap-1.5 pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                    <span className="font-mono font-black text-sm text-blue-700 truncate" title={sku}>
                      {sku}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopySku}
                      title="Sao chép mã SKU"
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition-colors ml-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Khung hiển thị ảnh sản phẩm Mobile (280x260px) */}
                <div className="relative w-full h-[260px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center">
                  {imageState.status === 'loading' && (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="text-xs font-medium text-slate-600">Đang tải ảnh WMS...</span>
                    </div>
                  )}

                  {imageState.status === 'loaded' && imageState.imageUrl && (
                    <>
                      <img
                        src={imageState.imageUrl}
                        alt={sku}
                        className="w-full h-full object-contain p-2"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            setIsLightboxOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95"
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                          <span>Xem Toàn Màn Hình</span>
                        </button>
                      </div>
                    </>
                  )}

                  {(imageState.status === 'none' || imageState.status === 'error') && (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-slate-300 p-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">Chưa có ảnh trên WMS</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {imageState.productId ? `ID: ${imageState.productId}` : 'Chưa định danh'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer: Tiêu đề sản phẩm */}
                {productTitle && (
                  <p className="mt-2.5 text-xs text-slate-600 font-medium line-clamp-2 leading-snug px-0.5">
                    {productTitle}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* CHẾ ĐỘ DESKTOP: Floating Card định vị chính xác cạnh con trỏ chuột */
            <div
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 999999
              }}
              className="w-[270px] bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35)] border border-slate-200/90 p-3 animate-in fade-in zoom-in-95 duration-150 text-slate-800 select-none"
            >
              {/* Header: SKU, Copy & Đóng */}
              <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                  <span className="font-mono font-black text-xs text-blue-700 truncate" title={sku}>
                    {sku}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopySku}
                    title="Sao chép mã SKU"
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Đóng"
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 text-xs transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Khung hiển thị ảnh sản phẩm 244x244px */}
              <div className="relative w-full h-[244px] bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center group/img">
                {imageState.status === 'loading' && (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                    <span className="text-[11px] font-medium text-slate-500">Đang tải ảnh WMS...</span>
                  </div>
                )}

                {imageState.status === 'loaded' && imageState.imageUrl && (
                  <>
                    <img
                      src={imageState.imageUrl}
                      alt={sku}
                      className="w-full h-full object-contain p-1.5 transition-transform duration-200 group-hover/img:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="px-2 py-1 rounded bg-white/90 hover:bg-white text-slate-800 text-[10px] font-bold shadow-xs flex items-center gap-1 transition-transform active:scale-95"
                        title="Phóng to ảnh"
                      >
                        <ZoomIn className="w-3 h-3 text-blue-600" />
                        <span>Xem lớn</span>
                      </button>
                      <a
                        href={imageState.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-white/90 hover:bg-white text-slate-800 shadow-xs transition-transform active:scale-95"
                        title="Mở tab mới"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-700" />
                      </a>
                    </div>
                  </>
                )}

                {(imageState.status === 'none' || imageState.status === 'error') && (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-slate-300 p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">Chưa có ảnh trên WMS</span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {imageState.productId ? `ID: ${imageState.productId}` : 'Chưa định danh'}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer: Tiêu đề sản phẩm tóm tắt */}
              {productTitle && (
                <p
                  className="mt-2 text-[11px] text-slate-600 font-medium line-clamp-2 leading-tight px-0.5"
                  title={productTitle}
                >
                  {productTitle}
                </p>
              )}
            </div>
          ),
          document.body
        )}

      {/* Lightbox Modal phóng to ảnh cực lớn */}
      {isLightboxOpen && imageState.imageUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div
              className="relative max-w-2xl w-full bg-white rounded-3xl p-5 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-mono font-black text-lg text-slate-900">{sku}</h3>
                  {productTitle && <p className="text-xs text-slate-500 line-clamp-1">{productTitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="w-full h-[480px] bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center p-2 border border-slate-100">
                <img
                  src={imageState.imageUrl}
                  alt={sku}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-xs"
                />
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span className="font-mono text-[11px]">YunWMS Product ID: {imageState.productId || 'N/A'}</span>
                <a
                  href={imageState.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở ảnh gốc</span>
                </a>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default SkuHoverImage;
