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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: '#ff4d4d' }} />
      </div>
    );
  }

  const activeCoupons = coupons.filter(c => c.is_active && !(c.expires_at && new Date(c.expires_at) < new Date()));
  const inactiveCoupons = coupons.filter(c => !c.is_active || (c.expires_at && new Date(c.expires_at) < new Date()));

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px 0' }}>Gestión Comercial</p>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Códigos de Descuento</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '6px 0 0 0', fontWeight: 500 }}>
            {activeCoupons.length} activos · {inactiveCoupons.length} inactivos
          </p>
        </div>
        <button
          onClick={openModal}
          className="c-btn-primary"
        >
          <Plus size={18} />
          <span>Nuevo Cupón</span>
        </button>
      </div>

      {/* Stats bar */}
      {coupons.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Cupones', value: coupons.length, icon: Ticket, color: '#e60000', bg: '#fff5f5' },
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
          <button onClick={openModal} style={{ background: '#e60000', color: '#fff', border: 'none', borderRadius: '0.75rem', padding: '0.75rem 1.75rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(230, 0, 0, 0.2)' }}>
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
        <div className="c-modal-overlay">
          <div className="c-modal-container">
            <div className="c-modal-header">
              <div>
                <h3 className="c-modal-title">Nuevo Cupón</h3>
                <p className="c-modal-subtitle">Define las reglas del descuento</p>
              </div>
              <button 
                onClick={closeModal} 
                className="c-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="c-modal-form">
              {/* Código */}
              <div className="c-form-group">
                <label className="c-label">Código del Cupón</label>
                <div className="c-input-wrapper">
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ej: VERANO25"
                    className="c-input"
                    style={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    title="Generar código aleatorio"
                    className="c-btn-auto"
                  >
                    <Zap size={13} />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Tipo y Valor de Descuento */}
              <div className="c-grid-2">
                <div className="c-form-group">
                  <label className="c-label">Tipo Descuento</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="c-select"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo ($)</option>
                  </select>
                </div>
                <div className="c-form-group">
                  <label className="c-label">Valor Descuento</label>
                  <div className="c-relative-input">
                    <span className="c-input-icon">
                      {formData.discount_type === 'percentage' ? <Percent size={13} /> : <DollarSign size={13} />}
                    </span>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.discount_value || ''}
                      onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                      placeholder={formData.discount_type === 'percentage' ? 'Ej: 15' : 'Ej: 5000'}
                      className="c-input c-input-with-icon"
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                </div>
              </div>

              {/* Alcance */}
              <div className="c-form-group">
                <label className="c-label">¿A qué aplica?</label>
                <div className="c-scope-selector">
                  {[
                    { value: 'all', label: 'Toda la Tienda', icon: Store },
                    { value: 'category', label: 'Categoría', icon: FolderOpen },
                    { value: 'product', label: 'Producto', icon: ShoppingBag },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, applies_to: opt.value as any, product_id: '', category_id: '' })}
                      className={`c-scope-btn ${formData.applies_to === opt.value ? 'active' : ''}`}
                    >
                      <opt.icon size={15} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector condicional: Categoría */}
              {formData.applies_to === 'category' && (
                <div className="c-form-group">
                  <label className="c-label">Seleccionar Categoría</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="c-select"
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
                <div className="c-form-group">
                  <label className="c-label">Seleccionar Producto</label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="c-select"
                  >
                    <option value="" disabled>Seleccione un producto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Compra Mínima y Fecha de Expiración */}
              <div className="c-grid-2">
                <div className="c-form-group">
                  <label className="c-label">Compra Mínima ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_purchase_amount || ''}
                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: Number(e.target.value) })}
                    placeholder="Sin mínimo"
                    className="c-input"
                  />
                </div>
                <div className="c-form-group">
                  <label className="c-label">Fecha Expiración</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="c-input"
                    style={{ fontWeight: 500 }}
                  />
                </div>
              </div>

              {/* Toggle activo */}
              <div className="c-toggle-card">
                <div className="c-toggle-info">
                  <h4 className="c-toggle-title">Activar inmediatamente</h4>
                  <p className="c-toggle-desc">El cupón estará disponible al crearlo.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`c-switch ${formData.is_active ? 'active' : ''}`}
                >
                  <span className="c-switch-handle" />
                </button>
              </div>

              {/* Acciones */}
              <div className="c-actions">
                <button
                  type="button"
                  onClick={closeModal}
                  className="c-btn c-btn-cancel"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="c-btn c-btn-submit"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Crear Cupón</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estilos locales para corregir la falta de Tailwind y mejorar el diseño */}
      <style>{`
        .c-btn-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #ff4d4d 0%, #b30000 100%);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.85rem;
          font-weight: 800;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(230, 0, 0, 0.25);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.85rem;
        }

        .c-btn-primary:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(230, 0, 0, 0.35);
          filter: brightness(1.05);
        }

        .c-btn-primary:active {
          transform: translateY(0) scale(0.98);
        }

        /* Modal Estilos Premium */
        .c-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(10, 10, 10, 0.7);
          backdrop-filter: blur(6px);
          z-index: 1500; /* Queda siempre por encima del menú de administración (1000) */
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: c-fadeIn 0.22s ease-out;
        }

        .c-modal-container {
          background: #ffffff;
          border-radius: 1.5rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          border: 1px solid rgba(0, 0, 0, 0.05);
          animation: c-scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .c-modal-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #ff4d4d 0%, #b30000 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #fff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .c-modal-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: white;
        }

        .c-modal-subtitle {
          margin: 2px 0 0 0;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.85);
        }

        .c-close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .c-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        .c-modal-form {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .c-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .c-label {
          font-size: 0.7rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-left: 2px;
        }

        .c-input-wrapper {
          display: flex;
          gap: 0.5rem;
        }

        .c-input {
          flex: 1;
          padding: 0.65rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          background: #f8fafc;
          transition: all 0.2s;
        }

        .c-input:focus {
          outline: none;
          border-color: #ff4d4d;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(255, 77, 77, 0.15);
        }

        .c-select {
          padding: 0.65rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .c-select:focus {
          outline: none;
          border-color: #ff4d4d;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(255, 77, 77, 0.15);
        }

        .c-btn-auto {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          padding: 0 1rem;
          font-size: 0.75rem;
          font-weight: 800;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          transition: all 0.2s;
        }

        .c-btn-auto:hover {
          background: #ffeded;
          color: #e60000;
          border-color: #ffcccc;
        }

        .c-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .c-relative-input {
          position: relative;
        }

        .c-input-icon {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .c-input-with-icon {
          padding-left: 2rem;
        }

        .c-scope-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .c-scope-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.75rem;
          border-radius: 0.75rem;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }

        .c-scope-btn:hover {
          border-color: #cbd5e1;
          background: #f1f5f9;
        }

        .c-scope-btn.active {
          border-color: #ff4d4d;
          background: #fff5f5;
          color: #e60000;
        }

        .c-toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1rem;
          border-radius: 0.85rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .c-toggle-info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .c-toggle-title {
          font-size: 0.75rem;
          font-weight: 800;
          color: #334155;
          margin: 0;
        }

        .c-toggle-desc {
          font-size: 0.65rem;
          color: #94a3b8;
          margin: 0;
        }

        .c-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          border-radius: 9999px;
          background-color: #cbd5e1;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
          padding: 0;
        }

        .c-switch.active {
          background-color: #10b981;
        }

        .c-switch-handle {
          display: block;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          transition: transform 0.2s;
          transform: translateX(3px);
        }

        .c-switch.active .c-switch-handle {
          transform: translateX(23px);
        }

        .c-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .c-btn {
          flex: 1;
          padding: 0.75rem;
          border-radius: 0.75rem;
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }

        .c-btn-cancel {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .c-btn-cancel:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .c-btn-submit {
          background: linear-gradient(135deg, #ff4d4d 0%, #b30000 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(230, 0, 0, 0.2);
        }

        .c-btn-submit:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(230, 0, 0, 0.3);
        }

        .c-btn-submit:active {
          transform: translateY(0);
        }

        .c-btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Animaciones */
        @keyframes c-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes c-scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
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

  const accentColor = isExpired ? '#94a3b8' : isActive ? '#e60000' : '#94a3b8';

  const daysLeft = coupon.expires_at
    ? Math.ceil((new Date(coupon.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div style={{
      background: '#fff',
      borderRadius: '1.25rem',
      border: `1px solid ${isActive ? '#ffe5e5' : '#e2e8f0'}`,
      boxShadow: isActive ? '0 2px 12px rgba(230,0,0,0.04)' : '0 1px 4px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      transition: 'transform 0.15s, box-shadow 0.15s',
      position: 'relative'
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = isActive ? '0 8px 24px rgba(230,0,0,0.1)' : '0 4px 16px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = isActive ? '0 2px 12px rgba(230,0,0,0.04)' : '0 1px 4px rgba(0,0,0,0.04)';
      }}
    >
      {/* Top stripe */}
      <div style={{ height: 4, background: isActive ? 'linear-gradient(90deg, #ff4d4d, #b30000)' : '#e2e8f0' }} />

      <div style={{ padding: '1.1rem 1.25rem' }}>
        {/* Code + copy */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              background: isActive ? '#fff5f5' : '#f8fafc',
              color: accentColor,
              fontFamily: "'Courier New', Courier, monospace",
              fontWeight: 900,
              fontSize: '1.05rem',
              letterSpacing: '0.08em',
              padding: '0.35rem 0.75rem',
              borderRadius: '0.5rem',
              border: `1.5px dashed ${isActive ? '#ffcccc' : '#e2e8f0'}`,
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
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff5f5'; (e.currentTarget as HTMLElement).style.color = '#e60000'; }}
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
          <span style={{ fontSize: '2rem', fontWeight: 900, color: isActive ? '#e60000' : '#94a3b8', lineHeight: 1 }}>
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

