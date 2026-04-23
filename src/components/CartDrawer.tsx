import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Loader2, Mail } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

const CartDrawer: React.FC = () => {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, totalPrice, totalItems } = useCart();
  const { user } = useAuth();
  const { settings } = useTheme();
  
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const freeShippingThreshold = settings.freeDeliveryThreshold || 30000;
  const progress = Math.min((totalPrice / freeShippingThreshold) * 100, 100);
  const remaining = freeShippingThreshold - totalPrice;

  const handleCheckout = async () => {
    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('flow-create-payment', {
        body: {
          items: cart,
          email: email,
          total: totalPrice,
          userId: user?.id
        }
      });

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Error initiating payment:', err);
      setError('Hubo un error al iniciar el pago. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && setIsCartOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 2000
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '450px',
              backgroundColor: '#fff',
              zIndex: 2001,
              boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: '24px', 
              borderBottom: '1px solid #f0f0f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShoppingBag size={24} color="var(--primary)" />
                <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Tu Carrito ({totalItems})</h2>
              </div>
              <button 
                onClick={() => !loading && setIsCartOpen(false)}
                style={{ 
                  padding: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Free Shipping Progress */}
            <div style={{ padding: '20px 24px', backgroundColor: '#fafafa' }}>
              <div style={{ fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                {remaining > 0 ? (
                  <>Te faltan <span style={{ fontWeight: '700', color: 'var(--primary)' }}>${remaining.toLocaleString('es-CL')}</span> para despacho gratis</>
                ) : (
                  <span style={{ color: '#059669', fontWeight: '700' }}>¡Tienes despacho gratis! 🎉</span>
                )}
              </div>
              <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  style={{ 
                    height: '100%', 
                    backgroundColor: remaining > 0 ? 'var(--primary)' : '#059669',
                    borderRadius: '3px'
                  }} 
                />
              </div>
            </div>

            {/* Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
              {cart.length === 0 ? (
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '20px',
                  color: '#999'
                }}>
                  <ShoppingBag size={64} strokeWidth={1} />
                  <p style={{ fontSize: '16px' }}>Tu carrito está vacío</p>
                  <button 
                    className="btn-primary" 
                    onClick={() => setIsCartOpen(false)}
                    style={{ padding: '12px 24px' }}
                  >
                    Ir a comprar
                  </button>
                </div>
              ) : (
                <div style={{ padding: '24px 0' }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      marginBottom: '24px',
                      paddingBottom: '24px',
                      borderBottom: '1px solid #f9f9f9'
                    }}>
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '8px', 
                        border: '1px solid #f0f0f0',
                        overflow: 'hidden',
                        padding: '8px',
                        backgroundColor: '#fff'
                      }}>
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', lineHeight: '1.4' }}>{item.name}</h4>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>
                          ${item.price.toLocaleString('es-CL')} CLP
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            border: '1px solid #ddd', 
                            borderRadius: '4px',
                            backgroundColor: '#fff'
                          }}>
                            <button 
                              onClick={() => updateQuantity(item.id, 'dec')}
                              disabled={loading}
                              style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ width: '30px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 'inc')}
                              disabled={loading}
                              style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            disabled={loading}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            {cart.length > 0 && (
              <div style={{ padding: '24px', borderTop: '1px solid #f0f0f0', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
                {/* Email Section */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#444' }}>
                    Correo para confirmación
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input 
                      type="email" 
                      placeholder="ejemplo@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '12px 16px 12px 40px',
                        borderRadius: '8px',
                        border: error ? '1px solid #ef4444' : '1px solid #ddd',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                    />
                  </div>
                  {error && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{error}</p>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#666', fontSize: '14px' }}>Subtotal</span>
                  <span style={{ fontWeight: '600' }}>${totalPrice.toLocaleString('es-CL')} CLP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ color: '#666', fontSize: '14px' }}>Despacho</span>
                  <span style={{ color: remaining > 0 ? '#000' : '#059669', fontSize: '14px', fontWeight: '600' }}>
                    {remaining > 0 ? 'Calculado en el checkout' : '¡GRATIS!'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '18px', fontWeight: '800' }}>Total</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>
                      ${totalPrice.toLocaleString('es-CL')} CLP
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>IVA incluido</div>
                  </div>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={handleCheckout}
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    fontSize: '16px', 
                    gap: '12px',
                    opacity: loading ? 0.8 : 1
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <span>Finalizar Compra</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
