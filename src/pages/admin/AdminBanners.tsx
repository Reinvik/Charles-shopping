import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../context/TenantContext';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  MoveUp, 
  MoveDown,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Upload,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  button_link: string;
  order_index: number;
  is_active: boolean;
  tenant_id: string;
}

export const AdminBanners: React.FC = () => {
  const { tenant } = useTenant();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Image mode: 'upload' | 'url'
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Link configuration
  const [linkType, setLinkType] = useState<'home' | 'category' | 'product' | 'custom'>('home');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  // Form state
  const [formData, setFormData] = useState<Partial<Banner>>({
    title: '',
    subtitle: '',
    image_url: '',
    button_text: 'Comprar Ahora',
    button_link: '/',
    is_active: true
  });

  useEffect(() => {
    if (tenant) {
      fetchBanners();
      fetchAssets();
    }
  }, [tenant]);

  // Determine form link type when editing a banner
  useEffect(() => {
    if (editingId && formData.button_link) {
      const link = formData.button_link;
      if (link === '/') {
        setLinkType('home');
      } else if (categories.some(c => c.id === link)) {
        setLinkType('category');
        setSelectedCategoryId(link);
      } else if (products.some(p => p.id === link)) {
        setLinkType('product');
        setSelectedProductId(link);
      } else {
        setLinkType('custom');
        setCustomUrl(link);
      }
      
      // Determine image mode based on URL
      if (formData.image_url && (formData.image_url.includes('/banners/') || formData.image_url.includes('/products/'))) {
        setImageMode('upload');
      } else {
        setImageMode('url');
      }
    }
  }, [editingId, categories, products]);

  const fetchBanners = async () => {
    if (!tenant) return;
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('order_index', { ascending: true });
    
    if (error) {
      toast.error('Error al cargar banners');
    } else {
      setBanners(data || []);
    }
  };

  const fetchAssets = async () => {
    if (!tenant) return;
    try {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('id, name').eq('tenant_id', tenant.id).order('name'),
        supabase.from('products').select('id, name').eq('tenant_id', tenant.id).eq('is_active', true).order('name')
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    } catch (e) {
      console.error('Error al cargar activos:', e);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.slug}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      // Upload to 'products' bucket under 'banners' subfolder
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Imagen de banner subida correctamente');
    } catch (err: any) {
      console.error('Error al subir imagen de banner:', err);
      toast.error('Error al subir: ' + (err.message || 'Error desconocido'));
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    if (!formData.title || !formData.image_url) {
      toast.error('Título e imagen son obligatorios');
      return;
    }

    // Determine final button link
    let finalButtonLink = '/';
    if (linkType === 'category') {
      if (!selectedCategoryId) {
        toast.error('Selecciona una categoría de destino');
        return;
      }
      finalButtonLink = selectedCategoryId;
    } else if (linkType === 'product') {
      if (!selectedProductId) {
        toast.error('Selecciona un producto de destino');
        return;
      }
      finalButtonLink = selectedProductId;
    } else if (linkType === 'custom') {
      if (!customUrl) {
        toast.error('Escribe la URL o link personalizado');
        return;
      }
      finalButtonLink = customUrl;
    }

    const bannerPayload = {
      ...formData,
      button_link: finalButtonLink
    };

    if (editingId) {
      const { error } = await supabase
        .from('banners')
        .update(bannerPayload)
        .eq('id', editingId)
        .eq('tenant_id', tenant.id);
      
      if (error) toast.error('Error al actualizar');
      else {
        toast.success('Banner actualizado');
        setEditingId(null);
        fetchBanners();
      }
    } else {
      const { error } = await supabase
        .from('banners')
        .insert([{ ...bannerPayload, tenant_id: tenant.id, order_index: banners.length }]);
      
      if (error) toast.error('Error al crear');
      else {
        toast.success('Banner creado');
        setIsAdding(false);
        setFormData({
          title: '',
          subtitle: '',
          image_url: '',
          button_text: 'Comprar Ahora',
          button_link: '/',
          is_active: true
        });
        fetchBanners();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant) return;
    if (!confirm('¿Estás seguro de eliminar este banner?')) return;
    
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant.id);
    
    if (error) toast.error('Error al eliminar');
    else {
      toast.success('Banner eliminado');
      fetchBanners();
    }
  };

  const toggleStatus = async (banner: Banner) => {
    if (!tenant) return;
    const { error } = await supabase
      .from('banners')
      .update({ is_active: !banner.is_active })
      .eq('id', banner.id)
      .eq('tenant_id', tenant.id);
    
    if (error) toast.error('Error al actualizar estado');
    else fetchBanners();
  };

  const moveBanner = async (index: number, direction: 'up' | 'down') => {
    if (!tenant) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === banners.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const currentBanner = banners[index];
    const targetBanner = banners[newIndex];

    const { error: err1 } = await supabase
      .from('banners')
      .update({ order_index: targetBanner.order_index })
      .eq('id', currentBanner.id)
      .eq('tenant_id', tenant.id);

    const { error: err2 } = await supabase
      .from('banners')
      .update({ order_index: currentBanner.order_index })
      .eq('id', targetBanner.id)
      .eq('tenant_id', tenant.id);

    if (err1 || err2) toast.error('Error al reordenar');
    else fetchBanners();
  };

  const getDestinationLabel = (link: string) => {
    if (link === '/') return 'Inicio / Todo';
    const cat = categories.find(c => c.id === link);
    if (cat) return `Categoría: ${cat.name}`;
    const prod = products.find(p => p.id === link);
    if (prod) return `Producto: ${prod.name}`;
    return `URL: ${link}`;
  };

  return (
    <div className="admin-banners">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <p style={{ color: '#666' }}>Gestiona los banners y anuncios deslizantes de la página principal.</p>
        <button 
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setImageMode('upload');
            setLinkType('home');
            setSelectedCategoryId('');
            setSelectedProductId('');
            setCustomUrl('');
            setFormData({ title: '', subtitle: '', image_url: '', button_text: 'Comprar Ahora', button_link: '/', is_active: true });
          }}
          className="add-btn"
        >
          <Plus size={20} />
          Nuevo Banner
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="banner-form-card">
          <div className="form-header">
            <h3>{editingId ? 'Editar Banner' : 'Nuevo Banner'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="close-btn">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              
              <div className="form-group">
                <label>Título del Banner</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Ej: Grandes Ofertas de Invierno"
                  required
                />
              </div>

              <div className="form-group">
                <label>Subtítulo / Descripción</label>
                <input 
                  type="text" 
                  value={formData.subtitle} 
                  onChange={e => setFormData({...formData, subtitle: e.target.value})}
                  placeholder="Ej: Descuentos de hasta el 30% en papeles y toallas"
                />
              </div>

              <div className="form-group col-span-2">
                <label>Origen de la Imagen</label>
                <div className="mode-tabs">
                  <button 
                    type="button" 
                    className={`mode-tab ${imageMode === 'upload' ? 'active' : ''}`}
                    onClick={() => setImageMode('upload')}
                  >
                    <Upload size={16} /> Subir Imagen local
                  </button>
                  <button 
                    type="button" 
                    className={`mode-tab ${imageMode === 'url' ? 'active' : ''}`}
                    onClick={() => setImageMode('url')}
                  >
                    <LinkIcon size={16} /> Pegar URL de Internet
                  </button>
                </div>

                {imageMode === 'upload' ? (
                  <div className="image-upload-area">
                    {formData.image_url ? (
                      <div className="preview-box">
                        <img src={formData.image_url} alt="Preview" />
                        <button 
                          type="button" 
                          className="remove-img-btn"
                          onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        >
                          <X size={16} /> Quitar
                        </button>
                      </div>
                    ) : (
                      <label className="upload-placeholder">
                        {uploadingImage ? (
                          <div className="uploading-spinner">
                            <Loader2 className="spin" size={32} />
                            <span>Subiendo imagen...</span>
                          </div>
                        ) : (
                          <>
                            <Upload size={32} style={{ color: '#94a3b8' }} />
                            <span>Haz clic para seleccionar o arrastra una imagen</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Recomendado: Proporción panorámica 3:1 (ej: 1920x640px)</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          onChange={handleImageUpload} 
                          accept="image/*" 
                          hidden 
                          disabled={uploadingImage}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="input-with-icon">
                    <ImageIcon size={18} />
                    <input 
                      type="text" 
                      value={formData.image_url} 
                      onChange={e => setFormData({...formData, image_url: e.target.value})}
                      placeholder="Ej: https://imagenes.com/mi-banner.jpg"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Texto del Botón de Acción</label>
                <input 
                  type="text" 
                  value={formData.button_text} 
                  onChange={e => setFormData({...formData, button_text: e.target.value})}
                  placeholder="Ej: Ver Catálogo"
                />
              </div>

              <div className="form-group">
                <label>Destino al hacer clic en el Botón</label>
                <select 
                  value={linkType} 
                  onChange={e => setLinkType(e.target.value as any)}
                  className="link-type-select"
                >
                  <option value="home">Página de Inicio (Ver todo)</option>
                  <option value="category">Ir a una Categoría</option>
                  <option value="product">Ir a un Producto</option>
                  <option value="custom">Dirección Personalizada (Link)</option>
                </select>
              </div>

              {linkType === 'category' && (
                <div className="form-group col-span-2">
                  <label>Selecciona la Categoría de Destino</label>
                  <select 
                    value={selectedCategoryId} 
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    required
                  >
                    <option value="" disabled>-- Selecciona una categoría --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {linkType === 'product' && (
                <div className="form-group col-span-2">
                  <label>Selecciona el Producto de Destino</label>
                  <select 
                    value={selectedProductId} 
                    onChange={e => setSelectedProductId(e.target.value)}
                    required
                  >
                    <option value="" disabled>-- Selecciona un producto --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {linkType === 'custom' && (
                <div className="form-group col-span-2">
                  <label>Link o URL de Destino</label>
                  <div className="input-with-icon">
                    <LinkIcon size={18} />
                    <input 
                      type="text" 
                      value={customUrl} 
                      onChange={e => setCustomUrl(e.target.value)}
                      placeholder="Ej: /ofertas o https://..."
                      required
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Realtime Live Preview */}
            <div className="live-preview-section">
              <label>Previsualización del Banner en la Web</label>
              <div className="banner-preview-box">
                {formData.image_url ? (
                  <div className="preview-bg" style={{ backgroundImage: `url(${formData.image_url})` }}>
                    <div className="preview-overlay">
                      <div className="preview-content">
                        <span className="badge">Oferta Destacada</span>
                        <h2>{formData.title || 'Título del Banner'}</h2>
                        <p>{formData.subtitle || 'Subtítulo o descripción del banner'}</p>
                        <button type="button" className="action-btn">
                          {formData.button_text || 'Comprar Ahora'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="preview-empty">
                    <ImageIcon size={32} />
                    <span>Sube una imagen para ver la previsualización interactiva</span>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn" disabled={uploadingImage}>
                {uploadingImage ? <Loader2 className="spin" /> : <Save size={18} />}
                {editingId ? 'Guardar Cambios' : 'Crear Banner'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="banners-list">
        {banners.map((banner, index) => (
          <div key={banner.id} className={`banner-item ${!banner.is_active ? 'inactive' : ''}`}>
            <div className="banner-preview">
              <img src={banner.image_url} alt={banner.title} />
              {!banner.is_active && <div className="inactive-overlay">Desactivado</div>}
            </div>
            <div className="banner-info">
              <h4>{banner.title}</h4>
              <p>{banner.subtitle}</p>
              <div className="banner-meta">
                <span><LinkIcon size={14} /> Enlace: <strong>{getDestinationLabel(banner.button_link)}</strong></span>
              </div>
            </div>
            <div className="banner-actions">
              <div className="order-actions">
                <button onClick={() => moveBanner(index, 'up')} disabled={index === 0}><MoveUp size={18} /></button>
                <button onClick={() => moveBanner(index, 'down')} disabled={index === banners.length - 1}><MoveDown size={18} /></button>
              </div>
              <button onClick={() => toggleStatus(banner)} className="status-btn">
                {banner.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              <button 
                onClick={() => {
                  setEditingId(banner.id);
                  setFormData(banner);
                  setIsAdding(false);
                }} 
                className="edit-btn"
              >
                <Edit2 size={18} />
              </button>
              <button onClick={() => handleDelete(banner.id)} className="delete-btn">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .admin-banners {
          max-width: 1000px;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--primary);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
        }

        .banner-form-card {
          background: white;
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          margin-bottom: 2rem;
          border: 1px solid #f0f0f0;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .form-header h3 {
          font-size: 1.2rem;
          font-weight: 800;
        }

        .close-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.col-span-2 {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 700;
          color: #444;
        }

        .form-group input, .form-group select {
          padding: 12px;
          border: 1.5px solid #eee;
          border-radius: 10px;
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s;
          background: white;
        }

        .form-group input:focus, .form-group select:focus {
          border-color: var(--primary);
        }

        .input-with-icon {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          border: 1.5px solid #eee;
          border-radius: 10px;
        }

        .input-with-icon input {
          border: none;
          padding: 12px 0;
          flex: 1;
        }

        .mode-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 5px;
        }

        .mode-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1.5px solid #eee;
          background: #fff;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-tab.active {
          border-color: var(--primary);
          color: var(--primary);
          background: rgba(var(--primary-rgb), 0.05);
        }

        .image-upload-area {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          background: #f8fafc;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          width: 100%;
        }

        .upload-placeholder span {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }

        .uploading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--primary);
        }

        .preview-box {
          position: relative;
          width: 100%;
          max-height: 180px;
          border-radius: 8px;
          overflow: hidden;
        }

        .preview-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-img-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }

        .live-preview-section {
          margin-top: 2rem;
          border-top: 1px solid #f1f5f9;
          padding-top: 1.5rem;
        }

        .live-preview-section label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #444;
          margin-bottom: 12px;
        }

        .banner-preview-box {
          width: 100%;
          height: 200px;
          border-radius: 12px;
          overflow: hidden;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-bg {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .preview-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%);
          display: flex;
          align-items: center;
          padding: 0 40px;
        }

        .preview-content {
          max-width: 350px;
          text-align: left;
        }

        .preview-content .badge {
          background-color: var(--primary);
          color: #fff;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .preview-content h2 {
          font-size: 24px;
          font-weight: 900;
          color: #111;
          margin: 0 0 6px 0;
        }

        .preview-content p {
          font-size: 12px;
          color: #444;
          margin: 0 0 14px 0;
          line-height: 1.4;
          font-weight: 500;
        }

        .preview-content .action-btn {
          background-color: var(--primary);
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 800;
          border: none;
          font-size: 11px;
        }

        .preview-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 600;
        }

        .form-actions {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #1a1a1a;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .banners-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .banner-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: white;
          padding: 1rem;
          border-radius: 16px;
          border: 1px solid #f0f0f0;
          transition: all 0.2s;
        }

        .banner-item.inactive {
          opacity: 0.6;
        }

        .banner-preview {
          width: 160px;
          height: 90px;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          background: #f5f5f5;
        }

        .banner-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .inactive-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        .banner-info {
          flex: 1;
        }

        .banner-info h4 {
          margin: 0 0 4px;
          font-size: 1rem;
          font-weight: 700;
        }

        .banner-info p {
          margin: 0 0 8px;
          font-size: 13px;
          color: #666;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .banner-meta {
          display: flex;
          gap: 15px;
          font-size: 11px;
          color: #999;
          font-weight: 600;
        }

        .banner-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .order-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .order-actions button {
          padding: 4px;
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
        }

        .order-actions button:hover:not(:disabled) {
          color: var(--primary);
        }

        .banner-actions button:not(.order-actions button) {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid #eee;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-btn:hover { background: #f0f0f0; }
        .delete-btn:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }
        .status-btn:hover { background: #f0f0f0; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
