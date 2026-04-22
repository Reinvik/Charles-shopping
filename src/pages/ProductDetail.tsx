import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ShoppingCart, Plus, Minus, Check, Loader2, Pencil, Save, X, Camera } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data && !error) {
        setProduct(data);
        setEditName(data.name || '');
        setEditPrice(data.price || 0);
        setEditStock(data.stock || 0);
        setEditDescription(data.description || '');
      }
      setLoading(false);
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart({ 
      id: product.id, 
      name: product.name, 
      image: product.image_url, 
      price: product.price, 
      original_price: product.original_price 
    }, quantity);
    
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          name: editName,
          price: editPrice,
          stock: editStock,
          description: editDescription 
        })
        .eq('id', id);

      if (error) throw error;
      
      setProduct({ 
        ...product, 
        name: editName, 
        price: editPrice, 
        stock: editStock,
        description: editDescription 
      });
      setIsEditing(false);
      toast.success('Producto actualizado correctamente');
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-${Math.random()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      setProduct({ ...product, image_url: publicUrl });
      toast.success('Imagen actualizada');
    } catch (err: any) {
      toast.error('Error al subir imagen: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Producto no encontrado</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>Volver a la tienda</button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {/* Header Bar */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #eaeaea', 
        backgroundColor: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: '600',
              color: '#333'
            }}
          >
            <ArrowLeft size={20} />
            Volver a la tienda
          </button>

          {isAdmin && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                    setEditName(product.name || '');
                    setEditPrice(product.price || 0);
                    setEditStock(product.stock || 0);
                    setEditDescription(product.description || '');
                  } else {
                    setIsEditing(true);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: isEditing ? '#f3f4f6' : '#fff',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                {isEditing ? (
                  <>
                    <X size={16} />
                    Cancelar
                  </>
                ) : (
                  <>
                    <Pencil size={16} className="text-primary" />
                    Modificar Producto
                  </>
                )}
              </button>
              
              {isEditing && (
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="product-detail-layout">
          {/* Left Column: Image */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`product-image-container ${isEditing ? 'editable' : ''}`}
            onClick={handleImageClick}
          >
            {product.discount_badge && (
              <div className="detail-badge-sale">{product.discount_badge}</div>
            )}
            
            <AnimatePresence>
              {isEditing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="image-overlay"
                >
                  {uploadingImage ? (
                    <Loader2 size={32} className="animate-spin text-white" />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#fff' }}>
                      <Camera size={32} style={{ marginBottom: '8px' }} />
                      <p style={{ fontWeight: '700', fontSize: '14px' }}>Cambiar Imagen</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <img src={product.image_url} alt={product.name} />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </motion.div>

          {/* Right Column: Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="product-info-container"
          >
            {isEditing ? (
              <input 
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="edit-input-title"
                placeholder="Nombre del producto"
              />
            ) : (
              <h1 className="product-title">{product.name}</h1>
            )}
            
            <div className="product-price-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {product.original_price && !isEditing && (
                    <span className="old-price">${product.original_price.toLocaleString('es-CL')} CLP</span>
                  )}
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold' }}>$</span>
                      <input 
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        className="edit-input-price"
                        placeholder="Precio"
                      />
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#666' }}>CLP</span>
                    </div>
                  ) : (
                    <span className="current-price">${product.price.toLocaleString('es-CL')} CLP</span>
                  )}
                </div>

                {isAdmin && (
                  <div className={`stock-info-badge ${isEditing ? 'editing' : ''}`}>
                    <span className="stock-label">STOCK</span>
                    {isEditing ? (
                      <input 
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(Number(e.target.value))}
                        className="edit-input-stock"
                      />
                    ) : (
                      <span className="stock-value">{product.stock || 0}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="product-description">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3>Descripción</h3>
                {isEditing && (
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="edit-badge"
                  >
                    MODO EDICIÓN
                  </motion.span>
                )}
              </div>
              
              {isEditing ? (
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Escribe la descripción aquí..."
                  className="edit-textarea"
                  autoFocus
                />
              ) : (
                <p>
                  {product.description || "Este producto te garantiza la mejor calidad para tus compras en Charles Shopping. Ideal para tu hogar o tu empresa, contamos con el mejor stock de la ciudad."}
                </p>
              )}
            </div>

            <div className="product-actions-box">
              <label>Cantidad</label>
              <div className="quantity-selector">
                <button onClick={handleDecrement} className="qty-btn"><Minus size={18} /></button>
                <span className="qty-value">{quantity}</span>
                <button onClick={handleIncrement} className="qty-btn"><Plus size={18} /></button>
              </div>

              <button 
                onClick={handleAddToCart}
                disabled={isEditing}
                className={`add-btn ${added ? 'added' : ''}`}
                style={{ opacity: isEditing ? 0.5 : 1, cursor: isEditing ? 'not-allowed' : 'pointer' }}
              >
                {added ? (
                  <>
                    <Check size={20} />
                    Agregado al carrito
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    Añadir {quantity} por ${(product.price * quantity).toLocaleString('es-CL')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        .product-detail-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (min-width: 768px) {
          .product-detail-layout {
            grid-template-columns: 1fr 1fr;
            align-items: start;
          }
        }

        .product-image-container {
          background: #fff;
          border-radius: 16px;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          aspect-ratio: 1;
          transition: all 0.3s;
          overflow: hidden;
        }

        .product-image-container.editable {
          cursor: pointer;
        }

        .product-image-container.editable:hover {
          transform: scale(1.02);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
        }

        .product-image-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .detail-badge-sale {
          position: absolute;
          top: 20px;
          left: 20px;
          background: #ef4444;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 10px rgba(239,68,68,0.3);
          z-index: 6;
        }

        .product-info-container {
          display: flex;
          flex-direction: column;
          padding: 20px 0;
        }

        .product-title {
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 800;
          color: #1a1a1a;
          line-height: 1.2;
          margin-bottom: 20px;
        }

        .product-price-section {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-bottom: 30px;
          padding-bottom: 30px;
          border-bottom: 1px solid #eaeaea;
        }

        .old-price {
          font-size: 18px;
          color: #9ca3af;
          text-decoration: line-through;
          font-weight: 500;
        }

        .current-price {
          font-size: 32px;
          font-weight: 800;
          color: var(--primary);
        }

        .product-description h3 {
          font-size: 16px;
          font-weight: 700;
          color: #374151;
          margin: 0;
        }

        .product-description p {
          font-size: 15px;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 40px;
          white-space: pre-wrap;
        }

        .edit-textarea {
          width: 100%;
          min-height: 150px;
          padding: 16px;
          border-radius: 12px;
          border: 2px solid var(--primary);
          background: #fff;
          font-family: inherit;
          font-size: 15px;
          color: #1a1a1a;
          line-height: 1.6;
          outline: none;
          margin-bottom: 40px;
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.1);
        }
        
        .edit-input-title {
          width: 100%;
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 800;
          color: #1a1a1a;
          line-height: 1.2;
          margin-bottom: 20px;
          border: 2px solid var(--primary);
          border-radius: 8px;
          padding: 8px 12px;
          outline: none;
          background: #fff;
        }

        .edit-input-price {
          font-size: 24px;
          font-weight: 700;
          color: var(--primary);
          border: 2px solid var(--primary);
          border-radius: 8px;
          padding: 5px 10px;
          width: 150px;
          outline: none;
        }

        .edit-input-stock {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          width: 60px;
          border-radius: 4px;
          padding: 2px 5px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          outline: none;
          text-align: center;
        }

        .stock-info-badge {
          background: #374151;
          color: white;
          padding: 8px 12px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: all 0.3s;
        }

        .stock-info-badge.editing {
          background: var(--primary);
          box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);
        }

        .stock-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          opacity: 0.7;
          margin-bottom: 2px;
        }

        .stock-value {
          font-size: 18px;
          font-weight: 800;
        }

        .edit-badge {
          font-size: 10px;
          color: white;
          background: var(--primary);
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 800;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.3);
          animation: pulse-edit 2s infinite;
        }

        @keyframes pulse-edit {
          0% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.8; transform: scale(1); }
        }

        .edit-textarea:focus, .edit-input-title:focus, .edit-input-price:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.15);
          background: #fff;
        }

        .product-actions-box {
          background: #fff;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          border: 1px solid #f3f4f6;
        }

        .product-actions-box label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 10px;
        }

        .quantity-selector {
          display: flex;
          align-items: center;
          border: 2px solid #f3f4f6;
          border-radius: 8px;
          width: fit-content;
          margin-bottom: 20px;
        }

        .qty-btn {
          background: none;
          border: none;
          padding: 12px 16px;
          cursor: pointer;
          color: #4b5563;
          transition: all 0.2s;
        }

        .qty-btn:hover {
          background: #f9fafb;
          color: var(--primary);
        }

        .qty-value {
          font-size: 16px;
          font-weight: 700;
          width: 40px;
          text-align: center;
        }

        .add-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: var(--primary);
          color: white;
          padding: 18px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }

        .add-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }

        .add-btn.added {
          background: #10b981;
        }
      `}</style>
    </div>
  );
};
