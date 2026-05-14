import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Package, User, CreditCard, MessageCircle, CheckCircle2, AlertCircle, ShoppingBag, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  items: any[];
  status: string;
  shipping_details: {
    fullName: string;
    phone: string;
    address: string;
    comuna: string;
  };
}

const DeliveryPortal = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [receiverRut, setReceiverRut] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!orderId) return;
        
        let cleanId = orderId.trim();
        if (cleanId.startsWith('charlyhome-order-')) {
          cleanId = cleanId.replace('charlyhome-order-', '');
        }

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', cleanId)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (error: any) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleConfirmDelivery = async () => {
    if (!receiverName || !receiverRut) {
      toast.error('Por favor ingresa nombre y RUT');
      return;
    }

    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('orders')
        .update({ is_delivered: true })
        .eq('id', order?.id);

      if (error) throw error;

      const productList = order?.items.map((item: any) => `- ${item.name}`).join('\n');
      const clientName = order?.shipping_details?.fullName || 'Cliente';
      const phone = order?.shipping_details?.phone.replace(/\D/g, '') || '';
      
      const message = `Hola ${clientName}, te informamos que el pedido ha sido recibido con éxito:\n${productList}\n\nRecibido por: ${receiverName}\nRut: ${receiverRut}\n\n¡Gracias por confiar en Charly Home!`;
      
      const whatsappUrl = `https://wa.me/${phone.startsWith('56') ? phone : '56' + phone}?text=${encodeURIComponent(message)}`;
      
      window.location.href = whatsappUrl;
      setCompleted(true);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Loader2 className="animate-spin" size={48} color="#075e54" />
        <p style={{ color: '#475569', fontWeight: '800', marginTop: '16px', fontFamily: 'sans-serif' }}>Cargando Pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <AlertCircle style={{ color: '#ef4444' }} size={40} />
        </div>
        <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>Pedido no encontrado</h1>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>El código QR no parece ser válido o el pedido ya no existe.</p>
        <button onClick={() => window.location.reload()} style={{ backgroundColor: '#0f172a', color: 'white', padding: '12px 32px', borderRadius: '12px', fontWeight: '700' }}>Reintentar</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', sans-serif", paddingBottom: '40px' }}>
      {/* Header Premium */}
      <div style={{ backgroundColor: '#075e54', color: 'white', padding: '48px 24px 32px', borderRadius: '0 0 40px 40px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 style={{ color: 'white', fontWeight: '900', fontSize: '20px', margin: 0, lineHeight: 1 }}>Charly Home</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '6px' }}>Confirmación de Entrega</p>
            </div>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', border: '1px solid rgba(255,255,255,0.2)' }}>
            #{order.id.slice(0, 8).toUpperCase()}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '480px', margin: '-24px auto 0', padding: '0 16px' }}>
        {/* Info Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', margin: '0 0 2px' }}>Cliente</p>
                <p style={{ color: '#0f172a', fontWeight: '900', fontSize: '16px', margin: 0 }}>{order.shipping_details?.fullName}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#fffbeb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={18} style={{ color: '#d97706' }} />
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', margin: '0 0 2px' }}>Dirección</p>
                <p style={{ color: '#0f172a', fontWeight: '700', fontSize: '14px', margin: 0, lineHeight: 1.3 }}>{order.shipping_details?.address}</p>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '2px 0 0' }}>{order.shipping_details?.comuna}</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
               <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', margin: '0 0 12px' }}>Productos ({order.items.length})</p>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 {order.items.map((item, idx) => (
                   <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                     <span style={{ color: '#334155', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <Package size={14} style={{ color: '#cbd5e1' }} /> {item.name}
                     </span>
                     <span style={{ color: '#0f172a', fontWeight: '900', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>x{item.quantity}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '8px', marginBottom: '8px', display: 'block' }}>Nombre de quien recibe</label>
            <input 
              type="text" 
              placeholder="Ej: Juan Pérez"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              style={{ width: '100%', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px', fontSize: '16px', fontWeight: '700', color: '#0f172a', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#25d366'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div>
            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '8px', marginBottom: '8px', display: 'block' }}>RUT de quien recibe</label>
            <input 
              type="text" 
              placeholder="Ej: 12.345.678-9"
              value={receiverRut}
              onChange={(e) => setReceiverRut(e.target.value)}
              style={{ width: '100%', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px', fontSize: '16px', fontWeight: '700', color: '#0f172a', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#25d366'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          <button
            onClick={handleConfirmDelivery}
            disabled={submitting}
            style={{ 
              width: '100%', 
              backgroundColor: '#25d366', 
              color: 'white', 
              border: 'none', 
              borderRadius: '32px', 
              padding: '20px', 
              fontWeight: '900', 
              fontSize: '18px', 
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              marginTop: '12px',
              boxShadow: '0 15px 35px rgba(37, 211, 102, 0.3)',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <MessageCircle size={24} />
                CONFIRMAR ENTREGA
              </>
            )}
          </button>
          
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
            Se actualizará el sistema y se abrirá WhatsApp
          </p>
        </div>
      </main>

      <footer style={{ marginTop: '40px', textAlign: 'center', color: '#cbd5e1', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
        Charly Home Delivery Engine v1.2
      </footer>
    </div>
  );
};

export default DeliveryPortal;
