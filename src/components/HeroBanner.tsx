import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  button_link: string;
}

interface HeroBannerProps {
  onCategorySelect?: (id: string | null) => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ onCategorySelect }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { tenant } = useTenant();

  useEffect(() => {
    const fetchBanners = async () => {
      if (!tenant) return;
      
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (data && data.length > 0) {
        setBanners(data);
      }
      setLoading(false);
    };

    fetchBanners();
  }, [tenant]);

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [banners.length]);

  const handleAction = async (link: string) => {
    if (!tenant) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(link)) {
      // Verificar si es un producto o una categoría
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', link)
        .eq('tenant_id', tenant.id)
        .single();
      
      if (product) {
        navigate(`/product/${link}`);
      } else {
        onCategorySelect?.(link);
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    } else if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else if (link === '/') {
      onCategorySelect?.(null);
    }
  };

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

  if (loading || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div className="hero-banner-container" style={{
      width: '100%',
      height: 'clamp(300px, 45vh, 450px)',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '24px',
      marginBottom: '32px',
      backgroundColor: '#f8f9fa'
    }}>
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentBanner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: 'pointer'
          }}
          onClick={() => handleAction(currentBanner.button_link)}
        >
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${currentBanner.image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          
          <div className="hero-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
          }}>
            <div className="hero-content" style={{ maxWidth: '550px' }}>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <span style={{
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '11px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  display: 'inline-block',
                  marginBottom: '16px',
                  boxShadow: '0 4px 10px rgba(var(--primary-rgb), 0.2)'
                }}>
                  Oferta Destacada
                </span>
                <h2 style={{
                  fontSize: 'clamp(28px, 8vw, 48px)',
                  fontWeight: '900',
                  color: '#111',
                  lineHeight: '1.1',
                  marginBottom: '14px',
                  letterSpacing: '-0.03em'
                }}>
                  {currentBanner.title}
                </h2>
                <p style={{
                  fontSize: 'clamp(14px, 3.5vw, 17px)',
                  color: '#444',
                  lineHeight: '1.5',
                  marginBottom: '24px',
                  fontWeight: '500'
                }}>
                  {currentBanner.subtitle}
                </p>
                
                <div style={{ display: 'flex', gap: '16px' }} onClick={(e) => e.stopPropagation()}>
                  {currentBanner.button_text && (
                    <button 
                      onClick={() => handleAction(currentBanner.button_link)}
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: '#fff',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontWeight: '800',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 10px 25px rgba(var(--primary-rgb), 0.25)',
                        transition: 'all 0.3s',
                        fontSize: 'clamp(12px, 3vw, 15px)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      {currentBanner.button_text}
                      <ShoppingBag size={18} />
                    </button>
                  )}

                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!tenant) return;
                      const { data } = await supabase
                        .from('categories')
                        .select('id')
                        .eq('slug', 'ofertas')
                        .eq('tenant_id', tenant.id)
                        .single();
                      if (data) onCategorySelect?.(data.id);
                    }}
                    style={{
                      backgroundColor: '#fff',
                      color: '#111',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: '800',
                      border: '2px solid #eee',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.3s',
                      fontSize: 'clamp(12px, 3vw, 15px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.color = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#eee';
                      e.currentTarget.style.color = '#111';
                    }}
                  >
                    Ver Ofertas
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.8)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 5,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)'}
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={nextSlide}
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.8)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 5,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)'}
          >
            <ChevronRight size={24} />
          </button>

          {/* Dots */}
          <div style={{
            position: 'absolute',
            bottom: '25px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            zIndex: 5
          }}>
            {banners.map((_, i) => (
              <div 
                key={i}
                onClick={() => setCurrentIndex(i)}
                style={{
                  width: currentIndex === i ? '30px' : '8px',
                  height: '8px',
                  borderRadius: '10px',
                  backgroundColor: currentIndex === i ? 'var(--primary)' : 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </div>
        </>
      )}
      <style>{`
        .hero-overlay {
          background: linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%);
          padding: 0 60px;
        }
        @media (max-width: 768px) {
          .hero-overlay {
            background: linear-gradient(0deg, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.3) 100%);
            padding: 0 24px;
            align-items: flex-end;
            padding-bottom: 40px;
          }
          .hero-content {
            text-align: center;
          }
          .hero-content div {
            justify-content: center;
          }
          .hero-banner-container {
            border-radius: 0;
            margin-left: -1rem;
            margin-right: -1rem;
            width: calc(100% + 2rem);
          }
        }
      `}</style>
    </div>
  );
};

export default HeroBanner;
