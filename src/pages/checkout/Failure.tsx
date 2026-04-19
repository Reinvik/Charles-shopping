import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, MessageCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const CheckoutFailure: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ 
            maxWidth: '600px', 
            width: '100%', 
            textAlign: 'center',
            backgroundColor: '#fff',
            padding: '48px',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
            border: '1px solid #fee2e2'
          }}
        >
          <motion.div
            initial={{ rotate: -20, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: '#ef4444', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}
          >
            <AlertCircle size={48} color="#fff" />
          </motion.div>

          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px', color: '#1e293b' }}>
            Algo salió mal
          </h1>
          
          <p style={{ color: '#64748b', fontSize: '18px', marginBottom: '32px', lineHeight: '1.6' }}>
            No pudimos procesar tu pago en este momento. Esto puede deberse a fondos insuficientes, problemas con la red o cancelación de la transacción.
          </p>

          <div style={{ 
            backgroundColor: '#fff5f5', 
            borderRadius: '16px', 
            padding: '24px', 
            marginBottom: '32px',
            textAlign: 'left',
            border: '1px solid #fecaca'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#991b1b' }}>¿Qué puedes hacer?</h3>
            <ul style={{ fontSize: '14px', color: '#991b1b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ display: 'flex', gap: '8px' }}>• Verifica que tu tarjeta tenga cupo disponible.</li>
              <li style={{ display: 'flex', gap: '8px' }}>• Asegúrate de que los datos ingresados sean correctos.</li>
              <li style={{ display: 'flex', gap: '8px' }}>• Intenta nuevamente con otro método de pago.</li>
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <button 
              onClick={() => window.history.back()}
              className="btn-primary" 
              style={{ padding: '16px', borderRadius: '12px', fontSize: '15px', backgroundColor: '#1e293b' }}
            >
              <ArrowLeft size={18} />
              <span>Reintentar</span>
            </button>
            
            <a 
              href="https://wa.me/569XXXXXXXX" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                padding: '16px', 
                borderRadius: '12px', 
                fontSize: '15px',
                border: '1px solid #ddd',
                fontWeight: '600'
              }}
            >
              <MessageCircle size={18} />
              <span>Ayuda WhatsApp</span>
            </a>
          </div>

          <Link to="/" style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
            Volver a la tienda
          </Link>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutFailure;
