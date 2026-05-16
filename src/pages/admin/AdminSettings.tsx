import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import { 
  Palette, 
  Upload, 
  Image as ImageIcon, 
  Type,
  Loader2,
  CheckCircle2,
  Lock,
  KeyRound,
  Truck,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

import { useTenant } from '../../context/TenantContext';

const AdminSettings = () => {
  const { tenant } = useTenant();
  const { settings, refreshTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    primaryColor: settings.primaryColor,
    borderRadius: settings.borderRadius,
    siteName: settings.siteName,
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
    announcementText: settings.announcementText || '',
    siteDescription: settings.siteDescription || '',
    freeDeliveryThreshold: settings.freeDeliveryThreshold || 30000,
    deliveryCost: settings.deliveryCost || 3500,
    googleMapsApiKey: '',
    notificationPhone: '',
    telegramToken: '',
    telegramChatId: ''
  });

  const [flowSettings, setFlowSettings] = useState({
    apiKey: '',
    secret: '',
    isSandbox: true
  });

  const [zones, setZones] = useState<any[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);

  const [activeTab, setActiveTab] = useState('design');

  useEffect(() => {
    setFormData({
      primaryColor: settings.primaryColor,
      borderRadius: settings.borderRadius,
      siteName: settings.siteName,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
      announcementText: settings.announcementText || '',
      siteDescription: settings.siteDescription || '',
      freeDeliveryThreshold: settings.freeDeliveryThreshold || 30000,
      deliveryCost: settings.deliveryCost || 3500,
      googleMapsApiKey: settings.googleMapsApiKey || '',
      notificationPhone: settings.notificationPhone || '',
      telegramToken: settings.telegramToken || '',
      telegramChatId: settings.telegramChatId || ''
    });

    const fetchFlowSettings = async () => {
      if (!tenant) return;
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('tenant_id', tenant.id)
        .eq('key', 'flow_settings')
        .maybeSingle();
      
      if (data && data.value) {
        setFlowSettings(data.value as any);
      }
    };

    fetchFlowSettings();

    const fetchZones = async () => {
      if (!tenant) return;
      setLoadingZones(true);
      const { data } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('order_index', { ascending: true });
      if (data) setZones(data);
      setLoadingZones(false);
    };
    fetchZones();
  }, [settings, tenant]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    try {
      setUploading(type);
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.slug}-${type}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `site-assets/${tenant.slug}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [type === 'logo' ? 'logoUrl' : 'faviconUrl']: publicUrl
      }));
      
      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} subido correctamente`);
    } catch (error: any) {
      toast.error('Error al subir imagen: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);

    try {
      // 1. Guardar Tema y Tienda
      const themeValue = {
        primaryColor: formData.primaryColor,
        borderRadius: formData.borderRadius,
        siteName: formData.siteName,
        logoUrl: formData.logoUrl,
        faviconUrl: formData.faviconUrl,
        announcementText: formData.announcementText,
        siteDescription: formData.siteDescription,
        freeDeliveryThreshold: Number(formData.freeDeliveryThreshold),
        deliveryCost: Number(formData.deliveryCost),
        googleMapsApiKey: formData.googleMapsApiKey,
        notificationPhone: formData.notificationPhone,
        telegramToken: formData.telegramToken,
        telegramChatId: formData.telegramChatId
      };

      const { error: themeError } = await supabase
        .from('site_settings')
        .upsert({
          tenant_id: tenant.id,
          key: 'theme',
          value: themeValue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key,tenant_id' });

      if (themeError) throw themeError;

      // 2. Guardar Configuración de Flow
      const { error: flowError } = await supabase
        .from('site_settings')
        .upsert({
          tenant_id: tenant.id,
          key: 'flow_settings',
          value: flowSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key,tenant_id' });

      if (flowError) throw flowError;

      // 3. Guardar Zonas de Despacho
      for (const zone of zones) {
        if (zone.id.startsWith('new-')) {
          // Es una zona nueva
          const { error: insertError } = await supabase
            .from('delivery_zones')
            .insert({
              tenant_id: tenant.id,
              name: zone.name,
              cost: Number(zone.cost || zone.price || 0),
              description: zone.description,
              is_active: zone.is_active,
              order_index: zone.order_index
            });
          if (insertError) throw insertError;
        } else {
          // Actualizar existente
          const { error: zoneError } = await supabase
            .from('delivery_zones')
            .update({ 
              cost: Number(zone.cost || zone.price || 0),
              is_active: zone.is_active,
              name: zone.name,
              description: zone.description
            })
            .eq('id', zone.id);
          if (zoneError) throw zoneError;
        }
      }

      await refreshTheme();
      toast.success('Configuración guardada correctamente');
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Contraseña actualizada exitosamente');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Error al actualizar contraseña: ' + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="admin-settings-container">
      <div className="settings-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Palette size={24} /> Configuración General
        </h2>
        <p>Gestiona la identidad, los pagos y el funcionamiento de tu tienda.</p>
      </div>

      <div className="settings-tabs">
        <button 
          className={`tab-btn ${activeTab === 'design' ? 'active' : ''}`}
          onClick={() => setActiveTab('design')}
        >
          Diseño
        </button>
        <button 
          className={`tab-btn ${activeTab === 'store' ? 'active' : ''}`}
          onClick={() => setActiveTab('store')}
        >
          Tienda
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Pagos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Seguridad
        </button>
      </div>

      <form onSubmit={handleSubmit} className="settings-grid">
        
        {activeTab === 'design' && (
          <>
            {/* Visual Identity Section */}
            <section className="settings-card">
              <div className="card-header">
                <ImageIcon size={20} />
                <h3>Identidad de Marca</h3>
              </div>
              
              <div className="form-group">
                <label>Nombre de la Tienda</label>
                <div className="input-with-icon">
                  <Type size={18} />
                  <input 
                    type="text" 
                    name="siteName" 
                    value={formData.siteName} 
                    onChange={handleInputChange}
                    placeholder="Ej: Charly Home"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Descripción de la Tienda (Footer)</label>
                <textarea 
                  name="siteDescription" 
                  value={formData.siteDescription} 
                  onChange={(e) => setFormData(prev => ({ ...prev, siteDescription: e.target.value }))}
                  placeholder="Ej: Tu tienda de confianza para productos de aseo..."
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #ddd',
                    minHeight: '80px',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div className="upload-section">
                <div className="upload-box">
                  <label>Logo Principal</label>
                  <div className="preview-container">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Preview Logo" />
                    ) : (
                      <div className="no-preview">Sin Logo</div>
                    )}
                  </div>
                  <label className="upload-label">
                    {uploading === 'logo' ? <Loader2 className="spin" /> : <Upload size={16} />}
                    <span>Cambiar Logo</span>
                    <input type="file" onChange={(e) => handleFileUpload(e, 'logo')} hidden accept="image/*" />
                  </label>
                </div>

                <div className="upload-box">
                  <label>Favicon (Tab)</label>
                  <div className="preview-container favicon">
                    {formData.faviconUrl ? (
                      <img src={formData.faviconUrl} alt="Preview Favicon" />
                    ) : (
                      <div className="no-preview">Sin Icono</div>
                    )}
                  </div>
                  <label className="upload-label">
                    {uploading === 'favicon' ? <Loader2 className="spin" /> : <Upload size={16} />}
                    <span>Cambiar Favicon</span>
                    <input type="file" onChange={(e) => handleFileUpload(e, 'favicon')} hidden accept="image/png,image/x-icon" />
                  </label>
                </div>
              </div>
            </section>

            {/* Global Styles Section */}
            <section className="settings-card">
              <div className="card-header">
                <Palette size={20} />
                <h3>Colores y Estilos</h3>
              </div>

              <div className="form-group">
                <label>Color Principal (Marca)</label>
                <div className="color-picker-wrapper">
                  <input 
                    type="color" 
                    name="primaryColor" 
                    value={formData.primaryColor} 
                    onChange={handleInputChange} 
                  />
                  <code>{formData.primaryColor.toUpperCase()}</code>
                </div>
              </div>

              <div className="form-group">
                <label>Redondeo de Bordes: {formData.borderRadius}px</label>
                <input 
                  type="range" 
                  name="borderRadius" 
                  min="0" max="24" 
                  value={formData.borderRadius} 
                  onChange={handleInputChange}
                />
              </div>

              <div className="preview-demo">
                <label>Vista Previa de Botón</label>
                <button 
                  type="button"
                  style={{ 
                    backgroundColor: formData.primaryColor, 
                    borderRadius: `${formData.borderRadius}px`,
                    color: '#fff',
                    padding: '10px 20px',
                    fontWeight: '600',
                    border: 'none',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle2 size={18} /> Ejemplo de Botón
                </button>
              </div>
            </section>
          </>
        )}

        {activeTab === 'store' && (
          <>
            <section className="settings-card">
              <div className="card-header">
                <ImageIcon size={20} />
                <h3>Ajustes de la Tienda</h3>
              </div>
              
              <div className="form-group">
                <label>Texto de Anuncio (Barra Superior)</label>
                <div className="input-with-icon">
                  <Type size={18} />
                  <input 
                    type="text" 
                    name="announcementText" 
                    value={formData.announcementText} 
                    onChange={handleInputChange}
                    placeholder="Ej: DESPACHOS GRATIS POR COMPRAS SOBRE $30.000"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>Monto Mínimo para Envío Gratis ($)</label>
                  <div className="input-with-icon">
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>$</span>
                    <input 
                      type="number" 
                      name="freeDeliveryThreshold" 
                      value={formData.freeDeliveryThreshold} 
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Costo de Envío Base ($)</label>
                  <div className="input-with-icon">
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>$</span>
                    <input 
                      type="number" 
                      name="deliveryCost" 
                      value={formData.deliveryCost} 
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Google Maps API Key (Para autocompletado de direcciones)</label>
                <div className="input-with-icon">
                  <KeyRound size={18} />
                  <input 
                    type="password" 
                    name="googleMapsApiKey" 
                    value={formData.googleMapsApiKey} 
                    onChange={handleInputChange}
                    placeholder="Al pegar tu llave se activará el autocompletado de calles"
                  />
                </div>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                  Deja en blanco para usar el input de dirección tradicional.
                </p>
              </div>
            </section>

            <section className="settings-card">
              <div className="section-header">
                <div style={{ backgroundColor: '#0088cc', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', width: '32px', height: '32px' }}>
                  <Send size={20} />
                </div>
                <h2>Notificaciones Telegram</h2>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Telegram Bot Token</label>
                  <div className="input-with-icon">
                    <KeyRound size={18} />
                    <input 
                      type="password" 
                      name="telegramToken" 
                      value={formData.telegramToken} 
                      onChange={handleInputChange}
                      placeholder="Ej: 123456:ABC-DEF..."
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                    Obtén esto de @BotFather en Telegram.
                  </p>
                </div>

                <div className="form-group">
                  <label>Tu Chat ID</label>
                  <div className="input-with-icon">
                    <Hash size={18} />
                    <input 
                      type="text" 
                      name="telegramChatId" 
                      value={formData.telegramChatId} 
                      onChange={handleInputChange}
                      placeholder="Ej: 987654321"
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                    Tu ID personal de Telegram (consíguelo con @userinfobot).
                  </p>
                </div>
              </div>
            </section>

            <section className="settings-card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Truck size={20} />
                  <h3>Costos de Despacho por Zona</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const newZone = {
                      id: `new-${Date.now()}`,
                      name: 'Nueva Zona',
                      description: 'Comunas de esta zona',
                      price: 0,
                      is_active: true,
                      order_index: zones.length
                    };
                    setZones([...zones, newZone]);
                  }}
                  className="add-zone-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={16} /> Agregar Zona
                </button>
              </div>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                Define precios específicos según la ubicación del cliente. Puedes desactivar zonas para bloquear despachos temporalmente.
              </p>

              {loadingZones ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                  <Loader2 className="spin" size={24} color="var(--primary)" />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {zones.map((zone, index) => (
                    <div key={zone.id} style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: zone.is_active ? '#f8fafc' : '#f1f5f9',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      opacity: zone.is_active ? 1 : 0.7
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="text"
                            value={zone.name}
                            onChange={(e) => {
                              const newZones = [...zones];
                              newZones[index].name = e.target.value;
                              setZones(newZones);
                            }}
                            placeholder="Nombre de la zona (ej: Zona Central)"
                            style={{ 
                              fontWeight: '700', 
                              fontSize: '14px', 
                              background: 'transparent', 
                              border: 'none',
                              borderBottom: '1px solid transparent',
                              padding: '2px 0',
                              width: '100%',
                              outline: 'none',
                              color: '#1e293b'
                            }}
                          />
                          <input 
                            type="text"
                            value={zone.description}
                            onChange={(e) => {
                              const newZones = [...zones];
                              newZones[index].description = e.target.value;
                              setZones(newZones);
                            }}
                            placeholder="Descripción o comunas..."
                            style={{ 
                              fontSize: '12px', 
                              color: '#64748b',
                              background: 'transparent',
                              border: 'none',
                              width: '100%',
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="switch">
                              <input 
                                type="checkbox" 
                                checked={zone.is_active} 
                                onChange={(e) => {
                                  const newZones = [...zones];
                                  newZones[index].is_active = e.target.checked;
                                  setZones(newZones);
                                }}
                              />
                              <span className="slider round"></span>
                            </label>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: zone.is_active ? '#059669' : '#64748b' }}>
                              {zone.is_active ? 'ACTIVA' : 'BLOQUEADA'}
                            </span>
                          </div>
                          <button 
                            type="button"
                            onClick={async () => {
                              if (confirm('¿Estás seguro de eliminar esta zona?')) {
                                if (!zone.id.startsWith('new-')) {
                                  const { error } = await supabase
                                    .from('delivery_zones')
                                    .delete()
                                    .eq('id', zone.id);
                                  if (error) {
                                    toast.error('Error al eliminar: ' + error.message);
                                    return;
                                  }
                                }
                                setZones(zones.filter(z => z.id !== zone.id));
                                toast.success('Zona eliminada');
                              }
                            }}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="input-with-icon" style={{ width: '150px', backgroundColor: '#fff', alignSelf: 'flex-end' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>$</span>
                        <input 
                          type="number" 
                          value={zone.cost || zone.price || 0} 
                          onChange={(e) => {
                            const newZones = [...zones];
                            newZones[index].cost = e.target.value;
                            // Mantener compatibilidad si se usa price en otros lados
                            newZones[index].price = e.target.value; 
                            setZones(newZones);
                          }}
                          style={{ textAlign: 'right' }}
                        />
                      </div>
                    </div>
                  ))}
                  {zones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>
                      No hay zonas configuradas. Usa el botón superior para agregar una.
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'payments' && (
          <>
            <section className="settings-card">
              <div className="card-header">
                <KeyRound size={20} />
                <h3>Configuración de Flow.cl</h3>
              </div>
              
              <div className="alert-info" style={{ 
                padding: '12px', 
                backgroundColor: '#f0f7ff', 
                borderRadius: '8px', 
                marginBottom: '20px',
                fontSize: '13px',
                color: '#0369a1',
                border: '1px solid #bae6fd'
              }}>
                Obtén tus llaves desde el panel de <a href="https://www.flow.cl" target="_blank" rel="noreferrer" style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Flow.cl</a> {'>'} Mis Datos {'>'} Integración.
              </div>

              <div className="form-group">
                <label>Flow API Key</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input 
                    type="text" 
                    value={flowSettings.apiKey} 
                    onChange={(e) => setFlowSettings({...flowSettings, apiKey: e.target.value})}
                    placeholder="Ingresa tu API Key"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Flow Secret Key</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input 
                    type="password" 
                    value={flowSettings.secret} 
                    onChange={(e) => setFlowSettings({...flowSettings, secret: e.target.value})}
                    placeholder="Ingresa tu Secret Key"
                  />
                </div>
              </div>

              <div className="form-group" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <label style={{ margin: 0, flex: 1 }}>Modo de Entorno</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button"
                    onClick={() => setFlowSettings({...flowSettings, isSandbox: true})}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: '1px solid #ddd',
                      backgroundColor: flowSettings.isSandbox ? '#eab308' : '#fff',
                      color: flowSettings.isSandbox ? '#000' : '#666',
                      cursor: 'pointer'
                    }}
                  >
                    SANDBOX (PRUEBAS)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFlowSettings({...flowSettings, isSandbox: false})}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: '1px solid #ddd',
                      backgroundColor: !flowSettings.isSandbox ? '#059669' : '#fff',
                      color: !flowSettings.isSandbox ? '#fff' : '#666',
                      cursor: 'pointer'
                    }}
                  >
                    PRODUCCIÓN (REAL)
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'security' && (
          <section className="settings-card">
            <div className="card-header">
              <Lock size={20} />
              <h3>Seguridad y Contraseña</h3>
            </div>
            
            <div className="security-form-container">
              <div className="form-group">
                <label>Nueva Contraseña</label>
                <div className="input-with-icon">
                  <KeyRound size={18} />
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Escribe la nueva contraseña"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirmar Nueva Contraseña</label>
                <div className="input-with-icon">
                  <KeyRound size={18} />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>

              <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '0' }}>
                <button 
                  type="button" 
                  className="save-btn" 
                  onClick={handlePasswordChange}
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  style={{ background: '#eab308', color: '#000' }}
                >
                  {passwordLoading ? <Loader2 className="spin" /> : 'Actualizar Contraseña'}
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="form-actions">
          <button type="submit" className="save-btn" disabled={loading || uploading !== null}>
            {loading ? <Loader2 className="spin" /> : 'Guardar Todos los Cambios'}
          </button>
        </div>

      </form>

      <style>{`
        .settings-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 2rem;
          border-bottom: 1px solid #e9ecef;
          padding-bottom: 2px;
        }

        .tab-btn {
          padding: 10px 20px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-weight: 600;
          color: #666;
          transition: all 0.2s;
        }

        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .tab-btn:hover:not(.active) {
          color: #333;
          border-bottom-color: #ddd;
        }
        .settings-header {
          margin-bottom: 2rem;
        }
        .settings-header h2 { color: #1a1a1a; margin-bottom: 0.5rem; }
        .settings-header p { color: #666; font-size: 0.95rem; }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .settings-card {
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          border: 1px solid #e9ecef;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1.5rem;
          color: #1a1a1a;
        }

        .card-header h3 { font-size: 1.1rem; margin: 0; }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          color: #444;
        }

        .input-with-icon {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #ddd;
          padding: 8px 12px;
          border-radius: 0.5rem;
        }

        .input-with-icon input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 0.9rem;
        }

        .upload-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .upload-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 1rem;
          border: 2px dashed #eee;
          border-radius: 1rem;
        }

        .preview-container {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .preview-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .preview-container.favicon {
          width: 60px;
          height: 60px;
        }

        .no-preview { color: #999; font-size: 0.8rem; }

        .upload-label {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f8f9fa;
          color: #1a1a1a;
          border-radius: 2rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #dee2e6;
        }

        .upload-label:hover { background: #e9ecef; }

        .color-picker-wrapper {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .color-picker-wrapper input[type="color"] {
          width: 50px;
          height: 50px;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          overflow: hidden;
        }

        .color-picker-wrapper code {
          background: #f1f3f5;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 1rem;
        }

        .save-btn {
          padding: 12px 30px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .save-btn:disabled { background: #999; cursor: not-allowed; transform: none; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .upload-section { grid-template-columns: 1fr; }
        }

        /* Switch Toggle Styles */
        .switch {
          position: relative;
          display: inline-block;
          width: 34px;
          height: 18px;
        }

        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: .4s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 12px;
          width: 12px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
        }

        input:checked + .slider {
          background-color: #059669;
        }

        input:focus + .slider {
          box-shadow: 0 0 1px #059669;
        }

        input:checked + .slider:before {
          transform: translateX(16px);
        }

        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
};

export default AdminSettings;
