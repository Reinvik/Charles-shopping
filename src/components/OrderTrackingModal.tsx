import { useState } from 'react';
import { X, Package, Search, Truck, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderTrackingModal = ({ isOpen, onClose }: OrderTrackingModalProps) => {
  const { tenant } = useTenant();
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !tenant) return;

    try {
      setLoading(true);
      setError('');
      setOrder(null);
      
      let cleanId = orderId.trim();
      if (cleanId.startsWith('charlyhome-order-')) {
        cleanId = cleanId.replace('charlyhome-order-', '');
      }

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', cleanId)
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError('No se encontró ningún pedido con ese ID. Verifica e intenta nuevamente.');
      } else {
        setOrder(data);
      }
    } catch (err: any) {
      setError('Ocurrió un error al buscar el pedido: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (deliveryStatus: string) => {
    switch (deliveryStatus) {
      case 'Por preparar':
        return { icon: <Clock size={24} className="text-slate-400" />, text: 'Tu pedido está siendo procesado.', color: 'text-slate-600', bg: 'bg-slate-100' };
      case 'Preparado':
        return { icon: <Package size={24} className="text-amber-500" />, text: '¡Pedido preparado! Listo para despacho.', color: 'text-amber-600', bg: 'bg-amber-50' };
      case 'Despachado':
        return { icon: <Truck size={24} className="text-blue-500" />, text: '¡Va en camino! Tu pedido ha sido despachado.', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'Entregado':
        return { icon: <CheckCircle2 size={24} className="text-green-500" />, text: '¡Pedido entregado con éxito!', color: 'text-green-600', bg: 'bg-green-50' };
      default:
        return { icon: <Clock size={24} className="text-slate-400" />, text: 'Tu pedido está siendo procesado.', color: 'text-slate-600', bg: 'bg-slate-100' };
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '500px',
        padding: '30px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
        >
          <X size={24} color="#666" />
        </button>

        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Package className="text-primary" /> Rastrear Pedido
        </h2>
        
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '25px' }}>
          Ingresa el ID de tu pedido para conocer su estado actual. Lo puedes encontrar en el correo de confirmación.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              placeholder="Ej: f3b4..." 
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              style={{
                width: '100%', padding: '12px 15px 12px 40px', borderRadius: '12px', border: '2px solid #eee', fontSize: '16px', outline: 'none'
              }}
            />
            <Search size={20} color="#999" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button 
            type="submit"
            disabled={loading || !orderId.trim()}
            style={{
              backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', padding: '0 20px',
              fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && (
          <div style={{ padding: '15px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '10px', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {order && (
          <div style={{ border: '1px solid #eee', borderRadius: '15px', overflow: 'hidden' }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: '#f9f9f9' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#666', fontWeight: 'bold' }}>PEDIDO #{order.id.slice(0, 8)}</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}><strong>A nombre de:</strong> {order.shipping_details?.fullName || order.customer_email || 'Cliente'}</p>
            </div>
            
            {(() => {
              const statusData = getStatusDisplay(order.delivery_status || 'Por preparar');
              return (
                <div style={{ padding: '25px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'white' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }} className={statusData.bg}>
                    {statusData.icon}
                  </div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold' }} className={statusData.color}>
                    {order.delivery_status || 'Por preparar'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    {statusData.text}
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
