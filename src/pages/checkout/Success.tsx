import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShoppingBag, Clock, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../context/CartContext';

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'paid' | 'pending' | 'rejected' | 'error'>('verifying');
  const [attempts, setAttempts] = useState(0);
  const { clearCart } = useCart();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const checkStatus = async () => {
      try {
        // Try to sync status directly with Flow (via our edge function) up to 3 times
        if (attempts < 3) {
          const { data: syncData } = await supabase.functions.invoke('flow-check-status', {
            body: { flowToken: token }
          });

          if (syncData?.order) {
            const orderStatus = syncData.order.status;
            if (orderStatus === 'paid') {
              setStatus('paid');
              clearCart();
              return;
            } else if (orderStatus === 'rejected') {
              setStatus('rejected');
              return;
            }
          }
        }

        // Fallback: check database directly
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('flow_token', token)
          .single();

        if (error) throw error;

        if (data.status === 'paid') {
          setStatus('paid');
          clearCart();
        } else if (data.status === 'rejected') {
          setStatus('rejected');
        } else if (attempts < 10) {
          // Poll every 3 seconds for up to 30 seconds
          setTimeout(() => {
            setAttempts(prev => prev + 1);
          }, 3000);
        } else {
          // After 10 attempts (~30s), show pending state — not success
          setStatus('pending');
        }
      } catch (err) {
        console.error('Error checking status:', err);
        if (attempts < 5) {
          setTimeout(() => setAttempts(prev => prev + 1), 3000);
        } else {
          setStatus('pending');
        }
      }
    };

    if (status === 'verifying') {
      checkStatus();
    }
  }, [token, attempts, status]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <AnimatePresence mode="wait">
          {status === 'verifying' ? (
            <motion.div 
              key="verifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', maxWidth: '400px' }}
            >
              <Loader2 className="animate-spin" size={48} color="var(--primary)" style={{ margin: '0 auto 24px' }} />
              <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Verificando pago...</h1>
              <p style={{ color: '#666', marginTop: '8px' }}>Estamos confirmando tu transacción con Flow.</p>
              {attempts > 0 && (
                <p style={{ color: '#999', fontSize: '13px', marginTop: '8px' }}>Intento {attempts}/10...</p>
              )}
            </motion.div>

          ) : status === 'paid' ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ 
                maxWidth: '600px', 
                width: '100%', 
                textAlign: 'center',
                backgroundColor: '#fff',
                padding: '48px',
                borderRadius: '24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.05)'
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                style={{ 
                  width: '80px', height: '80px', backgroundColor: '#059669', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', margin: '0 auto 24px'
                }}
              >
                <CheckCircle2 size={48} color="#fff" />
              </motion.div>

              <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>¡Pago Exitoso!</h1>
              
              <p style={{ color: '#666', fontSize: '18px', marginBottom: '32px', lineHeight: '1.6' }}>
                ¡Muchas gracias por tu compra! Hemos recibido tu pago con éxito. Recibirás la confirmación en tu correo y estaremos despachando tu pedido en las próximas horas.
              </p>

              <div style={{ 
                backgroundColor: '#f0fdf4', borderRadius: '16px', padding: '20px', 
                marginBottom: '32px', textAlign: 'left', border: '1px solid #bbf7d0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle2 size={18} color="#059669" />
                  <span style={{ fontWeight: '600', color: '#166534' }}>Confirmación enviada a tu correo</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to="/" className="btn-primary" style={{ padding: '16px', borderRadius: '12px', fontSize: '16px' }}>
                  <span>Seguir comprando</span>
                  <ShoppingBag size={20} />
                </Link>
              </div>
            </motion.div>

          ) : status === 'rejected' ? (
            <motion.div 
              key="rejected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ 
                textAlign: 'center', maxWidth: '500px', backgroundColor: '#fff',
                padding: '48px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{
                width: '80px', height: '80px', backgroundColor: '#fef2f2',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 24px', border: '2px solid #fca5a5'
              }}>
                <XCircle size={48} color="#dc2626" />
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626' }}>Pago Rechazado</h1>
              <p style={{ color: '#666', marginTop: '12px', lineHeight: '1.6' }}>
                Tu pago no pudo procesarse. Esto puede deberse a fondos insuficientes, datos incorrectos o rechazo por el banco. No se realizó ningún cargo.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
                <Link to="/" className="btn-primary" style={{ padding: '14px', borderRadius: '12px' }}>
                  Volver e intentar de nuevo
                </Link>
              </div>
            </motion.div>

          ) : status === 'pending' ? (
            <motion.div 
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ 
                textAlign: 'center', maxWidth: '500px', backgroundColor: '#fff',
                padding: '48px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{
                width: '80px', height: '80px', backgroundColor: '#fffbeb',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 24px', border: '2px solid #fcd34d'
              }}>
                <Clock size={48} color="#d97706" />
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#d97706' }}>Pago Pendiente</h1>
              <p style={{ color: '#666', marginTop: '12px', lineHeight: '1.6' }}>
                Tu pago está siendo procesado. Si completaste el pago en Flow, la confirmación llegará en unos minutos a tu correo electrónico. Si no completaste el pago, puedes volver e intentar de nuevo.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
                <Link to="/" className="btn-primary" style={{ padding: '14px', borderRadius: '12px' }}>
                  Volver al inicio
                </Link>
              </div>
            </motion.div>

          ) : (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center' }}
            >
              <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 24px' }} />
              <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Token no válido</h1>
              <p style={{ color: '#666', marginTop: '8px' }}>No pudimos encontrar la información de tu pago.</p>
              <Link to="/" className="btn-primary" style={{ marginTop: '24px' }}>Volver al inicio</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutSuccess;
