import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { ShoppingBag, Users, ArrowUpRight, Loader2, Package } from 'lucide-react';

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
      label: 'Productos Totales', 
      value: stats.products, 
      icon: ShoppingBag, 
      color: 'bg-blue-500', 
      detail: `${stats.activeProducts} activos` 
    },
    { 
      label: 'Visitantes', 
      value: stats.visitors, 
      icon: Users, 
      color: 'bg-green-500', 
      detail: `+${stats.recentVisitors} esta semana` 
    },
    { 
      label: 'Carritos', 
      value: stats.carts, 
      icon: ShoppingBag, 
      color: 'bg-purple-500', 
      detail: 'Añadidos al carrito' 
    },
    { 
      label: 'Conversión', 
      value: `${stats.conversionRate}%`, 
      icon: ArrowUpRight, 
      color: 'bg-orange-500', 
      detail: 'Ventas sobre visitas' 
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Resumen de Tienda</h2>
        <p className="text-slate-500 text-sm">Estado actual de tu inventario y métricas clave.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div className={`p-3 rounded-xl ${stat.color} text-white shadow-lg shadow-current/20`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              <p className="text-slate-400 text-[10px] mt-1 font-medium">{stat.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800">
              <Package size={20} className="text-primary" />
              Acciones Rápidas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/admin/products" className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                <p className="font-bold text-sm group-hover:text-primary">Agregar Producto</p>
                <p className="text-xs text-slate-400 mt-1">Sube nuevas ofertas</p>
              </Link>
              <Link to="/admin/categories" className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                <p className="font-bold text-sm group-hover:text-primary">Nueva Categoría</p>
                <p className="text-xs text-slate-400 mt-1">Organiza tu catálogo</p>
              </Link>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <ShoppingBag size={32} />
            </div>
            <h3 className="font-bold text-slate-800">Bienvenido al Panel de Control</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-xs">
              Desde aquí puedes controlar todo el contenido de Charly Home en tiempo real.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2 text-slate-800">
              Top 5 Productos
            </h3>
            <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-full uppercase tracking-wider">Favoritos</span>
          </div>
          
          <div className="space-y-4">
            {stats.topProducts.length > 0 ? stats.topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                    {idx + 1}
                  </div>
                  <p className="text-sm font-semibold text-slate-700 line-clamp-1">{product.name}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                  <ArrowUpRight size={14} className="text-green-500" />
                  {product.count}
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-slate-400">
                <p className="text-sm">Sin datos aún</p>
                <p className="text-[10px]">Esperando interacciones...</p>
              </div>
            )}
          </div>

          {stats.topProducts.length > 0 && (
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Métrica</p>
              <p className="text-xs text-slate-600">Basado en el número de veces que el producto fue añadido al carrito.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
