import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import { Truck, CheckCircle2, Loader2, Info, Plus, Trash2, MapPin } from 'lucide-react';

export const AdminDelivery = () => {
  const { settings, refreshTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    announcementText: settings.announcementText || '',
    freeDeliveryThreshold: settings.freeDeliveryThreshold || 30000,
    deliveryCost: settings.deliveryCost || 3500
  });
  const [zones, setZones] = useState<any[]>([]);
  const [fetchingZones, setFetchingZones] = useState(true);
  const [newZone, setNewZone] = useState({
    name: '',
    cost: 3500,
    free_shipping_threshold: 30000,
    zone_type: 'metropolitana'
  });

  useEffect(() => {
    setFormData({
      announcementText: settings.announcementText || 'DESPACHOS GRATIS POR COMPRAS SOBRE $30.000 EN SANTIAGO',
      freeDeliveryThreshold: settings.freeDeliveryThreshold || 30000,
      deliveryCost: settings.deliveryCost || 3500
    });
    fetchZones();
  }, [settings]);

  const fetchZones = async () => {
    setFetchingZones(true);
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      setZones(data || []);
    } catch (err: any) {
      toast.error('Error al cargar zonas: ' + err.message);
    } finally {
      setFetchingZones(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'announcementText' ? value : Number(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newThemeSettings = {
        ...settings,
        announcementText: formData.announcementText,
        freeDeliveryThreshold: formData.freeDeliveryThreshold,
        deliveryCost: formData.deliveryCost
      };

      const { error } = await supabase
        .from('site_settings')
        .update({ value: newThemeSettings })
        .eq('key', 'theme');

      if (error) {
        if (error.code === 'PGRST116') {
          // Si no existe, lo insertamos
          await supabase.from('site_settings').insert([{ key: 'theme', value: newThemeSettings }]);
        } else {
          throw error;
        }
      }

      await refreshTheme();
      toast.success('Configuración de despacho actualizada exitosamente', {
        icon: <CheckCircle2 className="text-green-500" />
      });
    } catch (err: any) {
      toast.error('Error al guardar configuración: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZone.name) {
      toast.error('La comuna es obligatoria');
      return;
    }

    try {
      const { error } = await supabase
        .from('delivery_zones')
        .insert([{
          name: newZone.name,
          cost: newZone.cost,
          free_shipping_threshold: newZone.free_shipping_threshold,
          zone_type: newZone.zone_type,
          order_index: zones.length + 1
        }]);

      if (error) throw error;
      
      toast.success('Comuna añadida');
      setNewZone({ name: '', cost: 3500, free_shipping_threshold: 30000, zone_type: 'metropolitana' });
      fetchZones();
    } catch (err: any) {
      toast.error('Error al añadir comuna: ' + err.message);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta comuna?')) return;

    try {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Comuna eliminada');
      fetchZones();
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={28} /> Configuración de Despacho
          </h1>
          <p className="admin-subtitle">Ajusta los costos de envío y las promociones de despacho gratis.</p>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="form-group">
            <label style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={18} className="text-primary" /> Franja de Anuncio Superior
            </label>
            <input 
              type="text" 
              name="announcementText" 
              value={formData.announcementText} 
              onChange={handleInputChange}
              className="settings-input"
              style={{ padding: '12px', fontSize: '15px' }}
              placeholder="Ej: DESPACHOS GRATIS POR COMPRAS SOBRE $30.000 EN SANTIAGO"
            />
            <small className="help-text">
              Este es el texto que aparece en la barra negra en la parte superior de la página web. Si lo dejas vacío, la franja desaparecerá.
            </small>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '16px', fontWeight: 'bold' }}>Monto para Envío Gratis ($)</label>
            <input 
              type="number" 
              name="freeDeliveryThreshold" 
              value={formData.freeDeliveryThreshold} 
              onChange={handleInputChange}
              className="settings-input"
              style={{ padding: '12px', fontSize: '15px' }}
              placeholder="Ej: 30000"
            />
            <small className="help-text">
              El monto en CLP a partir del cual el cliente obtiene envío gratis automáticamente. Esto actualizará la barra de progreso en el carrito de compras.
            </small>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '16px', fontWeight: 'bold' }}>Costo Fijo de Despacho ($)</label>
            <input 
              type="number" 
              name="deliveryCost" 
              value={formData.deliveryCost} 
              onChange={handleInputChange}
              className="settings-input"
              style={{ padding: '12px', fontSize: '15px' }}
              placeholder="Ej: 3500"
            />
            <small className="help-text">
              El costo de envío en CLP que se sumará al total de la compra si el cliente no alcanza el monto para envío gratis.
            </small>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 24px', fontSize: '16px' }}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Truck size={20} />}
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-header" style={{ marginTop: '40px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={28} /> Comunas y Zonas Específicas
          </h1>
          <p className="admin-subtitle">Configura costos y envío gratis personalizados por comuna.</p>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: '800px', marginBottom: '40px' }}>
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleAddZone} style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr 1.2fr 1fr auto', 
            gap: '12px', 
            alignItems: 'flex-end',
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '13px' }}>Nombre Comuna</label>
              <input 
                type="text" 
                value={newZone.name}
                onChange={e => setNewZone({...newZone, name: e.target.value})}
                placeholder="Ej: Providencia"
                className="settings-input"
                style={{ padding: '8px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '13px' }}>Costo ($)</label>
              <input 
                type="number" 
                value={newZone.cost}
                onChange={e => setNewZone({...newZone, cost: Number(e.target.value)})}
                className="settings-input"
                style={{ padding: '8px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '13px' }}>Envío Gratis ($)</label>
              <input 
                type="number" 
                value={newZone.free_shipping_threshold}
                onChange={e => setNewZone({...newZone, free_shipping_threshold: Number(e.target.value)})}
                placeholder="Opcional"
                className="settings-input"
                style={{ padding: '8px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '13px' }}>Tipo</label>
              <select 
                value={newZone.zone_type}
                onChange={e => setNewZone({...newZone, zone_type: e.target.value})}
                className="settings-input"
                style={{ padding: '8px' }}
              >
                <option value="metropolitana">Metropolitana</option>
                <option value="rural">Rural</option>
                <option value="region">Región</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }}>
              <Plus size={20} />
            </button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Comuna</th>
                  <th style={{ padding: '12px' }}>Tipo</th>
                  <th style={{ padding: '12px' }}>Costo</th>
                  <th style={{ padding: '12px' }}>Envío Gratis</th>
                  <th style={{ padding: '12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {fetchingZones ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                      <Loader2 className="animate-spin" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : zones.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No hay comunas configuradas. Se usará el costo global.
                    </td>
                  </tr>
                ) : (
                  zones.map(zone => (
                    <tr key={zone.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{zone.name}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          backgroundColor: zone.zone_type === 'metropolitana' ? '#dcfce7' : zone.zone_type === 'rural' ? '#fef9c3' : '#fee2e2',
                          color: zone.zone_type === 'metropolitana' ? '#166534' : zone.zone_type === 'rural' ? '#854d0e' : '#991b1b',
                          textTransform: 'uppercase'
                        }}>
                          {zone.zone_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>${zone.cost.toLocaleString('es-CL')}</td>
                      <td style={{ padding: '12px' }}>
                        {zone.free_shipping_threshold ? `$${zone.free_shipping_threshold.toLocaleString('es-CL')}` : 'Global'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteZone(zone.id)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
