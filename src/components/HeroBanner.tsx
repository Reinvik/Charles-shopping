import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import heroImg from '../assets/hero_banner.png'; // We will copy the generated image here

const HeroBanner: React.FC = () => {
  return (
    <div style={{
      width: '100%',
      height: '450px',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '24px',
      marginBottom: '40px',
      backgroundColor: '#f8f9fa'
    }}>
      <motion.div 
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${heroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
      
      {/* Overlay for better text readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 60px'
      }}>
        <div style={{ maxWidth: '500px' }}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span style={{
              backgroundColor: 'var(--primary)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '100px',
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'inline-block',
              marginBottom: '16px'
            }}>
              Calidad Premium Garantizada
            </span>
            <h2 style={{
              fontSize: '48px',
              fontWeight: '900',
              color: '#1a1a1a',
              lineHeight: '1.1',
              marginBottom: '20px'
            }}>
              Todo lo que necesitas para tu <span style={{ color: 'var(--primary)' }}>Hogar y Empresa</span>
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#4a4a4a',
              lineHeight: '1.6',
              marginBottom: '32px'
            }}>
              Productos de aseo, papelería y más. Los mejores precios de la ciudad con despacho directo a tu puerta.
            </p>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <button style={{
                backgroundColor: 'var(--primary)',
                color: '#fff',
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)',
                transition: 'all 0.3s'
              }}>
                Comprar Ahora
                <ShoppingBag size={20} />
              </button>
              
              <button style={{
                backgroundColor: '#fff',
                color: '#333',
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: '700',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s'
              }}>
                Ver Ofertas
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
