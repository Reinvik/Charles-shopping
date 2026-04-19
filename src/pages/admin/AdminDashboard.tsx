import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingBag, Tag, Users, ArrowUpRight, Loader2, Package } from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    activeProducts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('categories').select('*')
      ]);

      if (!prodRes.error && !catRes.error) {
        setStats({
          products: prodRes.data?.length || 0,
          categories: catRes.data?.length || 0,
          activeProducts: prodRes.data?.filter(p => p.is_active).length || 0
        });
      }
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
      label: 'Categorías', 
      value: stats.categories, 
      icon: Tag, 
      color: 'bg-purple-500', 
      detail: 'En catálogo' 
    },
    { 
      label: 'Visitantes (Simulado)', 
      value: '1.2k', 
      icon: Users, 
      color: 'bg-green-500', 
      detail: '+15% esta semana' 
    },
    { 
      label: 'Conversión (Simulado)', 
      value: '3.2%', 
      icon: ArrowUpRight, 
      color: 'bg-orange-500', 
      detail: 'Promedio mensual' 
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Resumen de Tienda</h2>
        <p className="text-slate-500 text-sm">Estado actual de tu inventario y métricas clave.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div className={`p-3 rounded-xl ${stat.color} text-white`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Package size={20} className="text-primary" />
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <a href="/admin/products" className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group">
              <p className="font-bold text-sm group-hover:text-primary">Agregar Producto</p>
              <p className="text-xs text-slate-400 mt-1">Sube nuevas ofertas</p>
            </a>
            <a href="/admin/categories" className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group">
              <p className="font-bold text-sm group-hover:text-primary">Nueva Categoría</p>
              <p className="text-xs text-slate-400 mt-1">Organiza tu catálogo</p>
            </a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <ShoppingBag size={32} />
            </div>
            <h3 className="font-bold">Bienvenido al Panel de Control</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-xs">
              Desde aquí puedes controlar todo el contenido de Charles Shopping en tiempo real.
            </p>
        </div>
      </div>
    </div>
  );
};
