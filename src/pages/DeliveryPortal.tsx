import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Package, User, MessageCircle, AlertCircle, ShoppingBag, MapPin } from 'lucide-react';
import { toast } from 'sonner';

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

      const productList = order?.items?.map((item: any) => `- ${item.name || 'Producto'}`).join('\n') || '';
      const clientName = order?.shipping_details?.fullName || order?.customer_email || 'Cliente';
      const rawPhone = order?.shipping_details?.phone || '';
      const phone = rawPhone.replace(/\D/g, '') || '';
      
      const message = `Hola ${clientName}, te informamos que el pedido ha sido recibido con éxito:\n${productList}\n\nRecibido por: ${receiverName}\nRut: ${receiverRut}\n\n¡Gracias por confiar en Charly Home!`;
      
      // Intentar abrir WhatsApp
      if (phone) {
        const whatsappUrl = `https://wa.me/${phone.startsWith('56') ? phone : '56' + phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      } else {
        toast.warning('No se encontró teléfono para enviar WhatsApp, pero el pedido fue marcado como entregado.');
      }
      
      toast.success('¡Entrega confirmada con éxito!');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Loader2 className="animate-spin" size={48} color="#075e54" />
        <p style={{ color: '#000000', fontWeight: 'bold', marginTop: '16px' }}>Cargando Pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <AlertCircle style={{ color: '#ef4444', marginBottom: '20px' }} size={60} />
        <h1 style={{ color: '#000000', fontSize: '24px', fontWeight: 'bold' }}>Pedido no encontrado</h1>
        <p style={{ color: '#666666' }}>Verifica el código QR.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '50px' }}>
      
      {/* Header Fijo */}
      <div style={{ width: '100%', backgroundColor: '#075e54', padding: '40px 20px 20px', textAlign: 'center', color: 'white', borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900' }}>CHARLY HOME</h1>
        <p style={{ margin: '5px 0 0', opacity: 0.8, fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>SISTEMA DE ENTREGAS v2.0</p>
      </div>

      <div style={{ width: '90%', maxWidth: '450px', marginTop: '20px' }}>
        
        {/* Card de Información del Pedido */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
            <span style={{ fontWeight: 'bold', color: '#666', fontSize: '12px' }}>PEDIDO</span>
            <span style={{ fontWeight: '900', color: '#075e54' }}>#{order.id.slice(0,8).toUpperCase()}</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#000', marginBottom: '5px' }}>
              <User size={18} color="#075e54" />
              <span style={{ fontWeight: 'bold' }}>{order.shipping_details?.fullName || 'No especificado'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666', fontSize: '14px' }}>
              <MapPin size={16} />
              <span>{order.shipping_details?.address || 'Sin dirección'}, {order.shipping_details?.comuna || ''}</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#f9f9f9', borderRadius: '12px', padding: '12px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 'bold', color: '#999' }}>PRODUCTOS</p>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', color: '#333' }}>
                <span style={{ fontWeight: '600' }}>• {item.name || 'Producto'}</span>
                <span style={{ fontWeight: 'bold' }}>x{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Formulario de Entrada */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px', marginLeft: '5px' }}>NOMBRE DE QUIEN RECIBE</label>
            <input 
              type="text" 
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Escribe el nombre aquí..."
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid #f0f0f0', fontSize: '16px', fontWeight: 'bold', outline: 'none', backgroundColor: '#fcfcfc' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px', marginLeft: '5px' }}>RUT DE QUIEN RECIBE</label>
            <input 
              type="text" 
              value={receiverRut}
              onChange={(e) => setReceiverRut(e.target.value)}
              placeholder="Escribe el RUT aquí..."
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid #f0f0f0', fontSize: '16px', fontWeight: 'bold', outline: 'none', backgroundColor: '#fcfcfc' }}
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
              borderRadius: '15px', 
              fontSize: '18px', 
              fontWeight: '900', 
              border: 'none', 
              boxShadow: '0 8px 15px rgba(37, 211, 102, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {submitting ? <Loader2 className="animate-spin" /> : (
              <>
                <MessageCircle size={22} />
                ENVIAR MENSAJE WSP
              </>
            )}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#bbb', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
          DESARROLLADO PARA CHARLY HOME
        </p>

      </div>
    </div>
  );
};

export default DeliveryPortal;
