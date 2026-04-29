import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ShoppingCart, Plus, Minus, Check, Loader2, Pencil, Save, X, Trash2, Camera, Link as LinkIcon, Upload, GripVertical } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { toast } from 'sonner';
import logoImg from '../assets/logo.png';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [imageSourceMode, setImageSourceMode] = useState<'link' | 'upload'>('link');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editIsOnOffer, setEditIsOnOffer] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default placeholder image
  const PLACEHOLDER_IMAGE = logoImg;

  useEffect(() => {
    const fetchProduct = async () => {
      if (id === 'new') {
        const defaultProduct = {
          id: 'new',
          name: 'Nuevo Producto',
          price: 1000,
          stock: 10,
          description: 'Descripción del nuevo producto...',
          image_url: PLACEHOLDER_IMAGE,
          images: [PLACEHOLDER_IMAGE],
          category_id: null,
          is_on_offer: false
        };
        setProduct(defaultProduct);
        setEditName(defaultProduct.name);
        setEditPrice(defaultProduct.price);
        setEditStock(defaultProduct.stock);
        setEditDescription(defaultProduct.description);
        setEditImageUrl(defaultProduct.image_url);
        setEditImages(defaultProduct.images);
        setSelectedImage(defaultProduct.image_url);
        setIsEditing(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Fetch categories
      const { data: catData } = await supabase.from('categories').select('*').order('name');
      setCategories(catData || []);

      const { data, error } = await supabase

        .from('products')
        .select('*, categories(name)')
        .eq('id', id)
        .single();
        
      if (data && !error) {
        setProduct(data);
        setEditName(data.name || '');
        setEditPrice(data.price || 0);
        setEditStock(data.stock || 0);
        setEditDescription(data.description || '');
        setEditImageUrl(data.image_url || '');
        setEditCategoryId(data.category_id || '');
        setEditIsActive(data.is_active !== false);
        setEditIsOnOffer(data.is_on_offer || false);
        const initialImages = data.images && data.images.length > 0 ? data.images : [data.image_url];
        // Ensure uniqueness to prevent Reorder component from crashing/duplicating
        setEditImages(Array.from(new Set(initialImages.filter(Boolean))));
        setSelectedImage(data.image_url || '');
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
      if (id === 'new') {
        // Create new product
        const { data: newProductData, error: insertError } = await supabase
          .from('products')
          .insert([{
            name: editName,
            price: editPrice,
            stock: editStock,
            description: editDescription,
            image_url: editImages.length > 0 ? editImages[0] : PLACEHOLDER_IMAGE,
            images: editImages,
            is_active: true,
            is_on_offer: editIsOnOffer
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        toast.success('Producto creado exitosamente');
        setIsEditing(false);
        setSaving(false);
        navigate(`/product/${newProductData.id}`, { replace: true });
        return;
      }

      // Update existing
      const { error } = await supabase
        .from('products')
        .update({ 
          name: editName,
          price: editPrice,
          stock: editStock,
          description: editDescription,
          image_url: editImages.length > 0 ? editImages[0] : editImageUrl,
          images: editImages,
          is_on_offer: editIsOnOffer
        })
        .eq('id', id);

      if (error) throw error;
      
      setProduct({ 
        ...product, 
        name: editName, 
        price: editPrice, 
        stock: editStock,
        description: editDescription,
        category_id: editCategoryId,
        is_active: editIsActive,
        image_url: editImages.length > 0 ? editImages[0] : editImageUrl,
        images: editImages
      });
      setIsEditing(false);
      toast.success('Producto actualizado correctamente');
      
      // Refresh to get updated category name etc
      const { data: refreshed } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('id', id)
        .single();
      if (refreshed) setProduct(refreshed);
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

      if (id !== 'new') {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: publicUrl })
          .eq('id', id);

        if (updateError) throw updateError;
      }

      // Find the index of the image we are replacing
      const newImages = [...editImages];
      const currentIndex = editImages.indexOf(selectedImage);
      
      if (currentIndex !== -1) {
        newImages[currentIndex] = publicUrl;
      } else {
        newImages.push(publicUrl);
      }

      const uniqueImages = Array.from(new Set(newImages));
      setEditImages(uniqueImages);
      setSelectedImage(publicUrl);
      setEditImageUrl(publicUrl);
      toast.success('Imagen actualizada en la galería');
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
            onClick={() => {
              if (id === 'new') navigate('/');
              else navigate(-1);
            }}
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
              {id !== 'new' && (
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
                {isEditing ? <><X size={16} /> Cancelar</> : <><Pencil size={16} className="text-primary" /> Editar Producto</>}
              </button>
              )}
              
              {isEditing && (
                <>
                  <button 
                    onClick={() => setEditIsActive(!editIsActive)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                      backgroundColor: editIsActive ? '#fff' : '#fef2f2', border: `1px solid ${editIsActive ? '#e5e7eb' : '#fecaca'}`,
                      cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: editIsActive ? '#333' : '#dc2626'
                    }}
                  >
                    {editIsActive ? 'Pausar Publicación' : 'Reanudar Publicación'}
                  </button>

                  <button 
                    onClick={async () => {
                      if (window.confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
                        const { error } = await supabase.from('products').delete().eq('id', id);
                        if (error) toast.error('Error al eliminar: ' + error.message);
                        else {
                          toast.success('Producto eliminado');
                          navigate('/');
                        }
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                      backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                      cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: '#dc2626'
                    }}
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>

                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                      backgroundColor: 'var(--primary)', color: '#fff', border: 'none',
                      cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Guardar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="product-detail-layout">
          {/* Left Column: Image */}
          <div className="product-gallery-layout">
            {/* Thumbnails list with Drag & Drop */}
            <Reorder.Group 
              axis="y" 
              values={Array.from(new Set(isEditing ? editImages : (product?.images && product.images.length > 0 ? product.images : [product?.image_url]).filter(Boolean))) as string[]} 
              onReorder={setEditImages}
              className="product-thumbnails"
            >
              {(Array.from(new Set(isEditing ? editImages : (product?.images && product.images.length > 0 ? product.images : [product?.image_url]).filter(Boolean))) as string[]).map((img: string, idx: number) => (
                <Reorder.Item 
                  key={`${img}-${idx}`} 
                  value={img}
                  className="relative flex flex-col items-center gap-1 mb-4"
                  style={{ zIndex: selectedImage === img ? 10 : 1 }}
                >
                  <div className="flex items-center gap-2 w-full">
                    {isEditing && (
                      <div className="text-slate-400 cursor-grab active:cursor-grabbing p-1">
                        <GripVertical size={18} />
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedImage(img);
                        setEditImageUrl(img);
                      }}
                      className={`thumbnail-btn ${selectedImage === img ? 'active' : ''}`}
                    >
                      <img src={img || PLACEHOLDER_IMAGE} alt="" style={{ borderRadius: '8px' }} onError={(e: any) => e.target.src = PLACEHOLDER_IMAGE} />
                    </button>
                  </div>

                  {isEditing && (
                    <div className="flex gap-1 w-full mt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newImages = [...editImages];
                          const [item] = newImages.splice(idx, 1);
                          newImages.unshift(item);
                          setEditImages(newImages);
                          setSelectedImage(item);
                          setEditImageUrl(item);
                        }}
                        className={`text-[9px] font-bold px-1 py-1.5 rounded flex items-center justify-center gap-1 transition-all flex-1 ${
                          idx === 0 
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                            : 'bg-slate-100 text-slate-500 hover:bg-primary hover:text-white border border-transparent'
                        }`}
                      >
                        {idx === 0 ? '⭐ PRINCIPAL' : '⬆️ PORTADA'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newImages = editImages.filter((_, i) => i !== idx);
                          setEditImages(newImages);
                          if (selectedImage === img && newImages.length > 0) {
                            setSelectedImage(newImages[0]);
                            setEditImageUrl(newImages[0]);
                          }
                        }}
                        className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded px-2 flex items-center justify-center transition-colors"
                        title="Eliminar foto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </Reorder.Item>
              ))}
              
              {isEditing && (
                <button
                  onClick={() => {
                    if (imageSourceMode === 'upload') {
                      fileInputRef.current?.click();
                    } else {
                      const url = prompt('Pega el enlace de la imagen:');
                      if (url) {
                        setEditImages([...editImages, url]);
                        setSelectedImage(url);
                        setEditImageUrl(url);
                      }
                    }
                  }}
                  className="thumbnail-btn add-new-btn shrink-0"
                  style={{ marginTop: '10px' }}
                >
                  <Plus size={24} className="text-slate-400" />
                </button>
              )}
            </Reorder.Group>

            {/* Main Image Viewer */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`product-image-viewer ${isEditing ? 'editable' : ''}`}
              onClick={handleImageClick}
            >
              {product.discount_badge && (
                <div className="detail-badge-sale">{product.discount_badge}</div>
              )}
              
              <AnimatePresence mode="wait">
                <motion.img 
                  key={isEditing ? editImageUrl : selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  src={isEditing ? editImageUrl : selectedImage} 
                  alt={product.name} 
                  className="main-display-image"
                />
              </AnimatePresence>

              {isEditing && (
                <div className="image-overlay">
                  {uploadingImage ? (
                    <Loader2 size={32} className="animate-spin text-white" />
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="bg-white text-primary px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-xl"
                      >
                        <Camera size={18} />
                        Reemplazar esta foto
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = prompt('Pega el ENLACE DIRECTO de la imagen (debe terminar en .jpg, .png, .webp, etc):\n\nTip: En MercadoLibre, haz clic derecho sobre la foto y selecciona "Copiar dirección de imagen".');
                          if (url) {
                            if (url.includes('mercadolibre.cl') && !url.includes('mlstatic.com')) {
                              toast.error('Parece que pegaste el link de la página, no de la foto. Usa "Copiar dirección de imagen".');
                            }
                            const newImages = [...editImages];
                            const idx = editImages.indexOf(selectedImage);
                            if (idx !== -1) newImages[idx] = url;
                            else newImages.push(url);
                            setEditImages(Array.from(new Set(newImages)));
                            setSelectedImage(url);
                            setEditImageUrl(url);
                          }
                        }}
                        className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-xl"
                      >
                        <LinkIcon size={18} />
                        Cambiar por Link
                      </button>
                    </div>
                  )}
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </motion.div>
          </div>

          {/* Right Column: Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="product-info-container"
          >
            {isEditing ? (
              <div className="space-y-4 mb-6">
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="edit-input-title"
                  placeholder="Nombre del producto"
                />
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label className="text-sm font-bold text-slate-600">Fuente de Imagen</label>
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setImageSourceMode('link')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        imageSourceMode === 'link' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
                      }`}
                    >
                      <LinkIcon size={12} />
                      Enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceMode('upload')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        imageSourceMode === 'upload' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
                      }`}
                    >
                      <Upload size={12} />
                      Archivo
                    </button>
                  </div>
                </div>

                 {imageSourceMode === 'link' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        className="edit-input-standard"
                        placeholder="Pega el enlace de la imagen..."
                        style={{ flex: 1 }}
                      />
                      <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                        <img 
                          src={editImageUrl} 
                          className="w-full h-full object-contain" 
                          onError={(e: any) => e.target.src = PLACEHOLDER_IMAGE} 
                        />
                      </div>
                    </div>
                    {editImageUrl.includes('mercadolibre.cl') && !editImageUrl.includes('mlstatic.com') && (
                      <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 font-medium">
                        ⚠️ Estás usando el link de la página de MercadoLibre. Para que se vea la foto, haz <b>clic derecho sobre la imagen</b> en MercadoLibre y selecciona <b>"Copiar dirección de imagen"</b>.
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full py-3 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-bold text-slate-600 border-2 border-dashed border-slate-300"
                  >
                    {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {uploadingImage ? 'Subiendo...' : 'Subir Archivo desde PC'}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>
                  {product.categories?.name || 'Sin Categoría'}
                </span>
                <h1 className="product-title">{product.name}</h1>
                {!product.is_active && (
                  <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '12px', background: '#fef2f2', padding: '2px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                    PAUSADO
                  </span>
                )}
              </div>
            )}
            
            {isEditing && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '5px' }}>CATEGORÍA</label>
                <select 
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="edit-input-standard"
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <option value="">Seleccionar Categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', backgroundColor: '#fff5f5', padding: '10px', borderRadius: '8px', border: '1px solid #fed7d7' }}>
                  <input 
                    type="checkbox"
                    id="is_on_offer"
                    checked={editIsOnOffer}
                    onChange={(e) => setEditIsOnOffer(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label htmlFor="is_on_offer" style={{ fontWeight: '700', color: '#c53030', cursor: 'pointer' }}>
                    🔥 Mostrar también en sección OFERTAS
                  </label>
                </div>
              </div>
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

        .product-gallery-layout {
          display: flex;
          gap: 20px;
          height: 600px;
        }

        .product-thumbnails {
          display: flex;
          flex-direction: column;
          gap: 15px;
          width: 130px;
          overflow-y: auto;
          overflow-x: visible;
          padding: 20px 10px;
        }

        .product-thumbnails::-webkit-scrollbar {
          width: 4px;
        }

        .product-thumbnails::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }

        .thumbnail-btn {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          border: 2px solid transparent;
          background: #fff;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }

        .thumbnail-btn img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .thumbnail-btn:hover {
          border-color: #e5e7eb;
          transform: translateY(-2px);
        }

        .thumbnail-btn.active {
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);
        }

        .thumbnail-btn.add-new-btn {
          border: 2px dashed #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
        }

        .thumbnail-btn.add-new-btn:hover {
          border-color: var(--primary);
          background: #fff;
        }

        .product-image-viewer {
          flex: 1;
          background: #fff;
          border-radius: 24px;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 4px 30px rgba(0,0,0,0.03);
          overflow: hidden;
        }

        .main-display-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .product-image-viewer.editable {
          cursor: pointer;
        }

        .product-image-viewer.editable:hover {
          box-shadow: 0 10px 40px rgba(0,0,0,0.08);
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

        .edit-input-title:focus, .edit-input-price:focus, .edit-input-standard:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.15);
          background: #fff;
        }

        .edit-input-standard {
          width: 100%;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }

        .space-y-4 > * + * {
          margin-top: 1rem;
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
