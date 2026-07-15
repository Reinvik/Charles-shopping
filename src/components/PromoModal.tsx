import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { X, MessageCircle, ShoppingBag, Star, Check } from 'lucide-react';
import { toast } from 'sonner';

// Helper to convert any text to slug
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // remove accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // remove all non-word chars
    .replace(/--+/g, '-') // replace multiple hyphens
    .replace(/^-+/, '') // trim leading hyphens
    .replace(/-+$/, ''); // trim trailing hyphens
};

const isVideoUrl = (url: string) => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
};

const isYouTubeUrl = (url: string) => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const getYouTubeEmbedUrl = (url: string) => {
  let videoId = '';
  try {
    if (url.includes('youtube.com/watch')) {
      const u = new URL(url);
      videoId = u.searchParams.get('v') || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || '';
    }
  } catch (e) {
    console.error('Error parsing YouTube URL:', e);
  }
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
};

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  image_url: string;
  images: string[];
  stock: number;
  discount_badge?: string;
  is_on_offer: boolean;
}

export const PromoModal: React.FC = () => {
  const { tenant } = useTenant();
  const { addToCart } = useCart();
  const { settings } = useTheme();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const checkPromo = async () => {
      if (!tenant) return;
      
      const hostname = window.location.hostname;
      const searchParams = new URLSearchParams(window.location.search);
      const promoParam = searchParams.get('promo');
      
      let promoSlug = '';

      // 1. Detect promo from query parameter
      if (promoParam) {
        promoSlug = promoParam;
      } 
      // 2. Detect promo from subdomain (e.g. guante-atrapa-pelo.charlyhome.cl)
      else {
        const parts = hostname.split('.');
        // Check if there is a subdomain
        if (parts.length > 2) {
          const subdomain = parts[0];
          // Filter out standard/management subdomains
          if (subdomain !== 'www' && subdomain !== 'admin' && subdomain !== 'localhost' && subdomain !== tenant.slug) {
            promoSlug = subdomain;
          }
        }
      }

      if (!promoSlug) return;

      try {
        // Fetch all active products for the tenant to match the slugified name
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true);

        if (error) throw error;

        if (data) {
          // Find product matching slugified name
          const matchedProduct = data.find(p => slugify(p.name) === slugify(promoSlug)) as Product;
          
          if (matchedProduct) {
            setProduct(matchedProduct);
            setSelectedImage(matchedProduct.image_url);
            setIsVisible(true);
          }
        }
      } catch (err) {
        console.error('Error fetching promo product:', err);
      }
    };

    checkPromo();
  }, [tenant]);

  if (!product || !isVisible) return null;

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      original_price: product.original_price ? Number(product.original_price) : undefined,
      image: product.image_url
    }, quantity);
    
    toast.success(`${product.name} añadido al carrito`);
    setIsVisible(false); // Close modal
  };

  const handleBuyWhatsapp = () => {
    if (!settings.contactWhatsapp) {
      toast.error('WhatsApp no configurado en la tienda');
      return;
    }
    
    const cleanPhone = settings.contactWhatsapp.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `¡Hola! Vengo de la promoción de *${product.name}*.\n` +
      `Me interesa comprar ${quantity} unidad(es).\n` +
      `Precio promoción: $${Number(product.price).toLocaleString('es-CL')}`
    );
    
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // Safe pricing calculation
  const currentPrice = Number(product.price);
  const originalPrice = product.original_price ? Number(product.original_price) : null;
  const saving = originalPrice ? originalPrice - currentPrice : 0;

  return (
    <div className="promo-overlay">
      <div className="promo-modal-card">
        
        {/* Close Button */}
        <button className="promo-close-btn" onClick={() => setIsVisible(false)} aria-label="Cerrar">
          <X size={20} />
        </button>

        <div className="promo-modal-grid">
          
          {/* Left Column: Image Gallery */}
          <div className="promo-gallery-section">
            <div className="promo-main-image-wrapper">
              {isVideoUrl(selectedImage) ? (
                <video 
                  src={selectedImage} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="promo-main-video" 
                />
              ) : isYouTubeUrl(selectedImage) ? (
                <iframe
                  src={getYouTubeEmbedUrl(selectedImage)}
                  title="Product Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="promo-main-iframe"
                />
              ) : (
                <img src={selectedImage} alt={product.name} className="promo-main-image" />
              )}
              {product.discount_badge && (
                <span className="promo-discount-badge">{product.discount_badge}</span>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="promo-thumbnails-wrapper">
                {product.images.map((img, i) => {
                  const isVideo = isVideoUrl(img);
                  const isYT = isYouTubeUrl(img);
                  return (
                    <button 
                      key={i} 
                      className={`promo-thumb-btn ${selectedImage === img ? 'active' : ''}`}
                      onClick={() => setSelectedImage(img)}
                    >
                      {isVideo ? (
                        <div className="promo-thumb-placeholder">🎥 Video</div>
                      ) : isYT ? (
                        <div className="promo-thumb-placeholder">▶️ YouTube</div>
                      ) : (
                        <img src={img} alt={`Thumbnail ${i}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Information & Actions */}
          <div className="promo-info-section">
            <div className="promo-badge-tag">OFERTA EXCLUSIVA</div>
            
            <h2 className="promo-title">{product.name}</h2>
            
            {/* Social Proof */}
            <div className="promo-rating-row">
              <div className="promo-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#fbbf24" color="#fbbf24" />
                ))}
              </div>
              <span className="promo-reviews-count">4.9/5 (128 Valoraciones)</span>
            </div>

            {/* Pricing Box */}
            <div className="promo-price-box">
              <div className="promo-price-row">
                <span className="promo-current-price">${currentPrice.toLocaleString('es-CL')}</span>
                {originalPrice && (
                  <span className="promo-original-price">${originalPrice.toLocaleString('es-CL')}</span>
                )}
              </div>
              {saving > 0 && (
                <div className="promo-savings-label">
                  ¡Ahorras ${saving.toLocaleString('es-CL')} hoy!
                </div>
              )}
            </div>

            {/* High Converting bullet points */}
            <div className="promo-benefits-list">
              <div className="promo-benefit-item">
                <Check size={16} className="benefit-icon" />
                <span>Pasa la mano y los pelos desaparecen al tiro.</span>
              </div>
              <div className="promo-benefit-item">
                <Check size={16} className="benefit-icon" />
                <span>Sofás, ropa, alfombras y camas limpias en segundos.</span>
              </div>
              <div className="promo-benefit-item">
                <Check size={16} className="benefit-icon" />
                <span>Sin rodillos de repuesto ni pegotes adhesivos.</span>
              </div>
              <div className="promo-benefit-item">
                <Check size={16} className="benefit-icon" />
                <span>Apto para perros y gatos. ¡Funciona como un agradable masaje!</span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="promo-quantity-selector">
              <label>Cantidad:</label>
              <div className="quantity-controls">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="promo-action-buttons">
              <button className="promo-cta-primary" onClick={handleAddToCart}>
                <ShoppingBag size={20} />
                COMPRAR AHORA
              </button>
              
              {settings.contactWhatsapp && (
                <button className="promo-cta-whatsapp" onClick={handleBuyWhatsapp}>
                  <MessageCircle size={20} />
                  Pedir por WhatsApp
                </button>
              )}
            </div>

            <div className="promo-shipping-notice">
              ⚡ Despacho Express en 24/48 horas disponible
            </div>

          </div>

        </div>

      </div>

      <style>{`
        .promo-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: promo-fade-in 0.3s ease;
        }

        .promo-modal-card {
          background: white;
          width: 100%;
          max-width: 1050px;
          border-radius: 24px;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: promo-scale-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .promo-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f1f5f9;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 10;
        }

        .promo-close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
          transform: rotate(90deg);
        }

        .promo-modal-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          min-height: 550px;
        }

        /* Gallery */
        .promo-gallery-section {
          background: #f8fafc;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border-right: 1px solid #e2e8f0;
        }

        .promo-main-image-wrapper {
          position: relative;
          width: 100%;
          max-width: 480px;
          aspect-ratio: 1;
          border-radius: 16px;
          overflow: hidden;
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .promo-main-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .promo-main-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .promo-main-iframe {
          width: 100%;
          height: 100%;
          border: none;
          aspect-ratio: 1;
        }

        .promo-thumb-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e2e8f0;
          color: #475569;
          font-size: 9px;
          font-weight: bold;
          text-align: center;
          padding: 2px;
          line-height: 1.1;
        }

        .promo-discount-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: #ff3b30;
          color: white;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(255, 59, 48, 0.2);
        }

        .promo-thumbnails-wrapper {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          width: 100%;
          max-width: 480px;
          justify-content: center;
        }

        .promo-thumb-btn {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          border: 2px solid transparent;
          overflow: hidden;
          background: white;
          cursor: pointer;
          padding: 0;
          transition: border-color 0.2s;
        }

        .promo-thumb-btn.active {
          border-color: var(--primary);
        }

        .promo-thumb-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Info Section */
        .promo-info-section {
          padding: 32px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .promo-badge-tag {
          font-size: 11px;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }

        .promo-title {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .promo-rating-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .promo-stars {
          display: flex;
        }

        .promo-reviews-count {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }

        .promo-price-box {
          background: #fdf2f2;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #fee2e2;
          margin-bottom: 20px;
        }

        .promo-price-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .promo-current-price {
          font-size: 32px;
          font-weight: 900;
          color: #ff3b30;
        }

        .promo-original-price {
          font-size: 16px;
          text-decoration: line-through;
          color: #94a3b8;
          font-weight: 600;
        }

        .promo-savings-label {
          font-size: 12px;
          color: #15803d;
          font-weight: 700;
          margin-top: 4px;
        }

        .promo-benefits-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .promo-benefit-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: #334155;
          line-height: 1.4;
        }

        .benefit-icon {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .promo-quantity-selector {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .promo-quantity-selector label {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
        }

        .quantity-controls button {
          border: none;
          background: #f8fafc;
          width: 32px;
          height: 32px;
          font-size: 16px;
          font-weight: bold;
          color: #334155;
          cursor: pointer;
          transition: background 0.2s;
        }

        .quantity-controls button:hover {
          background: #e2e8f0;
        }

        .quantity-controls span {
          width: 40px;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }

        .promo-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .promo-cta-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: var(--primary);
          color: white;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
          transition: all 0.2s;
          animation: promo-pulse 2s infinite;
        }

        .promo-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(var(--primary-rgb), 0.4);
        }

        .promo-cta-whatsapp {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: #25d366;
          color: white;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.25);
          transition: all 0.2s;
        }

        .promo-cta-whatsapp:hover {
          background: #128c7e;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(18, 140, 126, 0.35);
        }

        .promo-shipping-notice {
          text-align: center;
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          margin-top: 12px;
        }

        @keyframes promo-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes promo-scale-up {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes promo-pulse {
          0% { box-shadow: 0 4px 12px rgba(230, 0, 0, 0.3); }
          50% { box-shadow: 0 4px 20px rgba(230, 0, 0, 0.5); }
          100% { box-shadow: 0 4px 12px rgba(230, 0, 0, 0.3); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .promo-modal-card {
            border-radius: 20px;
          }
          .promo-modal-grid {
            grid-template-columns: 1fr;
          }
          .promo-gallery-section {
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
            padding: 20px;
          }
          .promo-info-section {
            padding: 24px;
          }
          .promo-title {
            font-size: 20px;
          }
        }
      `}</style>

    </div>
  );
};
