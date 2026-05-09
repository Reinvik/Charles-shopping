import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ShoppingBag, Users, 
  Loader2, Truck, MousePointer2, TrendingUp,
  Printer, Package
} from 'lucide-react';

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
      label: 'PRODUCTOS TOTALES', 
      value: stats.products, 
      icon: ShoppingBag, 
      color: '#3b82f6', // blue-500
      glow: 'shadow-blue-500/20',
      detail: `${stats.activeProducts} activos`,
    },
    { 
      label: 'VISITANTES', 
      value: stats.visitors, 
      icon: Users, 
      color: '#10b981', // emerald-500
      glow: 'shadow-emerald-500/20',
      detail: `+${stats.recentVisitors} esta semana`,
    },
    { 
      label: 'CARRITOS', 
      value: stats.carts, 
      icon: MousePointer2, 
      color: '#8b5cf6', // violet-500
      glow: 'shadow-violet-500/20',
      detail: 'Añadidos al carrito',
    },
    { 
      label: 'CONVERSIÓN', 
      value: `${stats.conversionRate}%`, 
      icon: TrendingUp, 
      color: '#f97316', // orange-500
      glow: 'shadow-orange-500/20',
      detail: 'Ventas sobre visitas',
    },
  ];

  const handlePrintLatestLabel = async () => {
    try {
      const { data: latestOrder } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Demo data if no order found
      const orderToPrint = latestOrder || {
        id: 'DEMO-882-99X',
        created_at: new Date().toISOString(),
        shipping_details: {
          fullName: 'NICOLÁS RIVERA (DEMO)',
          address: 'Av. Vitacura 2670, Piso 15',
          comuna: 'Vitacura, Santiago',
          phone: '+56 9 8223 1022',
          reference: 'Torre Titanium'
        }
      };

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const labelHtml = `
        <html>
          <head>
            <style>
              @page { size: 100mm 150mm; margin: 0; }
              body { 
                margin: 0; 
                padding: 10mm; 
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                background: white;
              }
              .label-container {
                border: 2pt solid black;
                height: 128mm;
                display: flex;
                flex-direction: column;
                color: black;
              }
              .header {
                background: black;
                color: white;
                padding: 4mm;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 900;
                font-size: 14pt;
              }
              .info-row {
                padding: 4mm;
                border-bottom: 1.5pt solid black;
                display: flex;
                justify-content: space-between;
                font-size: 10pt;
              }
              .commune {
                background: black;
                color: white;
                padding: 6mm 0;
                text-align: center;
                font-weight: 900;
                font-size: 28pt;
                letter-spacing: -1px;
              }
              .details {
                flex: 1;
                padding: 6mm;
                display: flex;
                flex-direction: column;
              }
              .address {
                font-weight: 900;
                font-size: 14pt;
                margin-bottom: 4mm;
                line-height: 1.2;
              }
              .footer {
                margin-top: auto;
                border-top: 1pt solid #eee;
                padding-top: 4mm;
                display: flex;
                justify-content: space-between;
                font-size: 9pt;
                font-weight: 800;
              }
              .demo-tag {
                position: absolute;
                top: 5mm;
                left: -15mm;
                background: red;
                color: white;
                padding: 2mm 20mm;
                transform: rotate(-45deg);
                font-weight: 900;
                font-size: 10pt;
              }
            </style>
          </head>
          <body>
            <div class="label-container" style="position: relative; overflow: hidden;">
              ${!latestOrder ? '<div class="demo-tag">DEMOSTRACIÓN</div>' : ''}
              <div class="header">
                <span>CHARLY HOME</span>
                <span style="font-style: italic; font-size: 10pt;">FLEX v2.0</span>
              </div>
              <div class="info-row">
                <div>
                  <div style="font-size: 8pt; color: #666; font-weight: 900;">ID OPERACIÓN</div>
                  <div style="font-weight: 900;">#${orderToPrint.id.substring(0, 12).toUpperCase()}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 8pt; color: #666; font-weight: 900;">FECHA</div>
                  <div style="font-weight: 900;">${new Date(orderToPrint.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div class="commune">
                ${orderToPrint.shipping_details.comuna.split(',')[0].toUpperCase()}
              </div>
              <div class="details">
                <div style="font-size: 8pt; color: #666; font-weight: 900; margin-bottom: 2mm;">DIRECCIÓN DE ENTREGA</div>
                <div class="address">${orderToPrint.shipping_details.address}</div>
                ${orderToPrint.shipping_details.reference ? `<div style="font-size: 10pt; color: #444; font-weight: 700;">Ref: ${orderToPrint.shipping_details.reference}</div>` : ''}
                
                <div class="footer">
                  <div>
                    <div style="font-size: 7pt; color: #666;">DESTINATARIO</div>
                    <div>${orderToPrint.shipping_details.fullName.toUpperCase()}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 7pt; color: #666;">CONTACTO</div>
                    <div>${orderToPrint.shipping_details.phone}</div>
                  </div>
                </div>
              </div>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `;

      printWindow.document.write(labelHtml);
      printWindow.document.close();
    } catch (err) {
      console.error('Error printing label:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Estado actual de tu inventario y métricas clave.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm text-xs font-bold text-slate-600">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          SISTEMA EN VIVO
        </div>
      </div>

      {/* KPI Section - Vibrant & Eye-Catching */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm ${stat.glow} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}>
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" style={{ backgroundColor: stat.color }} />
            
            <div className="flex flex-col gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: stat.color }}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                  <span className="text-[10px] font-bold text-slate-400">{stat.detail}</span>
                </div>
              </div>
            </div>
            
            {/* Bottom Color Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 opacity-20" style={{ backgroundColor: stat.color }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Top Favoritos - Moved UP */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter text-xl italic">
                <span className="flex items-center justify-center w-10 h-10 bg-primary/10 text-primary rounded-xl rotate-[-5deg]">🔥</span>
                Top Favoritos
              </h3>
              <div className="p-2 bg-slate-50 text-primary rounded-xl border border-slate-100">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="space-y-4">
              {stats.topProducts.length > 0 ? stats.topProducts.map((product, idx) => {
                const maxCount = Math.max(...stats.topProducts.map(p => p.count));
                const percentage = (product.count / maxCount) * 100;
                
                return (
                  <div key={idx} className="space-y-2 group/item">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black group-hover/item:bg-primary transition-colors">
                          {idx + 1}
                        </div>
                        <p className="text-sm font-black text-slate-900 group-hover/item:text-primary transition-colors tracking-tight">{product.name}</p>
                      </div>
                      <span className="text-xs font-black text-primary">{product.count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className={`h-full rounded-full bg-primary transition-all duration-1000`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="py-12 text-center text-slate-300 font-bold text-sm">Sin actividad reciente</div>
              )}
            </div>

            <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5">Análisis de Carrito</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Estos productos son los más añadidos. Considera crear promociones para aumentar la conversión.
                </p>
            </div>
          </div>

          {/* Logistics Section - Simple & Vistoso (Light theme) */}
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-900 p-8 relative overflow-hidden shadow-xl group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full font-black text-[9px] uppercase tracking-widest mb-6">
                  <Truck size={12} /> LOGISTICS ENGINE V2.0
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 leading-tight tracking-tighter italic">
                  Logística de <br/>
                  <span className="text-primary underline decoration-slate-200 underline-offset-4">Alto Rendimiento.</span>
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 font-bold">
                  Gestión inteligente de etiquetas. Imprime directo o descarga el formato terminal.
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={handlePrintLatestLabel}
                    style={{ 
                      backgroundColor: '#000000', 
                      color: '#FFFFFF',
                      padding: '1rem 2rem',
                      borderRadius: '1rem',
                      fontWeight: '900',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                    }}
                    className="hover:scale-105 transition-all active:scale-95"
                  >
                    <Printer size={18} /> Imprimir Última Etiqueta
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: '203 DPI', icon: Truck },
                  { val: '100x150mm', icon: Package },
                  { val: 'Thermal', icon: ShoppingBag },
                  { val: 'Real-time', icon: TrendingUp }
                ].map((spec, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-3xl w-32 h-32 flex flex-col justify-between hover:border-primary transition-colors group/spec">
                    <div className="text-slate-900 group-hover/spec:text-primary transition-colors"><spec.icon size={22} /></div>
                    <p className="text-sm font-black text-slate-900">{spec.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Welcome */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] relative overflow-hidden text-center text-white shadow-2xl h-full flex flex-col items-center justify-center min-h-[400px]">
             <div className="absolute top-0 left-0 w-full h-full bg-primary/10 blur-[80px] rounded-full" />
             <div className="relative z-10">
               <div className="w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-8 animate-bounce">
                 <ShoppingBag size={40} />
               </div>
               <h3 className="text-2xl font-black mb-4 tracking-tighter">Bienvenido al Panel de Control</h3>
               <p className="text-slate-400 text-sm leading-relaxed mb-10 px-4">
                 Desde aquí puedes controlar todo el contenido de Charly Home en tiempo real.
               </p>
               <div className="w-12 h-1 bg-primary mx-auto rounded-full opacity-30" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
