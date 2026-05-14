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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-green-600 mb-4" size={48} />
        <p className="text-slate-600 font-bold">Cargando Pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="text-red-500" size={40} />
        </div>
        <h1 className="text-slate-900 text-2xl font-black mb-2">Pedido no encontrado</h1>
        <p className="text-slate-500 mb-8">El código QR no parece ser válido o el pedido ya no existe.</p>
        <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header Estilo WhatsApp */}
      <div className="bg-[#075e54] text-white p-6 pt-12 rounded-b-[2.5rem] shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl leading-none">Charly Home</h1>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">Confirmación de Entrega</p>
            </div>
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black border border-white/20">
            #{order.id.slice(0, 8).toUpperCase()}
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 -mt-6 space-y-6">
        {/* Resumen Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-tighter">Cliente</p>
                <p className="text-slate-900 font-black text-base">{order.shipping_details?.fullName}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-tighter">Dirección</p>
                <p className="text-slate-900 font-bold text-sm leading-tight">{order.shipping_details?.address}</p>
                <p className="text-slate-500 text-xs font-medium">{order.shipping_details?.comuna}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
               <p className="text-slate-400 text-[9px] font-black uppercase tracking-tighter mb-2">Productos ({order.items.length})</p>
               <div className="space-y-2">
                 {order.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center text-sm">
                     <span className="text-slate-700 font-bold flex items-center gap-2">
                       <Package size={14} className="text-slate-300" /> {item.name}
                     </span>
                     <span className="text-slate-900 font-black ml-2 px-2 py-0.5 bg-slate-100 rounded-md text-xs">x{item.quantity}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Inputs Form */}
        <div className="space-y-4 px-2">
          <div className="space-y-1.5">
            <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-2 block">
              Nombre de quien recibe
            </label>
            <input 
              type="text" 
              placeholder="Nombre Apellido"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 focus:border-[#25d366] rounded-2xl py-4 px-6 text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-2 block">
              RUT de quien recibe
            </label>
            <input 
              type="text" 
              placeholder="12.345.678-9"
              value={receiverRut}
              onChange={(e) => setReceiverRut(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 focus:border-[#25d366] rounded-2xl py-4 px-6 text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleConfirmDelivery}
              disabled={submitting}
              className="w-full bg-[#25d366] hover:bg-[#128c7e] disabled:opacity-50 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-green-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              style={{ boxShadow: '0 20px 40px -10px rgba(37, 211, 102, 0.4)' }}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle size={18} />
                  </div>
                  <span className="text-lg">NOTIFICAR ENTREGA</span>
                </>
              )}
            </button>
            <p className="text-center text-slate-400 text-[10px] font-bold mt-4 uppercase tracking-widest">
              Al confirmar se abrirá WhatsApp con el mensaje listo
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-8 text-center text-slate-300 text-[9px] font-black uppercase tracking-[0.2em]">
        Charly Home Delivery • Engine v1.1
      </footer>
    </div>
  );
};

export default DeliveryPortal;
