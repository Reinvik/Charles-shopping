import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../context/ThemeContext';

interface Order {
  id: string;
  items: any[];
  status: string;
  customer_email?: string;
  shipping_details?: {
    fullName?: string;
    phone?: string;
    address?: string;
    comuna?: string;
  };
}

const DeliveryPortal = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [receiverRut, setReceiverRut] = useState('');
  const { settings } = useTheme();

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
      
      const newStatus = `Entregado a ${receiverName} Rut ${receiverRut}`;
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          is_delivered: true,
          status: newStatus,
          delivery_status: 'Entregado'
        })
        .eq('id', order?.id);

      if (error) throw error;

      const productList = order?.items?.map((item: any) => `- ${item.name || 'Producto'}`).join('\n') || '';
      const clientName = order?.shipping_details?.fullName || order?.customer_email || 'Cliente';
      const rawPhone = order?.shipping_details?.phone || '';
      const phone = rawPhone.replace(/\D/g, '') || '';
      
      const message = `Hola ${clientName}, te informamos que el pedido ha sido recibido con éxito:\n${productList}\n\nRecibido por: ${receiverName}\nRut: ${receiverRut}\n\n¡Gracias por confiar en ${settings.siteName}!`;
      
      if (phone) {
        const whatsappUrl = `https://wa.me/${phone.startsWith('56') ? phone : '56' + phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      } else {
        toast.warning('No se encontró teléfono para enviar WhatsApp');
      }
      
      toast.success('¡Entrega confirmada!');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={40} color="green" />
        <p style={{ color: 'black', marginTop: '10px', fontWeight: 'bold' }}>Cargando...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <AlertCircle color="red" size={50} />
        <h1 style={{ color: 'black', marginTop: '20px' }}>No se encontró el pedido</h1>
        <p style={{ color: 'grey' }}>ID: {orderId}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f0', color: 'black', fontFamily: 'sans-serif', paddingBottom: '50px' }}>
      
      <style>{`
        #root { color: black !important; }
        input { color: black !important; background-color: white !important; border: 1px solid #ccc !important; }
        span, p, h1, h2, label { color: black !important; }
      `}</style>

      <div style={{ backgroundColor: settings.primaryColor || '#E60000', padding: '40px 20px', color: 'white', textAlign: 'center', borderRadius: '0 0 30px 30px', boxShadow: `0 4px 15px ${settings.primaryColor}33` }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: '900', letterSpacing: '1px' }}>{settings.siteName.toUpperCase()}</h1>
        <p style={{ color: 'white', opacity: 0.9, fontSize: '12px', fontWeight: 'bold', marginTop: '5px', letterSpacing: '2px' }}>CONFIRMACIÓN DE ENTREGA</p>
      </div>

      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'grey', marginBottom: '5px' }}>CLIENTE</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px' }}>{order.shipping_details?.fullName || order.customer_email || 'Cliente'}</p>
          <p style={{ fontSize: '14px', color: '#444', margin: 0 }}>{order.shipping_details?.address || 'Sin dirección'}</p>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'grey', marginBottom: '10px' }}>PRODUCTOS</p>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
              <span style={{ fontSize: '14px' }}>{item.name}</span>
              <span style={{ fontWeight: 'bold' }}>x{item.quantity}</span>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #ddd' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'grey', display: 'block', marginBottom: '5px' }}>NOMBRE DE QUIEN RECIBE</label>
            <input 
              type="text" 
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'grey', display: 'block', marginBottom: '5px' }}>RUT DE QUIEN RECIBE</label>
            <input 
              type="text" 
              value={receiverRut}
              onChange={(e) => setReceiverRut(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '16px' }}
            />
          </div>

          <button 
            onClick={handleConfirmDelivery}
            disabled={submitting}
            style={{ 
              width: '100%', 
              backgroundColor: '#25d366', 
              color: 'white', 
              padding: '18px', 
              borderRadius: '10px', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {submitting ? 'Enviando...' : 'ENVIAR MENSAJE WHATSAPP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPortal;
