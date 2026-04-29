import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
  EyeOff
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
}

export const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (error) {
      toast.error('Error al cargar banners');
    } else {
      setBanners(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.image_url) {
      toast.error('Título e imagen son obligatorios');
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('banners')
        .update(formData)
        .eq('id', editingId);
      
      if (error) toast.error('Error al actualizar');
      else {
        toast.success('Banner actualizado');
        setEditingId(null);
        fetchBanners();
      }
    } else {
      const { error } = await supabase
        .from('banners')
        .insert([{ ...formData, order_index: banners.length }]);
      
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
    if (!confirm('¿Estás seguro de eliminar este banner?')) return;
    
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);
    
    if (error) toast.error('Error al eliminar');
    else {
      toast.success('Banner eliminado');
      fetchBanners();
    }
  };

  const toggleStatus = async (banner: Banner) => {
    const { error } = await supabase
      .from('banners')
      .update({ is_active: !banner.is_active })
      .eq('id', banner.id);
    
    if (error) toast.error('Error al actualizar estado');
    else fetchBanners();
  };

  const moveBanner = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === banners.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const currentBanner = banners[index];
    const targetBanner = banners[newIndex];

    const { error: err1 } = await supabase
      .from('banners')
      .update({ order_index: targetBanner.order_index })
      .eq('id', currentBanner.id);

    const { error: err2 } = await supabase
      .from('banners')
      .update({ order_index: currentBanner.order_index })
      .eq('id', targetBanner.id);

    if (err1 || err2) toast.error('Error al reordenar');
    else fetchBanners();
  };

  return (
    <div className="admin-banners">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <p style={{ color: '#666' }}>Gestiona los banners del carrusel de la página de inicio.</p>
        <button 
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
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
                  placeholder="Ej: Ofertas de Verano"
                />
              </div>
              <div className="form-group">
                <label>Subtítulo / Descripción</label>
                <input 
                  type="text" 
                  value={formData.subtitle} 
                  onChange={e => setFormData({...formData, subtitle: e.target.value})}
                  placeholder="Ej: 20% de descuento en toda la tienda"
                />
              </div>
              <div className="form-group">
                <label>URL de Imagen</label>
                <div className="input-with-icon">
                  <ImageIcon size={18} />
                  <input 
                    type="text" 
                    value={formData.image_url} 
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Texto del Botón</label>
                <input 
                  type="text" 
                  value={formData.button_text} 
                  onChange={e => setFormData({...formData, button_text: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Link del Botón (URL o ID de Categoría)</label>
                <div className="input-with-icon">
                  <LinkIcon size={18} />
                  <input 
                    type="text" 
                    value={formData.button_link} 
                    onChange={e => setFormData({...formData, button_link: e.target.value})}
                    placeholder="/ o ID de categoria"
                  />
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="save-btn">
                <Save size={18} />
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
                <span><LinkIcon size={14} /> {banner.button_link}</span>
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

        .form-group label {
          font-size: 13px;
          font-weight: 700;
          color: #444;
        }

        .form-group input {
          padding: 12px;
          border: 1.5px solid #eee;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
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
      `}</style>
    </div>
  );
};
