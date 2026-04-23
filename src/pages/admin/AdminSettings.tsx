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
  KeyRound
} from 'lucide-react';

const AdminSettings = () => {
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
    faviconUrl: settings.faviconUrl
  });

  useEffect(() => {
    setFormData({
      primaryColor: settings.primaryColor,
      borderRadius: settings.borderRadius,
      siteName: settings.siteName,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl
    });
  }, [settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(type);
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

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
    setLoading(true);

    try {
      const { error } = await supabase
        .from('site_settings')
        .update({
          value: {
            primaryColor: formData.primaryColor,
            borderRadius: formData.borderRadius,
            siteName: formData.siteName,
            logoUrl: formData.logoUrl,
            faviconUrl: formData.faviconUrl
          },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'theme');

      if (error) throw error;

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
          <Palette size={24} /> Personalización de Diseño
        </h2>
        <p>Ajusta los colores, marca e identidad visual de tu tienda.</p>
      </div>

      <form onSubmit={handleSubmit} className="settings-grid">
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
                placeholder="Ej: Charles Shopping"
              />
            </div>
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
                <input type="file" onChange={(e) => handleFileUpload(e, 'favicon')} hidden accept="image/png,image/svg+xml,image/x-icon" />
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

        <div className="form-actions">
          <button type="submit" className="save-btn" disabled={loading || uploading !== null}>
            {loading ? <Loader2 className="spin" /> : 'Guardar Cambios'}
          </button>
        </div>
        {/* Password Change Section */}
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

      </form>

      <style>{`
        .admin-settings-container {
          max-width: 900px;
          margin: 0 auto;
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
      `}</style>
    </div>
  );
};

export default AdminSettings;
