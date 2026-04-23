import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import { Truck, CheckCircle2, Loader2, Info } from 'lucide-react';

export const AdminDelivery = () => {
  const { settings, refreshTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    announcementText: settings.announcementText || '',
    freeDeliveryThreshold: settings.freeDeliveryThreshold || 30000,
    deliveryCost: settings.deliveryCost || 3500
  });

  useEffect(() => {
    setFormData({
      announcementText: settings.announcementText || 'DESPACHOS GRATIS POR COMPRAS SOBRE $30.000 EN SANTIAGO',
      freeDeliveryThreshold: settings.freeDeliveryThreshold || 30000,
      deliveryCost: settings.deliveryCost || 3500
    });
  }, [settings]);

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
    </div>
  );
};
