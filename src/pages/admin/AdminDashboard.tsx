import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ShoppingBag, Users, Loader2, Truck, MousePointer2, TrendingUp,
  Printer, Package, CheckCircle2, Clock, XCircle, Zap, BarChart3,
  ArrowUpRight, ChevronRight, Calendar, QrCode
} from 'lucide-react';
import QRScanner from '../../components/admin/QRScanner';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface RecentOrder {
  id: string; total: number; status: string;
  customer_email: string; created_at: string;
}

interface DailyStats {
  date: string;
  displayDate: string;
  deliveries: number;
  income: number;
}

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    products: 0, categories: 0, activeProducts: 0, visitors: 0,
    recentVisitors: 0, conversionRate: 0, carts: 0,
    topProducts: [] as { name: string; count: number }[],
    recentOrders: [] as RecentOrder[],
    totalRevenue: 0,
  });
  const [chartData, setChartData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<'delivery' | 'metrics' | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [prodRes, , visitorsRes, recentVisitorsRes, ordersRes, cartsRes, topRes, recentOrdersRes] = await Promise.all([
        supabase.from('products').select('id, is_active'),
        supabase.from('categories').select('id'),
        supabase.from('store_visits').select('id', { count: 'exact', head: true }),
        supabase.from('store_visits').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('cart_events').select('session_id', { count: 'exact', head: true }),
        supabase.from('cart_events').select('product_name'),
        supabase.from('orders').select('id, total, status, customer_email, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      // Historical data for charts
      const { data: historyOrders } = await supabase
        .from('orders')
        .select('created_at, total, status')
        .gte('created_at', oneWeekAgo.toISOString());

      const days: Record<string, DailyStats> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        days[key] = {
          date: key,
          displayDate: d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }),
          deliveries: 0,
          income: 0
        };
      }

      historyOrders?.forEach(o => {
        const key = o.created_at.split('T')[0];
        if (days[key]) {
          // Asumimos que un pedido pagado o pendiente es relevante para la métrica diaria
          if (o.status === 'paid' || o.status === 'pending') {
            days[key].deliveries += 1;
            days[key].income += o.total || 0;
          }
        }
      });

      const totalVisitors = visitorsRes.count || 0;
      const totalOrders = ordersRes.count || 0;
      const conversionRate = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;

      const productCounts: Record<string, number> = {};
      topRes.data?.forEach(e => { productCounts[e.product_name] = (productCounts[e.product_name] || 0) + 1; });
      const topProducts = Object.entries(productCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      const paidOrders = (recentOrdersRes.data || []).filter((o: any) => o.status === 'paid');
      const totalRevenue = paidOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

      setChartData(Object.values(days));
      setStats({
        products: prodRes.data?.length || 0,
        categories: 0,
        activeProducts: prodRes.data?.filter((p: any) => p.is_active).length || 0,
        visitors: totalVisitors,
        recentVisitors: recentVisitorsRes.count || 0,
        conversionRate: Number(conversionRate.toFixed(2)),
        carts: cartsRes.count || 0,
        topProducts,
        recentOrders: (recentOrdersRes.data || []) as RecentOrder[],
        totalRevenue,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const handlePrintLatestLabel = async () => {
    const { data: latest } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(1).single();
    const o = latest || { id: 'DEMO-882-99X', created_at: new Date().toISOString(), shipping_details: { fullName: 'NICOLÁS RIVERA (DEMO)', address: 'Av. Vitacura 2670, Piso 15', comuna: 'Vitacura, Santiago', phone: '+56 9 8223 1022', reference: 'Torre Titanium' } };
    const pw = window.open('', '_blank'); if (!pw) return;
    pw.document.write(`<html><head><style>@page{size:100mm 150mm;margin:0}body{margin:0;padding:10mm;font-family:system-ui}.lc{border:2pt solid #000;height:128mm;display:flex;flex-direction:column}.hd{background:#000;color:#fff;padding:4mm;display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:14pt}.ir{padding:4mm;border-bottom:1.5pt solid #000;display:flex;justify-content:space-between;font-size:10pt}.cm{background:#000;color:#fff;padding:6mm 0;text-align:center;font-weight:900;font-size:28pt}.dt{flex:1;padding:6mm;display:flex;flex-direction:column}.ft{margin-top:auto;border-top:1pt solid #eee;padding-top:4mm;display:flex;justify-content:space-between;font-size:9pt;font-weight:800}</style></head><body><div class=lc><div class=hd><span>CHARLY HOME</span><span>FLEX v2.0</span></div><div class=ir><div><div style="font-size:8pt;color:#666;font-weight:900">ID</div><div style="font-weight:900">#${o.id.substring(0,12).toUpperCase()}</div></div><div style="text-align:right"><div style="font-size:8pt;color:#666;font-weight:900">FECHA</div><div style="font-weight:900">${new Date(o.created_at).toLocaleDateString()}</div></div></div><div class=cm>${o.shipping_details.comuna.split(',')[0].toUpperCase()}</div><div class=dt><div style="font-size:8pt;color:#666;font-weight:900;margin-bottom:2mm">DIRECCIÓN</div><div style="font-weight:900;font-size:14pt;margin-bottom:4mm;line-height:1.2">${o.shipping_details.address}</div><div class=ft><div><div style="font-size:7pt;color:#666">DESTINATARIO</div><div>${o.shipping_details.fullName.toUpperCase()}</div></div><div style="text-align:right"><div style="font-size:7pt;color:#666">CONTACTO</div><div>${o.shipping_details.phone}</div></div></div></div></div><script>window.onload=()=>{window.print();window.close()}</script></body></html>`);
    pw.document.close();
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  const kpis = [
    {
      label: 'Productos Totales', value: String(stats.products),
      sub: `${stats.activeProducts} activos`, icon: ShoppingBag,
      accent: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
    },
    {
      label: 'Visitantes', value: String(stats.visitors),
      sub: `+${stats.recentVisitors} esta semana`, icon: Users,
      accent: '#059669', bg: '#f0fdf4', border: '#bbf7d0',
    },
    {
      label: 'Carritos', value: String(stats.carts),
      sub: 'Añadidos al carrito', icon: MousePointer2,
      accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    },
    {
      label: 'Conversión', value: `${stats.conversionRate}%`,
      sub: 'Ventas sobre visitas', icon: TrendingUp,
      accent: '#d97706', bg: '#fffbeb', border: '#fde68a',
    },
  ];

  const getStatus = (s: string) => {
    if (s === 'paid') return { icon: <CheckCircle2 size={13} />, color: '#059669', label: 'Pagado' };
    if (s === 'pending') return { icon: <Clock size={13} />, color: '#d97706', label: 'Pendiente' };
    return { icon: <XCircle size={13} />, color: '#dc2626', label: 'Rechazado' };
  };

  const rankColors = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{label}</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
            {chartView === 'metrics' ? `$${payload[0].value.toLocaleString()}` : `${payload[0].value} entregas`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }} className="pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>
            Dashboard
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.2rem' }}>
            Panel de control · Charly Home
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '0.4rem 0.9rem' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>En Vivo</span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="admin-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: '1.25rem',
            border: `1px solid #e2e8f0`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)',
            padding: '1.25rem 1.5rem',
            borderLeft: `4px solid ${k.accent}`,
            transition: 'box-shadow 0.2s, transform 0.2s',
            cursor: 'default',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: k.bg, border: `1px solid ${k.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.accent }}>
                <k.icon size={20} />
              </div>
              <ArrowUpRight size={14} style={{ color: '#cbd5e1', marginTop: '0.2rem' }} />
            </div>
            <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.3rem' }}>{k.label}</p>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, margin: '0 0 0.25rem' }}>{k.value}</p>
            <p style={{ fontSize: '0.7rem', color: k.accent, fontWeight: 700, margin: 0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="admin-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

        {/* ── TOP FAVORITOS ── */}
        <div style={{ background: '#fff', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🔥</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Top Favoritos</span>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.3rem' }}>
              <BarChart3 size={14} style={{ color: '#94a3b8', display: 'block' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {stats.topProducts.length > 0 ? stats.topProducts.map((p, idx) => {
              const max = Math.max(...stats.topProducts.map(x => x.count));
              const pct = (p.count / max) * 100;
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '0.35rem', background: rankColors[idx], color: '#fff', fontSize: '0.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: rankColors[idx], marginLeft: '0.5rem', flexShrink: 0 }}>{p.count}</span>
                  </div>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: rankColors[idx], borderRadius: 9999, transition: 'width 1s ease' }} />
                  </div>
                </div>
              );
            }) : <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 700, padding: '2rem 0' }}>Sin actividad aún</div>}
          </div>

          <div style={{ marginTop: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.3rem' }}>💡 Análisis de Carrito</p>
            <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>Considera crear promociones para los productos más añadidos.</p>
          </div>
        </div>

        {/* ── PEDIDOS RECIENTES ── */}
        <div style={{ background: '#fff', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Pedidos Recientes</span>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.3rem' }}>
              <Package size={14} style={{ color: '#94a3b8', display: 'block' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            {stats.recentOrders.length > 0 ? stats.recentOrders.map((order) => {
              const st = getStatus(order.status);
              return (
                <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.875rem', background: '#f8fafc', borderRadius: '0.875rem', border: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f1f5f9'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                >
                  <div style={{ color: st.color, flexShrink: 0 }}>{st.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customer_email || 'Anónimo'}</p>
                    <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, margin: '0.1rem 0 0' }}>
                      {new Date(order.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>${order.total?.toLocaleString()}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: st.color }}>{st.label}</span>
                  </div>
                </div>
              );
            }) : <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 700, padding: '2rem 0' }}>Sin pedidos aún</div>}
          </div>

          {stats.recentOrders.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ingresos pagados</span>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#059669' }}>${stats.totalRevenue.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* ── LOGÍSTICA (Lector QR) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#0f172a', borderRadius: '1.25rem', padding: '1.5rem', flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: '-2rem', right: '-2rem', width: '8rem', height: '8rem', background: 'rgba(37,99,235,0.15)', borderRadius: '50%', filter: 'blur(40px)' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '0.625rem', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={16} color="#fff" />
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Logística Inteligente</span>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: '0 0 1rem', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                Lector de <span style={{ color: '#60a5fa' }}>Etiquetas QR</span>
              </h3>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QRScanner onScan={(text) => {
                  if (text.startsWith('charlyhome-order-')) {
                    const orderId = text.replace('charlyhome-order-', '');
                    navigate(`/admin/orders?open=${orderId}`);
                  } else {
                    // Si es solo un ID o tiene otro formato, intentamos navegar igual
                    navigate(`/admin/orders?open=${text}`);
                  }
                }} />
              </div>

              <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  onClick={handlePrintLatestLabel}
                  style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '0.625rem', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Printer size={14} /> Imprimir última etiqueta
                </button>
              </div>
            </div>
          </div>

          {/* Accesos Rápidos */}
          <div style={{ background: '#fff', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.25rem' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.875rem' }}>Accesos Rápidos</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'Productos', icon: ShoppingBag, color: '#2563eb', bg: '#eff6ff', path: '/admin/products' },
                { label: 'Pedidos', icon: Package, color: '#059669', bg: '#f0fdf4', path: '/admin/orders' },
                { label: 'Delivery', icon: Truck, color: '#7c3aed', bg: '#f5f3ff', action: () => setChartView(prev => prev === 'delivery' ? null : 'delivery') },
                { label: 'Métricas', icon: Zap, color: '#d97706', bg: '#fffbeb', action: () => setChartView(prev => prev === 'metrics' ? null : 'metrics') },
              ].map((a, i) => (
                <button key={i}
                  onClick={() => {
                    if (a.path) navigate(a.path);
                    if (a.action) a.action();
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                    padding: '0.75rem 0.5rem', background: (chartView === 'delivery' && a.label === 'Delivery') || (chartView === 'metrics' && a.label === 'Métricas') ? '#f1f5f9' : a.bg,
                    borderRadius: '0.875rem', border: (chartView === 'delivery' && a.label === 'Delivery') || (chartView === 'metrics' && a.label === 'Métricas') ? `2px solid ${a.color}` : '2px solid transparent',
                    cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '0.625rem', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <a.icon size={16} color="#fff" />
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569' }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── SECCIÓN DE GRÁFICOS DINÁMICOS ── */}
      {chartView && (
        <div style={{
          background: '#fff', borderRadius: '1.25rem', border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '1.5rem',
          animation: 'slideUp 0.4s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '0.625rem', background: chartView === 'delivery' ? '#f5f3ff' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: chartView === 'delivery' ? '#7c3aed' : '#d97706' }}>
                  {chartView === 'delivery' ? <Truck size={18} /> : <Zap size={18} />}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {chartView === 'delivery' ? 'Análisis de Entregas' : 'Rendimiento de Ingresos'}
                </h3>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, margin: 0 }}>
                Últimos 7 días · Datos actualizados en tiempo real
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <Calendar size={14} color="#94a3b8" />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>7D</span>
              </div>
              <button
                onClick={() => setChartView(null)}
                style={{ padding: '0.4rem', background: '#f1f5f9', border: 'none', borderRadius: '0.5rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>

          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar
                  dataKey={chartView === 'delivery' ? 'deliveries' : 'income'}
                  fill={chartView === 'delivery' ? '#7c3aed' : '#d97706'}
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Promedio Diario</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {chartView === 'metrics'
                  ? `$${Math.round(chartData.reduce((acc, d) => acc + d.income, 0) / 7).toLocaleString()}`
                  : `${(chartData.reduce((acc, d) => acc + d.deliveries, 0) / 7).toFixed(1)}`
                }
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>Punto Máximo</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669', margin: 0 }}>
                {chartView === 'metrics'
                  ? `$${Math.max(...chartData.map(d => d.income)).toLocaleString()}`
                  : `${Math.max(...chartData.map(d => d.deliveries))}`
                }
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => navigate(chartView === 'delivery' ? '/admin/orders' : '/admin/orders')}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Ver reporte completo <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 1200px) {
          .admin-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 1024px) {
          .admin-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .admin-kpi-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
