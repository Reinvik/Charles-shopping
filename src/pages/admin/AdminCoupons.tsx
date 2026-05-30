import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../context/TenantContext';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Loader2, Save, X, Ticket, 
  Percent, DollarSign, Calendar, CheckCircle2, 
  XCircle, ShoppingBag, FolderOpen, Copy, Zap,
  Tag, Clock, Store
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applies_to: 'all' | 'category' | 'product';
  product_id?: string;
  category_id?: string;
  min_purchase_amount: number;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

export const AdminCoupons = () => {
  const { tenant } = useTenant();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    applies_to: 'all' as 'all' | 'category' | 'product',
    product_id: '',
    category_id: '',
    min_purchase_amount: 0,
    is_active: true,
    expires_at: ''
  });

  const fetchData = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const [couponsRes, catRes, prodRes] = await Promise.all([
        supabase
          .from('coupons')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('id, name')
          .eq('tenant_id', tenant.id)
          .order('name', { ascending: true }),
        supabase
          .from('products')
          .select('id, name')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('name', { ascending: true })
      ]);

      if (couponsRes.error) throw couponsRes.error;
      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;

      setCoupons(couponsRes.data || []);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
    } catch (error: any) {
      toast.error('Error al cargar cupones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenant]);

  const openModal = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      applies_to: 'all',
      product_id: '',
      category_id: '',
      min_purchase_amount: 0,
      is_active: true,
      expires_at: ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    if (!formData.code.trim()) {
      toast.error('El código es obligatorio');
      return;
    }

    if (formData.discount_value <= 0) {
      toast.error('El valor del descuento debe ser mayor que 0');
      return;
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      toast.error('El porcentaje de descuento no puede ser mayor al 100%');
      return;
    }

    setSaving(true);

    try {
      const couponData = {
        code: formData.code.trim().toUpperCase(),
        tenant_id: tenant.id,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        applies_to: formData.applies_to,
        product_id: formData.applies_to === 'product' && formData.product_id ? formData.product_id : null,
        category_id: formData.applies_to === 'category' && formData.category_id ? formData.category_id : null,
        min_purchase_amount: Number(formData.min_purchase_amount) || 0,
        is_active: formData.is_active,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
      };

      const { error } = await supabase
        .from('coupons')
        .insert([couponData]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe un cupón con este código en tu tienda.');
        }
        throw error;
      }

      toast.success('Cupón creado exitosamente');
      closeModal();
      fetchData();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`¿Estás seguro de eliminar el cupón "${code}"?`)) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Cupón eliminado');
      fetchData();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const toggleStatus = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);

      if (error) throw error;
      toast.success(`Cupón ${!coupon.is_active ? 'activado' : 'desactivado'}`);
      fetchData();
    } catch (error: any) {
      toast.error('Error al cambiar el estado del cupón');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código "${code}" copiado`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const activeCoupons = coupons.filter(c => c.is_active && !(c.expires_at && new Date(c.expires_at) < new Date()));
  const inactiveCoupons = coupons.filter(c => !c.is_active || (c.expires_at && new Date(c.expires_at) < new Date()));

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Gestión Comercial</p>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Códigos de Descuento</h2>
          <p className="text-sm text-slate-400 mt-1">
            {activeCoupons.length} activos · {inactiveCoupons.length} inactivos
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={18} />
          <span>Nuevo Cupón</span>
        </button>
      </div>

      {/* Stats bar */}
      {coupons.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Cupones', value: coupons.length, icon: Ticket, color: '#6366f1', bg: '#eef2ff' },
            { label: 'Activos', value: activeCoupons.length, icon: CheckCircle2, color: '#10b981', bg: '#f0fdf4' },
            { label: 'Inactivos / Expirados', value: inactiveCoupons.length, icon: XCircle, color: '#f43f5e', bg: '#fff1f2' },
          ].map((stat, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                <stat.icon size={20} />
              </div>
              <div>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{stat.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.1 }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {coupons.length === 0 && (
        <div style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: '1.5rem', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#cbd5e1' }}>
            <Ticket size={36} />
          </div>
          <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155', margin: '0 0 0.5rem' }}>Sin cupones todavía</p>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1.5rem' }}>Crea tu primer código de descuento para impulsar las ventas.</p>
          <button onClick={openModal} style={{ background: 'var(--color-primary, #6366f1)', color: '#fff', border: 'none', borderRadius: '0.75rem', padding: '0.75rem 1.75rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
            Crear mi primer cupón
          </button>
        </div>
      )}

      {/* Coupons Grid - Active first */}
      {coupons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {activeCoupons.length > 0 && (
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} /> Cupones Activos
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {activeCoupons.map(coupon => (
                  <CouponCard
                    key={coupon.id}
                    coupon={coupon}
                    categories={categories}
                    products={products}
                    onToggle={toggleStatus}
                    onDelete={handleDelete}
                    onCopy={copyCode}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveCoupons.length > 0 && (
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <XCircle size={12} /> Inactivos / Expirados
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', opacity: 0.7 }}>
                {inactiveCoupons.map(coupon => (
                  <CouponCard
                    key={coupon.id}
                    coupon={coupon}
                    categories={categories}
                    products={products}
                    onToggle={toggleStatus}
                    onDelete={handleDelete}
                    onCopy={copyCode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
              <div>
                <h3 className="text-xl font-black text-white">Nuevo Cupón</h3>
                <p className="text-xs text-indigo-200 mt-0.5">Define las reglas del descuento</p>
              </div>
              <button 
                onClick={closeModal} 
                className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Código */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Código del Cupón</label>
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ej: VERANO25"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm font-black uppercase text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    title="Generar código aleatorio"
                    className="px-3 py-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-xl transition-all border border-slate-200 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Zap size={14} />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Tipo y Valor de Descuento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Tipo Descuento</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm appearance-none cursor-pointer text-slate-700 font-semibold"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Valor Descuento</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {formData.discount_type === 'percentage' ? <Percent size={14} /> : <DollarSign size={14} />}
                    </span>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.discount_value || ''}
                      onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                      placeholder={formData.discount_type === 'percentage' ? 'Ej: 15' : 'Ej: 5000'}
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm font-bold text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Alcance */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">¿A qué aplica?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: 'Toda la Tienda', icon: Store },
                    { value: 'category', label: 'Categoría', icon: FolderOpen },
                    { value: 'product', label: 'Producto', icon: ShoppingBag },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, applies_to: opt.value as any, product_id: '', category_id: '' })}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-bold ${
                        formData.applies_to === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <opt.icon size={16} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector condicional: Categoría */}
              {formData.applies_to === 'category' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Seleccionar Categoría</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm appearance-none cursor-pointer text-slate-700"
                  >
                    <option value="" disabled>Seleccione una categoría...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selector condicional: Producto */}
              {formData.applies_to === 'product' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Seleccionar Producto</label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm appearance-none cursor-pointer text-slate-700"
                  >
                    <option value="" disabled>Seleccione un producto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Compra Mínima y Fecha de Expiración */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Compra Mínima ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_purchase_amount || ''}
                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: Number(e.target.value) })}
                    placeholder="Sin mínimo"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm font-semibold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Fecha Expiración</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm text-slate-700 font-medium"
                  />
                </div>
              </div>

              {/* Toggle activo */}
              <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${formData.is_active ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Activar inmediatamente</h4>
                  <p className="text-[10px] text-slate-400">El cupón estará disponible al crearlo.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Acciones */}
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all border border-slate-100"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Crear Cupón</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── CouponCard Component ─────────────────────────────────────────────────────
const CouponCard = ({
  coupon,
  categories,
  products,
  onToggle,
  onDelete,
  onCopy
}: {
  coupon: Coupon;
  categories: Category[];
  products: Product[];
  onToggle: (c: Coupon) => void;
  onDelete: (id: string, code: string) => void;
  onCopy: (code: string) => void;
}) => {
  const isExpired = !!(coupon.expires_at && new Date(coupon.expires_at) < new Date());
  const isActive = coupon.is_active && !isExpired;

  const scopeLabel =
    coupon.applies_to === 'all' ? 'Toda la Tienda' :
    coupon.applies_to === 'category'
      ? (categories.find(c => c.id === coupon.category_id)?.name || 'Categoría')
      : (products.find(p => p.id === coupon.product_id)?.name || 'Producto');

  const scopeIcon =
    coupon.applies_to === 'all' ? <Store size={11} /> :
    coupon.applies_to === 'category' ? <FolderOpen size={11} /> :
    <ShoppingBag size={11} />;

  const accentColor = isExpired ? '#94a3b8' : isActive ? '#6366f1' : '#94a3b8';

  const daysLeft = coupon.expires_at
    ? Math.ceil((new Date(coupon.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div style={{
      background: '#fff',
      borderRadius: '1.25rem',
      border: `1px solid ${isActive ? '#e0e7ff' : '#e2e8f0'}`,
      boxShadow: isActive ? '0 2px 12px rgba(99,102,241,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      transition: 'transform 0.15s, box-shadow 0.15s',
      position: 'relative'
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = isActive ? '0 8px 24px rgba(99,102,241,0.15)' : '0 4px 16px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = isActive ? '0 2px 12px rgba(99,102,241,0.08)' : '0 1px 4px rgba(0,0,0,0.04)';
      }}
    >
      {/* Top stripe */}
      <div style={{ height: 4, background: isActive ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : '#e2e8f0' }} />

      <div style={{ padding: '1.1rem 1.25rem' }}>
        {/* Code + copy */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              background: isActive ? '#eef2ff' : '#f8fafc',
              color: accentColor,
              fontFamily: "'Courier New', Courier, monospace",
              fontWeight: 900,
              fontSize: '1.05rem',
              letterSpacing: '0.08em',
              padding: '0.35rem 0.75rem',
              borderRadius: '0.5rem',
              border: `1.5px dashed ${isActive ? '#c7d2fe' : '#e2e8f0'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Tag size={14} />
              {coupon.code}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => onCopy(coupon.code)}
              title="Copiar código"
              style={{ padding: '0.4rem', borderRadius: '0.5rem', border: 'none', background: '#f8fafc', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; (e.currentTarget as HTMLElement).style.color = '#6366f1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => onDelete(coupon.id, coupon.code)}
              title="Eliminar cupón"
              style={{ padding: '0.4rem', borderRadius: '0.5rem', border: 'none', background: '#f8fafc', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff1f2'; (e.currentTarget as HTMLElement).style.color = '#f43f5e'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Discount value — big hero number */}
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: 900, color: isActive ? (coupon.discount_type === 'percentage' ? '#6366f1' : '#10b981') : '#94a3b8', lineHeight: 1 }}>
            {coupon.discount_type === 'percentage'
              ? `${coupon.discount_value}% OFF`
              : `$${coupon.discount_value.toLocaleString('es-CL')} OFF`
            }
          </span>
        </div>

        {/* Info pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.875rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.25rem 0.6rem', fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
            {scopeIcon}
            {scopeLabel}
          </span>
          {coupon.min_purchase_amount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.25rem 0.6rem', fontSize: '0.65rem', fontWeight: 700, color: '#92400e' }}>
              Mín. ${coupon.min_purchase_amount.toLocaleString('es-CL')}
            </span>
          )}
          {coupon.expires_at && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              background: isExpired ? '#fff1f2' : (daysLeft !== null && daysLeft <= 3 ? '#fff7ed' : '#f0fdf4'),
              border: `1px solid ${isExpired ? '#fecdd3' : (daysLeft !== null && daysLeft <= 3 ? '#fed7aa' : '#bbf7d0')}`,
              borderRadius: '0.5rem', padding: '0.25rem 0.6rem', fontSize: '0.65rem', fontWeight: 700,
              color: isExpired ? '#f43f5e' : (daysLeft !== null && daysLeft <= 3 ? '#c2410c' : '#15803d')
            }}>
              <Clock size={10} />
              {isExpired
                ? 'Expirado'
                : daysLeft !== null && daysLeft <= 3
                  ? `Expira en ${daysLeft}d`
                  : new Date(coupon.expires_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
              }
            </span>
          )}
          {!coupon.expires_at && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.25rem 0.6rem', fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
              <Calendar size={10} />
              Sin vencimiento
            </span>
          )}
        </div>

        {/* Toggle status */}
        <button
          onClick={() => onToggle(coupon)}
          disabled={isExpired}
          style={{
            width: '100%',
            padding: '0.6rem',
            borderRadius: '0.75rem',
            border: 'none',
            cursor: isExpired ? 'not-allowed' : 'pointer',
            fontWeight: 800,
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s',
            background: isExpired ? '#f8fafc' : isActive ? '#f0fdf4' : '#fff1f2',
            color: isExpired ? '#94a3b8' : isActive ? '#16a34a' : '#f43f5e',
          }}
        >
          {isExpired
            ? <><XCircle size={13} /> Expirado</>
            : isActive
              ? <><CheckCircle2 size={13} /> Activo · Clic para pausar</>
              : <><XCircle size={13} /> Inactivo · Clic para activar</>
          }
        </button>
      </div>
    </div>
  );
};
