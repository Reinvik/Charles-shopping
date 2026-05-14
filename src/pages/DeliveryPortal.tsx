import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Package, User, CreditCard, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
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
        if (!orderId) {
          console.error('No orderId provided in URL');
          return;
        }
        
        // Limpiamos el ID y manejamos el formato viejo si existe
        let cleanId = orderId.trim();
        if (cleanId.startsWith('charlyhome-order-')) {
          cleanId = cleanId.replace('charlyhome-order-', '');
        }
        
        console.log('Buscando pedido con ID:', cleanId);

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', cleanId)
          .single();

        if (error) {
          console.error('Error de Supabase:', error);
          throw error;
        }
        
        if (!data) {
          console.warn('No se encontró data para el ID:', cleanId);
        }

        setOrder(data);
      } catch (error: any) {
        console.error('Error fetching order detail:', error);
        toast.error('Error al buscar el pedido: ' + (error.message || 'Desconocido'));
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
      
      // 1. Actualizar estado en Supabase
      const { error } = await supabase
        .from('orders')
        .update({ is_delivered: true })
        .eq('id', orderId);

      if (error) throw error;

      // 2. Generar mensaje de WhatsApp
      const productList = order?.items.map((item: any) => `- ${item.name}`).join('\n');
      const clientName = order?.shipping_details?.fullName || 'Cliente';
      const phone = order?.shipping_details?.phone.replace(/\D/g, '') || '';
      
      const message = `Hola ${clientName}, te informamos que el pedido ha sido recibido con éxito:\n${productList}\n\nRecibido por: ${receiverName}\nRut: ${receiverRut}\n\n¡Gracias por confiar en Charly Home!`;
      
      const whatsappUrl = `https://wa.me/${phone.startsWith('56') ? phone : '56' + phone}?text=${encodeURIComponent(message)}`;
      
      // 3. Abrir WhatsApp y mostrar éxito
      window.location.href = whatsappUrl;
      setCompleted(true);
      toast.success('¡Entrega confirmada!');
    } catch (error: any) {
      toast.error('Error al confirmar: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
        <p className="text-slate-400 font-medium">Cargando datos del pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-red-500 mb-4" size={60} />
        <h1 className="text-white text-2xl font-black mb-2">Pedido no encontrado</h1>
        <p className="text-slate-400">Verifica que el QR sea correcto.</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="text-green-500" size={40} />
        </div>
        <h1 className="text-white text-2xl font-black mb-2">¡Entrega Exitosa!</h1>
        <p className="text-slate-400 mb-8">El sistema ha sido actualizado y se abrió WhatsApp para notificar al cliente.</p>
        <button 
          onClick={() => window.close()}
          className="w-full max-w-xs bg-slate-800 text-white font-bold py-4 rounded-2xl"
        >
          Cerrar Ventana
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8 flex flex-col">
      <header className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Package className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-white font-black text-xl leading-none">Charly Home</h1>
          <p className="text-slate-400 text-xs mt-1 font-bold tracking-widest uppercase">Portal de Entrega</p>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full space-y-6">
        {/* Info del Pedido */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Pedido</p>
              <h2 className="text-white font-black text-lg">#{order.id.slice(0, 8).toUpperCase()}</h2>
            </div>
            <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black border border-blue-500/20">
              PAGADO
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-slate-400" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Cliente</p>
                <p className="text-white font-bold text-sm">{order.shipping_details?.fullName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package size={16} className="text-slate-400" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Productos</p>
                <div className="text-white text-xs space-y-1 mt-1 font-medium">
                  {order.items.map((item, idx) => (
                    <p key={idx}>• {item.name} <span className="text-slate-500 font-black">x{item.quantity}</span></p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario de Entrega */}
        <div className="space-y-4">
          <div>
            <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-4 mb-2 block">
              Nombre de quien recibe
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Ej: Juan Pérez"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full bg-slate-900 border-2 border-slate-800 focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-4 mb-2 block">
              RUT de quien recibe
            </label>
            <div className="relative">
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Ej: 12.345.678-9"
                value={receiverRut}
                onChange={(e) => setReceiverRut(e.target.value)}
                className="w-full bg-slate-900 border-2 border-slate-800 focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            onClick={handleConfirmDelivery}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 mt-8 active:scale-[0.98]"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <MessageCircle size={24} />
                CONFIRMAR Y ENVIAR WHATSAPP
              </>
            )}
          </button>
        </div>
      </main>

      <footer className="mt-12 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest pb-8">
        Charly Home Delivery Engine v1.0
      </footer>
    </div>
  );
};

export default DeliveryPortal;
