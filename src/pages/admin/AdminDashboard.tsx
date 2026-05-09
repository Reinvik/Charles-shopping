import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, Users, ArrowUpRight, 
  Loader2, Package, Printer, 
  TrendingUp, MousePointer2, Truck, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    activeProducts: 0,
    visitors: 0,
    recentVisitors: 0,
    conversionRate: 0,
    carts: 0,
    topProducts: [] as { name: string, count: number }[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [prodRes, catRes, visitorsRes, recentVisitorsRes, ordersRes, cartsRes, topRes] = await Promise.all([
        supabase.from('products').select('id, is_active'),
        supabase.from('categories').select('id'),
        supabase.from('store_visits').select('id', { count: 'exact', head: true }),
        supabase.from('store_visits').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('cart_events').select('session_id', { count: 'exact', head: true }),
        supabase.from('cart_events').select('product_name')
      ]);

      const totalVisitors = visitorsRes.count || 0;
      const recentVisitors = recentVisitorsRes.count || 0;
      const totalOrders = ordersRes.count || 0;
      const totalCarts = cartsRes.count || 0;
      
      let conversionRate = 0;
      if (totalVisitors > 0) {
        conversionRate = (totalOrders / totalVisitors) * 100;
      }

      // Procesar Top 5
      const productCounts: Record<string, number> = {};
      topRes.data?.forEach(event => {
        productCounts[event.product_name] = (productCounts[event.product_name] || 0) + 1;
      });

      const topProducts = Object.entries(productCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        products: prodRes.data?.length || 0,
        categories: catRes.data?.length || 0,
        activeProducts: prodRes.data?.filter(p => p.is_active).length || 0,
        visitors: totalVisitors,
        recentVisitors: recentVisitors,
        conversionRate: Number(conversionRate.toFixed(2)),
        carts: totalCarts,
        topProducts
      });
      
      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const statCards = [
    { 
      label: 'PRODUCTOS', 
      value: stats.products, 
      icon: ShoppingBag, 
      gradient: 'from-rose-500 to-red-600',
      shadow: 'shadow-red-500/30',
      detail: `${stats.activeProducts} activos`,
    },
    { 
      label: 'VISITANTES', 
      value: stats.visitors, 
      icon: Users, 
      gradient: 'from-amber-400 to-orange-500',
      shadow: 'shadow-orange-500/30',
      detail: `+${stats.recentVisitors} esta semana`,
    },
    { 
      label: 'CARRITOS', 
      value: stats.carts, 
      icon: MousePointer2, 
      gradient: 'from-violet-500 to-purple-600',
      shadow: 'shadow-purple-500/30',
      detail: 'Interacciones activas',
    },
    { 
      label: 'CONVERSIÓN', 
      value: `${stats.conversionRate}%`, 
      icon: TrendingUp, 
      gradient: 'from-emerald-400 to-teal-600',
      shadow: 'shadow-emerald-500/30',
      detail: 'Ventas efectivas',
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Control</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Monitoreo de rendimiento y logística en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm text-xs font-bold text-slate-500">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          SISTEMA EN VIVO
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`group relative overflow-hidden bg-gradient-to-br ${stat.gradient} p-6 rounded-3xl shadow-xl ${stat.shadow} hover:-translate-y-1 transition-all duration-300`}>
            {/* Background Decorative Icon */}
            <div className="absolute -right-4 -bottom-4 text-white opacity-10 group-hover:scale-110 transition-transform duration-500">
              <stat.icon size={120} />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <p className="text-white/80 text-[10px] font-black tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-4xl font-black text-white tracking-tighter">{stat.value}</h3>
              </div>
              
              <div className="mt-6">
                <span className="inline-block px-3 py-1.5 bg-black/10 backdrop-blur-md rounded-xl text-white text-[11px] font-black">
                  {stat.detail}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Actions & Welcome */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col items-center text-center group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-orange-500" />
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:rotate-12 transition-transform duration-500">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Charly Home Admin</h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Gestiona tu catálogo y pedidos con herramientas de última generación.
              </p>
              <Link to="/admin/products" className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                Ver Inventario
              </Link>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter text-lg">
                <Package size={20} className="text-orange-500" />
                Acciones Rápidas
              </h3>
              <div className="space-y-3">
                <Link to="/admin/products" className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                      <Plus size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800">Agregar Producto</p>
                      <p className="text-[10px] text-slate-400">Nuevas ofertas</p>
                    </div>
                  </div>
                  <ArrowUpRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                </Link>
                <Link to="/admin/categories" className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-500/30 hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-orange-500 shadow-sm">
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800">Nueva Categoría</p>
                      <p className="text-[10px] text-slate-400">Organizar catálogo</p>
                    </div>
                  </div>
                  <ArrowUpRight size={18} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                </Link>
              </div>
            </div>
          </div>

          {/* Logistics Pro Section - High Contrast Designer Look */}
          <div className="bg-black rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -mr-48 -mt-48 opacity-50" />
            <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full font-black text-[10px] uppercase tracking-[0.2em] mb-6">
                  <Truck size={14} /> Logistics Engine v2.0
                </div>
                <h3 className="text-4xl font-black mb-6 leading-[1.1] tracking-tighter">
                  Logística de <br/>
                  <span className="text-primary">Alto Rendimiento.</span>
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm font-medium">
                  Optimiza tu despacho con etiquetas térmicas de grado industrial. Compatibilidad total con Zebra y Brother.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-10">
                  {[
                    { label: 'Resolución', val: '203 DPI' },
                    { label: 'Formato', val: '100x150mm' },
                    { label: 'Tipo', val: 'Thermal' },
                    { label: 'Sync', val: 'Real-time' }
                  ].map((spec, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{spec.label}</p>
                      <p className="text-xs font-black text-white">{spec.val}</p>
                    </div>
                  ))}
                </div>

                <Link to="/admin/orders" className="group inline-flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm hover:scale-105 hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95">
                  Gestionar Pedidos 
                  <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Link>
              </div>

              {/* High Contrast Label Mockup */}
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75 group-hover:scale-100 transition-transform duration-700" />
                <div className="relative bg-white rounded-3xl p-6 text-slate-900 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] rotate-2 group-hover:rotate-0 transition-all duration-700 max-w-[300px] mx-auto border-[8px] border-slate-900">
                  <div className="border-[1.5pt] border-black h-[380px] flex flex-col font-sans overflow-hidden">
                    {/* Label Header */}
                    <div className="bg-black text-white p-3 flex justify-between items-center">
                      <div className="font-black text-[11px] tracking-tighter">CHARLY HOME</div>
                      <div className="text-[10px] font-black italic">FLEX</div>
                    </div>
                    
                    <div className="p-4 border-b-[1.5pt] border-black flex justify-between items-end bg-slate-50">
                      <div>
                        <div className="text-[8px] font-black text-slate-400 uppercase">ID Operación</div>
                        <div className="text-[12px] font-black">#CH-992-88X</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-black text-slate-400 uppercase">Fecha</div>
                        <div className="text-[10px] font-black">18/05/2026</div>
                      </div>
                    </div>

                    {/* Commune Giant Text */}
                    <div className="bg-black text-white py-4 text-center">
                      <div className="text-[8px] font-bold tracking-[0.3em] opacity-50 mb-1">DESTINO FINAL</div>
                      <div className="text-3xl font-black tracking-tighter">SANTIAGO</div>
                    </div>

                    {/* QR and Details Area */}
                    <div className="flex-1 flex flex-col p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-20 h-20 bg-black flex items-center justify-center p-1">
                          <div className="w-full h-full bg-white grid grid-cols-8 gap-0.5">
                            {Array(64).fill(0).map((_, i) => (
                              <div key={i} className={`w-full h-full ${Math.random() > 0.4 ? 'bg-black' : 'bg-transparent'}`} />
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 pl-4 text-[9px] leading-tight font-bold">
                           <div className="mb-2">
                             <span className="opacity-40 uppercase block text-[7px] mb-0.5">Dirección</span>
                             Av. Vitacura 2670, Piso 15
                           </div>
                           <div>
                             <span className="opacity-40 uppercase block text-[7px] mb-0.5">Referencia</span>
                             Torre Titanium
                           </div>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-3 border-t-[1pt] border-slate-200">
                        <div className="flex justify-between items-center">
                           <div>
                             <span className="opacity-40 uppercase block text-[7px] mb-0.5">Destinatario</span>
                             <div className="text-[10px] font-black">NICOLÁS RIVERA</div>
                           </div>
                           <div className="text-right">
                             <span className="opacity-40 uppercase block text-[7px] mb-0.5">Contacto</span>
                             <div className="text-[9px] font-black">+56 9 8223 1022</div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-xl rotate-[-15deg]">V2</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Top Products */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter text-xl">
              🔥 Top Favoritos
            </h3>
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          
          <div className="space-y-8">
            {stats.topProducts.length > 0 ? stats.topProducts.map((product, idx) => {
              const maxCount = stats.topProducts[0].count;
              const percentage = (product.count / maxCount) * 100;
              
              return (
                <div key={idx} className="space-y-2 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-sm font-black text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm border border-slate-100">
                        {idx + 1}
                      </div>
                      <p className="text-sm font-black text-slate-700 line-clamp-1 group-hover:text-primary transition-colors">{product.name}</p>
                    </div>
                    <span className="text-xs font-black text-slate-400">{product.count}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full rounded-full bg-gradient-to-r ${idx === 0 ? 'from-primary to-orange-500' : 'from-slate-300 to-slate-400'}`}
                    />
                  </div>
                </div>
              );
            }) : (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                  <ShoppingBag size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400">Sin datos de actividad</p>
                  <p className="text-[10px] text-slate-300">Las métricas aparecerán con las ventas.</p>
                </div>
              </div>
            )}
          </div>

          {stats.topProducts.length > 0 && (
            <div className="mt-12 p-6 bg-gradient-to-br from-slate-50 to-white rounded-[2rem] border border-slate-100 relative overflow-hidden">
               <div className="relative z-10">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Análisis de Carrito</p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Estos productos son los más añadidos por tus clientes. Considera crear promociones especiales para aumentar la conversión.
                </p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
