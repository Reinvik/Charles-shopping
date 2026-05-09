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
      label: 'Productos', 
      value: stats.products, 
      icon: ShoppingBag, 
      gradient: 'from-blue-600 to-indigo-600',
      detail: `${stats.activeProducts} activos`,
      trend: '+12%'
    },
    { 
      label: 'Visitantes', 
      value: stats.visitors, 
      icon: Users, 
      gradient: 'from-emerald-600 to-teal-600',
      detail: `+${stats.recentVisitors} esta semana`,
      trend: '+24%'
    },
    { 
      label: 'Carritos', 
      value: stats.carts, 
      icon: MousePointer2, 
      gradient: 'from-purple-600 to-violet-600',
      detail: 'Interacciones activas',
      trend: '+5%'
    },
    { 
      label: 'Conversión', 
      value: `${stats.conversionRate}%`, 
      icon: TrendingUp, 
      gradient: 'from-orange-600 to-red-600',
      detail: 'Ventas efectivas',
      trend: '+3%'
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Control</h2>
          <p className="text-slate-500 text-sm mt-1">Monitoreo de rendimiento y logística en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm text-xs font-bold text-slate-500">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          SISTEMA EN VIVO
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-[0.03] rounded-bl-full -mr-8 -mt-8 group-hover:scale-110 transition-transform`} />
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg shadow-indigo-500/20`}>
                <stat.icon size={22} />
              </div>
              <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">{stat.trend}</span>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
              <p className="text-slate-400 text-xs mt-2 font-medium">{stat.detail}</p>
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

          {/* Logistics Preview Section */}
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-[0.2em] mb-4">
                  <Truck size={16} /> Logística Pro
                </div>
                <h3 className="text-3xl font-black mb-4 leading-tight">Etiquetas Térmicas Inteligentes</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Hemos integrado un generador de tickets compatible con impresoras Zebra, Brother y genéricas de 100x150mm.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Código QR de seguimiento', 'Formato Mercado Libre', 'Datos de envío persistentes'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/admin/orders" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all">
                  Gestionar Pedidos <Printer size={16} />
                </Link>
              </div>

              {/* Label Mockup Preview */}
              <div className="relative bg-white rounded-2xl p-4 text-slate-900 shadow-2xl rotate-3 transform hover:rotate-0 transition-transform duration-500 max-w-[280px] mx-auto">
                <div className="border-2 border-slate-900 h-[360px] flex flex-col font-sans">
                  <div className="border-b-2 border-slate-900 p-2 flex justify-between items-start">
                    <div>
                      <div className="font-black text-[10px]">CHARLY HOME</div>
                      <div className="text-[8px] font-bold">Pedido: #CH-8821</div>
                    </div>
                    <div className="text-[7px] text-right font-bold">18/05/2026</div>
                  </div>
                  <div className="grid grid-cols-2 border-b-2 border-slate-900 text-center">
                    <div className="border-r-2 border-slate-900 py-1 font-black text-xl italic">FLEX</div>
                    <div className="py-1 font-black text-xl italic">18 MAY</div>
                  </div>
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div className="w-24 h-24 border-2 border-slate-900 flex items-center justify-center">
                       <div className="grid grid-cols-4 gap-0.5 opacity-80">
                         {Array(16).fill(0).map((_, i) => (
                           <div key={i} className={`w-4 h-4 ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-transparent'}`} />
                         ))}
                       </div>
                    </div>
                  </div>
                  <div className="border-t-2 border-b-2 border-slate-900 py-2 text-center font-black text-xl">
                    SANTIAGO
                  </div>
                  <div className="p-3 text-[9px] leading-tight font-bold">
                    <div>DIR: Av. Providencia 1234, Of 502</div>
                    <div>REF: Frente al metro</div>
                    <div>TEL: +56 9 1234 5678</div>
                    <div className="mt-1 uppercase">DEST: JUAN PÉREZ GARCÍA</div>
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-[10px] shadow-lg">PREVIEW</div>
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
