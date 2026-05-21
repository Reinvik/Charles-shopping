import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { 
  Loader2, Search, Filter, 
  ShoppingBag, Calendar, Mail, 
  CheckCircle2, Clock, XCircle,
  Users, Eye, Package, Printer, Phone, MapPin,
  MessageCircle, Truck, CreditCard, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '../../context/TenantContext';

interface Order {
  id: string;
  total: number;
  status: string;
  is_delivered?: boolean;
  delivery_status?: string;
  customer_email: string;
  items: any[];
  flow_token?: string;
  shipping_details?: {
    fullName: string;
    phone: string;
    address: string;
    comuna: string;
    reference: string;
  };
  created_at: string;
}

export const AdminOrders = () => {
  const { tenant } = useTenant();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFlowTest, setLoadingFlowTest] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryReceiptOrder, setDeliveryReceiptOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error('Error al cargar pedidos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cycleDeliveryStatus = async (orderId: string, currentDeliveryStatus: string = 'Por preparar', isDelivered: boolean) => {
    if (!tenant) return;
    
    if (currentDeliveryStatus === 'Entregado' || isDelivered) {
       if (!confirm('Este pedido ya fue entregado mediante el QR. ¿Deseas resetear el estado a "Por preparar"?')) return;
    }
    
    let nextStatus = 'Por preparar';
    if (currentDeliveryStatus === 'Por preparar') nextStatus = 'Preparado';
    else if (currentDeliveryStatus === 'Preparado') nextStatus = 'Despachado';
    else if (currentDeliveryStatus === 'Despachado') nextStatus = 'Por preparar';
    else if (currentDeliveryStatus === 'Entregado') nextStatus = 'Por preparar';

    try {
      const { error, count } = await supabase
        .from('orders')
        .update({ 
          delivery_status: nextStatus,
          is_delivered: nextStatus === 'Entregado'
        }, { count: 'exact' })
        .eq('id', orderId)
        .eq('tenant_id', tenant.id);
      
      if (error) throw error;
      if (count === 0) throw new Error("No se pudo actualizar el pedido. Verifica tus permisos de administrador.");
      
      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        delivery_status: nextStatus,
        is_delivered: nextStatus === 'Entregado'
      } : o));
      toast.success(`Estado de entrega actualizado a: ${nextStatus}`);
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error('Error: ' + (error.message || 'Error desconocido al actualizar'));
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, tenant]);

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => osc.stop(), 150);
      
      // Doble beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.value = 1100;
        gain2.gain.value = 0.3;
        osc2.start();
        setTimeout(() => osc2.stop(), 150);
      }, 200);
    } catch (e) {
      console.error('Error playing sound', e);
    }
  };

  const showNotification = (order: Order) => {
    if (Notification.permission === 'granted') {
      new Notification('¡Nuevo Pedido Recibido!', {
        body: `Pedido #${order.id.slice(0, 8)} por $${order.total.toLocaleString()}`,
        silent: true // Usamos nuestro propio sonido generado
      });
    }
    playNotificationSound();
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!tenant) return;

    const channel = supabase
      .channel('admin_orders_realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: `tenant_id=eq.${tenant.id}` 
      }, payload => {
        const newOrder = payload.new as Order;
        setOrders(prev => [newOrder, ...prev]);
        showNotification(newOrder);
        toast.success(`¡Nuevo pedido recibido! #${newOrder.id.slice(0, 8)}`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderToOpen = params.get('open');
    if (orderToOpen && orders.length > 0) {
      const order = orders.find(o => o.id === orderToOpen || o.id.startsWith(orderToOpen));
      if (order) {
        setSelectedOrder(order);
      }
    }
  }, [location.search, orders]);

  const getStatusBadge = (status: string, isDark: boolean = false) => {
    const baseClasses = "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap";
    switch (status) {
      case 'paid':
        return (
          <span className={`${baseClasses} ${isDark ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-50 text-green-700 border-green-100'}`}>
            <CheckCircle2 size={12} /> Pagado
          </span>
        );
      case 'pending':
        return (
          <span className={`${baseClasses} ${isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
            <Clock size={12} /> Pendiente
          </span>
        );
      case 'rejected':
        return (
          <span className={`${baseClasses} ${isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-100'}`}>
            <XCircle size={12} /> Fallido
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} ${isDark ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>
            {status}
          </span>
        );
    }
  };

  const getDeliveryBadge = (order: Order, isDark: boolean = false) => {
    const deliveryStatus = order.delivery_status || 'Por preparar';
    const isDelivered = order.is_delivered || false;
    const baseClasses = "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all whitespace-nowrap cursor-pointer";
    
    let stateClasses = "";
    if (deliveryStatus === 'Por preparar') {
      stateClasses = isDark 
        ? 'bg-slate-100/10 text-slate-300 border-slate-100/20 hover:text-white hover:bg-slate-100/20' 
        : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-slate-600 hover:bg-slate-100';
    } else if (deliveryStatus === 'Preparado') {
      stateClasses = isDark 
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/40' 
        : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100';
    } else if (deliveryStatus === 'Despachado') {
      stateClasses = isDark 
        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/40' 
        : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100';
    } else if (deliveryStatus === 'Entregado' || isDelivered) {
      stateClasses = isDark 
        ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/40' 
        : 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100';
    }

    const deliveryText = (isDelivered && order.status.startsWith('Entregado a')) 
      ? order.status 
      : deliveryStatus;

    return (
      <button 
        onClick={(e) => { e.stopPropagation(); cycleDeliveryStatus(order.id, deliveryStatus, isDelivered); }}
        className={`${baseClasses} ${stateClasses}`}
        style={{ whiteSpace: 'normal', textAlign: 'left', minWidth: '100px' }}
      >
        <Truck size={12} className="flex-shrink-0" /> {deliveryText}
      </button>
    );
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const simulatePurchase = async () => {
    if (!tenant) return;
    const dummyToken = `SIMULATED_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    
    try {
      const { error } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenant.id,
          total: 0,
          status: 'paid',
          customer_email: 'test@example.com',
          flow_token: dummyToken,
          items: [
            { name: 'Producto de Prueba', price: 0, quantity: 1 }
          ],
          shipping_details: {
            fullName: 'Cliente de Prueba',
            phone: '56912345678',
            address: 'Calle Falsa 123',
            comuna: 'Santiago',
            reference: 'Casa esquina'
          }
        });

      if (error) throw error;

      toast.success('Simulación iniciada. Abriendo pantalla de éxito...');
      
      // Abrir la pantalla de éxito en una nueva pestaña
      window.open(`/checkout/success?token=${dummyToken}`, '_blank');
      
    } catch (error: any) {
      toast.error('Error al simular: ' + error.message);
    }
  };

  const testFlowPayment = async () => {
    if (!tenant) return;
    if (!confirm('Se creará un pago REAL de $350 CLP en Flow (sandbox o producción según tu configuración). ¿Continuar?')) return;
    
    setLoadingFlowTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/flow-create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          tenantId: tenant.id,
          email: session?.user?.email || 'test@admin.com',
          total: 350,
          items: [{ name: 'Test Flow $350', price: 350, quantity: 1 }],
          shippingDetails: {
            fullName: 'Admin Test',
            phone: '56900000000',
            address: 'Calle de Prueba 123',
            comuna: 'Santiago',
            shippingCost: 0,
            reference: 'Prueba integración Flow'
          }
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Error al crear el pago en Flow');
      }

      toast.success('¡Pago creado en Flow! Abriendo pasarela de pago...');
      window.open(data.url, '_blank');

    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoadingFlowTest(false);
    }
  };

  const order = selectedOrder;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por ID u email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <Filter size={18} className="text-slate-400" />
            <select
              className="bg-transparent outline-none text-sm font-semibold w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Pagados</option>
              <option value="pending">Pendientes</option>
              <option value="rejected">Rechazados</option>
            </select>
          </div>

          <button
            onClick={simulatePurchase}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
          >
            <ShoppingBag size={16} />
            Simular Compra
          </button>

          <button
            onClick={testFlowPayment}
            disabled={loadingFlowTest}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Crea un pago REAL de $350 en Flow para probar la integración completa"
          >
            {loadingFlowTest ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CreditCard size={16} />
            )}
            Pagar $350 en Flow
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pedido</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Pago</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Entrega</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <ShoppingBag size={16} />
                      </div>
                      <span className="font-bold text-sm text-slate-700">#{order.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(order.created_at).toLocaleDateString('es-CL')}
                      </span>
                      <span className="text-[10px] text-slate-400 pl-5">
                        {new Date(order.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <Mail size={14} className="text-slate-400" />
                      {order.customer_email || 'Anónimo'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4">
                    {getDeliveryBadge(order)}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 text-base">
                    ${order.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          const clientName = order.shipping_details?.fullName || 'Cliente';
                          const phone = order.shipping_details?.phone?.replace(/\D/g, '') || '';
                          const storeName = tenant?.display_name || 'nuestra tienda';
                          
                          // Cargar link de reseñas
                          const { data } = await supabase
                            .from('site_settings')
                            .select('value')
                            .eq('tenant_id', tenant?.id)
                            .eq('key', 'google_review_link')
                            .maybeSingle();
                          
                          const reviewLink = data?.value || '';
                          const reviewText = reviewLink ? `\n\nSi te gustó nuestro servicio, nos ayudarías mucho dejándonos 5 estrellas aquí: ${reviewLink}` : '';
                          
                          const isPreparado = order.delivery_status === 'Preparado';
                          const isDespachado = order.delivery_status === 'Despachado';
                          const isEntregado = order.delivery_status === 'Entregado' || order.is_delivered;
                          
                          let notifyStatusText = `está siendo procesado. Te avisaremos cuando haya novedades. ⏳`;
                          if (isPreparado) {
                            notifyStatusText = `ha sido preparado y está listo para ser despachado. ¡Atento a nuestras novedades! 📦`;
                          } else if (isDespachado) {
                            notifyStatusText = `ya ha sido despachado y va en camino. ¡Pronto estará en tus manos! 🚚`;
                          } else if (isEntregado) {
                            notifyStatusText = `ha sido entregado con éxito. ¡Esperamos que lo disfrutes! 🎉`;
                          }
                          
                          const message = encodeURIComponent(`¡Hola ${clientName}! Te escribo de ${storeName}. 🏠 Te informamos que tu pedido #${order.id.slice(0, 8)} ${notifyStatusText}${reviewText}`);
                          window.open(`https://wa.me/${phone.startsWith('56') ? phone : '56' + phone}?text=${message}`, '_blank');
                        }}
                        className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                        title="Notificar Estado por WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        title="Ver Detalles"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package size={48} className="mb-4 opacity-20" />
                      <p className="font-medium text-lg">No se encontraron pedidos</p>
                      <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal via Portal */}
      {order && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="admin-order-modal"
            style={{ 
              background: '#fff', 
              borderRadius: '2rem', 
              width: '100%', 
              maxWidth: '900px', 
              maxHeight: '92vh', 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ background: '#0f172a', padding: 'clamp(1.25rem, 4vw, 2rem) clamp(1.5rem, 5vw, 2.5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div className="desktop-only" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '0.5rem', display: 'flex' }}>
                    <ShoppingBag size={22} color="#fff" />
                  </div>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', letterSpacing: '-0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Detalles del Pedido</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.65rem', fontFamily: 'monospace', margin: 0 }}>REF: {selectedOrder.id.toUpperCase()}</p>
                  <p style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 'bold', margin: 0 }}>CÓDIGO RASTREO: {selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 1rem)', marginLeft: '1rem' }}>
                <div className="desktop-only">{getStatusBadge(selectedOrder.status, true)}</div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(1.25rem, 4vw, 2rem) clamp(1.5rem, 5vw, 2.5rem)', background: '#f8fafc' }}>
              <div className="modal-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>

              {/* Left: Cliente + Despacho */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>Cliente</p>
                  <p style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem', wordBreak: 'break-all' }}>{selectedOrder.customer_email || 'Anónimo'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem' }}>
                    <Calendar size={14} />
                    {new Date(selectedOrder.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {selectedOrder.shipping_details && (
                  <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <p style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Despacho</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          title="WhatsApp"
                          onClick={() => { const p = selectedOrder.shipping_details!.phone.replace(/\D/g,''); window.open(`https://wa.me/${p.startsWith('56')?p:'56'+p}`,'_blank'); }}
                          style={{ background: '#25D366', border: 'none', borderRadius: '0.6rem', padding: '0.5rem', cursor: 'pointer', display: 'flex', color: '#fff' }}
                        ><MessageCircle size={16} /></button>
                        <button
                          title="Imprimir"
                          onClick={() => {
                            if(!selectedOrder.shipping_details) return;
                            const s = selectedOrder.shipping_details;
                            const qr = `${window.location.origin}/entrega/${selectedOrder.id}`;
                            const pw = window.open('','_blank'); if(!pw) return;
                            pw.document.write(`<html><head><style>@page{size:100mm 150mm;margin:0}body{font-family:sans-serif;margin:0;padding:5mm}.c{border:2pt solid #000;height:135mm;display:flex;flex-direction:column}.h{padding:3mm;border-bottom:1pt solid #000;display:flex;justify-content:space-between}.fs{display:flex;background:#000;color:#fff}.fb{padding:3mm;font-size:18pt;font-weight:900;border-right:1pt solid #fff}.db{padding:3mm;font-size:14pt;font-weight:700;display:flex;align-items:center}.qrs{flex:1;display:flex;align-items:center;justify-content:center;padding:5mm}.cs{padding:3mm;text-align:center;border-bottom:1pt solid #000;font-size:18pt;font-weight:900;text-transform:uppercase}.ft{padding:3mm;font-size:9pt}</style></head><body><div class=c><div class=h><div><b>${tenant?.display_name.toUpperCase()}</b><div>#${selectedOrder.id.slice(0,8)}</div></div></div><div class=fs><div class=fb>FLEX</div><div class=db>${new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'short'}).toUpperCase()}</div></div><div class=qrs><img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qr)}" width=120 height=120></div><div class=cs>${s.comuna.split(',')[0]}</div><div class=ft><div><b>Dir:</b> ${s.address}</div><div><b>Tel:</b> ${s.phone}</div><div><b>Dest:</b> ${s.fullName}</div></div></div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000)}</script></body></html>`);
                            pw.document.close();
                          }}
                          style={{ background: '#334155', border: 'none', borderRadius: '0.6rem', padding: '0.5rem', cursor: 'pointer', display: 'flex', color: '#fff' }}
                        ><Printer size={16} /></button>
                        <button
                          onClick={() => { setDeliveryReceiptOrder(selectedOrder); setSelectedOrder(null); }}
                          style={{ background: '#2563eb', border: 'none', borderRadius: '0.6rem', padding: '0.4rem 0.75rem', cursor: 'pointer', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}
                        >Confirmar</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ background: '#f1f5f9', borderRadius: '0.5rem', padding: '0.4rem', flexShrink: 0 }}><Users size={16} color="#475569" /></div>
                      <div>
                        <p style={{ color: '#475569', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.2rem' }}>Destinatario</p>
                        <p style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{selectedOrder.shipping_details.fullName}</p>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={12} />{selectedOrder.shipping_details.phone}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ background: '#f1f5f9', borderRadius: '0.5rem', padding: '0.4rem', flexShrink: 0 }}><MapPin size={16} color="#475569" /></div>
                      <div>
                        <p style={{ color: '#475569', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.2rem' }}>Dirección</p>
                        <p style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>{selectedOrder.shipping_details.address}</p>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>{selectedOrder.shipping_details.comuna}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Productos + Totales */}
              <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <p style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>Productos del Pedido</p>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.875rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: 56, height: 56, background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ShoppingBag size={20} color="#cbd5e1" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.2rem' }}>{item.name}</p>
                        <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>{item.quantity} un. × ${item.price.toLocaleString()}</p>
                      </div>
                      <p style={{ color: '#0f172a', fontWeight: 800, fontSize: '1rem', margin: 0, whiteSpace: 'nowrap' }}>${(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '2px solid #f1f5f9', marginTop: '1.25rem', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}><span>Subtotal</span><span>${selectedOrder.total.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}><span>Envío</span><span style={{ color: '#16a34a', fontWeight: 700 }}>GRATIS</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontSize: '1.2rem', fontWeight: 900, paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <span>Total</span><span>${selectedOrder.total.toLocaleString()}</span>
                  </div>
                  {selectedOrder.flow_token && (
                    <div style={{ marginTop: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                      <p style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.25rem' }}>Ref. Flow</p>
                      <p style={{ color: '#475569', fontSize: '0.7rem', fontFamily: 'monospace', wordBreak: 'break-all', margin: 0 }}>{selectedOrder.flow_token}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @media (max-width: 768px) {
              .admin-order-modal {
                border-radius: 0 !important;
                max-height: 100vh !important;
                height: 100vh !important;
              }
              .modal-grid-layout {
                grid-template-columns: 1fr !important;
              }
              .modal-scroll-area {
                padding: 1.25rem !important;
              }
            }
          `}</style>
          </div>
        </div>,
        document.body
      )}

      {deliveryReceiptOrder && createPortal(
        <div

          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setDeliveryReceiptOrder(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '1.75rem', width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
            <div style={{ background: '#0f172a', padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(37,211,102,0.2)', borderRadius: '0.75rem', padding: '0.6rem', display: 'flex' }}>
                <MessageCircle size={26} color="#25D366" />
              </div>
              <div>
                <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '1.25rem', margin: 0, lineHeight: 1.2 }}>Confirmar Recepción</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, margin: '0.25rem 0 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pedido #{deliveryReceiptOrder.id.substring(0,8).toUpperCase()}</p>
              </div>
              <button onClick={() => setDeliveryReceiptOrder(null)} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={20} />
              </button>
            </div>
            <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '0.5rem' }}>Nombre de quien recibe</label>
                <input type="text" id="receipt-name-modal" placeholder="Ej: Juan Pérez" style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '0.875rem', padding: '0.875rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '0.5rem' }}>RUT de quien recibe</label>
                <input type="text" id="receipt-rut-modal" placeholder="Ej: 12.345.678-9" style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '0.875rem', padding: '0.875rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button
                onClick={async () => {
                  const name = (document.getElementById('receipt-name-modal') as HTMLInputElement).value;
                  const rut = (document.getElementById('receipt-rut-modal') as HTMLInputElement).value;
                  if (!name || !rut) { toast.error('Por favor ingresa nombre y RUT'); return; }
                  
                  // Update database status
                  const { error, count } = await supabase
                    .from('orders')
                    .update({ is_delivered: true }, { count: 'exact' })
                    .eq('id', deliveryReceiptOrder.id)
                    .eq('tenant_id', tenant?.id);
                  
                  if (error) { toast.error('Error al actualizar estado: ' + error.message); return; }
                  if (count === 0) { toast.error('No se pudo actualizar el pedido. Verifica tus permisos.'); return; }
                  
                  const productList = deliveryReceiptOrder.items.map((item: any) => `- ${item.name}`).join('\n');
                  const clientName = deliveryReceiptOrder.shipping_details?.fullName || 'Cliente';
                  const phone = deliveryReceiptOrder.shipping_details?.phone.replace(/\D/g, '') || '';
                  const message = encodeURIComponent(`Hola ${clientName}, te informamos que el pedido ha sido recibido con éxito:\n${productList}\n\nRecibido por: ${name}\nRut: ${rut}\n\n¡Gracias por confiar en ${tenant?.display_name}!`);
                  
                  window.open(`https://wa.me/${phone.startsWith('56') ? phone : '56' + phone}?text=${message}`, '_blank');
                  setDeliveryReceiptOrder(null);
                  setOrders(prev => prev.map(o => o.id === deliveryReceiptOrder.id ? { ...o, is_delivered: true } : o));
                  toast.success('Estado actualizado y abriendo WhatsApp...');
                }}
                style={{ width: '100%', background: '#25D366', color: '#fff', border: 'none', borderRadius: '1rem', padding: '1rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <MessageCircle size={20} /> Enviar por WhatsApp
              </button>
              <button onClick={() => setDeliveryReceiptOrder(null)} style={{ width: '100%', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '1rem', padding: '0.75rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
