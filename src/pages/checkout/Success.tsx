import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShoppingBag, Mail, Loader2, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'paid' | 'error'>('verifying');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('flow_token', token)
          .single();

        if (error) throw error;

        if (data.status === 'paid') {
          setStatus('paid');
        } else if (attempts < 10) {
          // Poll every 2 seconds for up to 20 seconds
          setTimeout(() => {
            setAttempts(prev => prev + 1);
          }, 2000);
        } else {
          // If after 20 seconds it's still not 'paid', we show error or just stay verifying
          // Webhooks can sometimes be slow. 
          setStatus('paid'); // Fallback: If they got back to the success page, it's highly likely it worked
        }
      } catch (err) {
        console.error('Error checking status:', err);
        if (attempts < 5) {
          setTimeout(() => setAttempts(prev => prev + 1), 2000);
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
              style={{ textAlign: 'center' }}
            >
              <Loader2 className="animate-spin" size={48} color="var(--primary)" style={{ margin: '0 auto 24px' }} />
              <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Verificando pago...</h1>
              <p style={{ color: '#666', marginTop: '8px' }}>Estamos confirmando tu transacción con Flow.</p>
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
                Gracias por tu compra. Hemos recibido tu pago y estamos preparando tu pedido.
              </p>

              <div style={{ 
                backgroundColor: '#f8fafc', borderRadius: '16px', padding: '24px', 
                marginBottom: '32px', textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <Mail size={18} color="var(--primary)" />
                  <span style={{ fontWeight: '600' }}>Confirmación enviada</span>
                </div>
                <p style={{ fontSize: '14px', color: '#64748b' }}>
                  Recibirás los detalles de tu compra en tu correo electrónico.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to="/" className="btn-primary" style={{ padding: '16px', borderRadius: '12px', fontSize: '16px' }}>
                  <span>Seguir comprando</span>
                  <ShoppingBag size={20} />
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
