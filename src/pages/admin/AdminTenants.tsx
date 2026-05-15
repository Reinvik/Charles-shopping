import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Updated for better refresh
import { useTenant } from '../../context/TenantContext';
import { 
  Plus, 
  Store, 
  Globe, 
  ExternalLink, 
  Settings, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Layout,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  slug: string;
  display_name: string;
  custom_domain: string | null;
  created_at: string;
}

export const AdminTenants = () => {
  const { tenant: currentTenant, setTenantById } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    display_name: '',
    custom_domain: ''
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tenant_registry')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) toast.error('Error al cargar tiendas');
    else setTenants(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug || !formData.display_name) {
      toast.error('Slug y Nombre son obligatorios');
      return;
    }

    const slugLower = formData.slug.toLowerCase().replace(/ /g, '-');

    const { error } = await supabase
      .from('tenant_registry')
      .insert([{
        slug: slugLower,
        display_name: formData.display_name,
        schema_name: `client_${slugLower}`,
        custom_domain: formData.custom_domain || null
      }]);

    if (error) {
      if (error.code === '23505') toast.error('El slug ya está en uso');
      else toast.error('Error al crear tienda: ' + error.message);
    } else {
      toast.success('Tienda creada exitosamente');
      setIsAdding(false);
      setFormData({ slug: '', display_name: '', custom_domain: '' });
      fetchTenants();
    }
  };

  const handleSwitch = async (tenantId: string) => {
    await setTenantById(tenantId);
    toast.success('Has cambiado de tienda');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la tienda "${name}"? Esta acción no se puede deshacer y podría afectar a los datos asociados.`)) {
      return;
    }

    const { error } = await supabase
      .from('tenant_registry')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar tienda: ' + error.message);
    } else {
      toast.success('Tienda eliminada');
      fetchTenants();
    }
  };

  const copyUrl = (slug: string) => {
    const url = `https://${slug}.tiendasmart.cl`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  return (
    <div className="admin-tenants">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Gestión de Tiendas</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Crea y administra todas las tiendas de la plataforma.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="add-btn"
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', background: '#E60000', 
            color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' 
          }}
        >
          <Plus size={20} />
          Nueva Tienda
        </button>
      </div>

      {isAdding && (
        <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '2rem', border: '1px solid #f0f0f0' }}>
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '800' }}>Configurar Nueva Tienda</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Nombre de la Tienda</label>
              <input 
                type="text" 
                value={formData.display_name}
                onChange={e => setFormData({...formData, display_name: e.target.value})}
                placeholder="Ej: Bazar Central"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #eee' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Slug (subdominio)</label>
              <input 
                type="text" 
                value={formData.slug}
                onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-')})}
                placeholder="ej: bazar-central"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #eee' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Dominio Personalizado (Opcional)</label>
              <input 
                type="text" 
                value={formData.custom_domain}
                onChange={e => setFormData({...formData, custom_domain: e.target.value})}
                placeholder="www.mitienda.cl"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #eee' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>Crear</button>
              <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #eee', background: 'none' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto' }} size={40} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {tenants.map(t => (
            <div 
              key={t.id} 
              style={{ 
                background: 'white', 
                padding: '1.5rem', 
                borderRadius: '20px', 
                border: t.id === currentTenant?.id ? '2px solid #E60000' : '1px solid #f0f0f0',
                position: 'relative',
                transition: 'all 0.2s'
              }}
            >
              <button 
                onClick={() => handleDelete(t.id, t.display_name)}
                style={{ 
                  position: 'absolute', top: '15px', right: '15px', background: 'none', 
                  border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '5px',
                  opacity: 0.4, transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
              >
                <Trash2 size={18} />
              </button>

              {t.id === currentTenant?.id && (
                <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#E60000', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '900' }}>
                  ACTIVA AHORA
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '50px', height: '50px', background: '#f8fafc', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <Store size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: '800', margin: 0 }}>{t.display_name}</h4>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>ID: {t.id.substring(0,8)}...</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666' }}>
                  <Layout size={14} />
                  <span>{t.slug}.tiendasmart.cl</span>
                  <button onClick={() => copyUrl(t.slug)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <Copy size={12} />
                  </button>
                </div>
                {t.custom_domain && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666' }}>
                    <Globe size={14} />
                    <span>{t.custom_domain}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => handleSwitch(t.id)}
                  style={{ 
                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none', 
                    background: t.id === currentTenant?.id ? '#f8fafc' : '#111', 
                    color: t.id === currentTenant?.id ? '#94a3b8' : 'white',
                    fontWeight: '700', fontSize: '13px', cursor: t.id === currentTenant?.id ? 'default' : 'pointer'
                  }}
                  disabled={t.id === currentTenant?.id}
                >
                  {t.id === currentTenant?.id ? 'Gestionando...' : 'Administrar Tienda'}
                </button>
                <a 
                  href={`https://${t.slug}.tiendasmart.cl`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ 
                    width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    borderRadius: '10px', border: '1.5px solid #eee', color: '#666' 
                  }}
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
