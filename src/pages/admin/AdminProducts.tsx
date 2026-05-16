import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Pencil, Trash2, Loader2, Save, X, 
  Image as ImageIcon, Upload, Link as LinkIcon,
  MoveUp, MoveDown, Search, Filter
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import { toast } from 'sonner';
import { useTenant } from '../../context/TenantContext';

interface Product {
  id: string;
  name: string;
  category_id: string;
  price: number;
  original_price?: number;
  discount_badge?: string;
  image_url: string;
  images: string[];
  is_active: boolean;
  is_on_offer: boolean;
  stock: number;
  order_index: number;
  categories?: { name: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  order_index: number;
}

export const AdminProducts = () => {
  const { tenant } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      const catId = params.get('category');
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: catId || '',
        price: 0,
        original_price: 0,
        discount_badge: '',
        image_url: '',
        images: [],
        is_active: true,
        is_on_offer: false,
        stock: 10 // Default stock
      });
      setIsModalOpen(true);
    }
  }, [location]);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageSourceMode, setImageSourceMode] = useState<'link' | 'upload'>('link');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category_id: '',
    price: 0,
    original_price: 0,
    discount_badge: '',
    image_url: '',
    images: [],
    is_active: true,
    is_on_offer: false,
    stock: 0
  });

  const moveProduct = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === products.length - 1) return;
    if (!tenant) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const currentProd = products[index];
    const targetProd = products[newIndex];

    const { error: err1 } = await supabase
      .from('products')
      .update({ order_index: targetProd.order_index })
      .eq('id', currentProd.id)
      .eq('tenant_id', tenant.id);

    const { error: err2 } = await supabase
      .from('products')
      .update({ order_index: currentProd.order_index })
      .eq('id', targetProd.id)
      .eq('tenant_id', tenant.id);

    if (err1 || err2) toast.error('Error al reordenar');
    else fetchData();
  };

  const fetchData = async () => {
    if (!tenant) return;
    try {
      let query = supabase
        .from('products')
        .select('*, categories(name)')
        .eq('tenant_id', tenant.id)
        .order('order_index', { ascending: true });
      
      if (selectedFilterCategory !== 'all') {
        query = query.eq('category_id', selectedFilterCategory);
      }

      const [prodRes, catRes] = await Promise.all([
        query,
        supabase.from('categories')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('order_index', { ascending: true })
      ]);

      if (prodRes.error) throw prodRes.error;
      if (catRes.error) throw catRes.error;

      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch (error: any) {
      toast.error('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedFilterCategory, tenant]);

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        price: 0,
        original_price: 0,
        discount_badge: '',
        image_url: '',
        images: [],
        is_active: true,
        is_on_offer: false,
        stock: 0
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImage(true);
    const newUrls: string[] = [];

    try {
      for (const file of files) {
        if (file.size > 2 * 1024 * 1024) {
          toast.error(`"${file.name}" es demasiado grande. Máximo 2MB.`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        
        newUrls.push(publicUrl);
      }

      const updatedImages = [...(formData.images || []), ...newUrls];
      setFormData(prev => ({ 
        ...prev, 
        images: updatedImages,
        image_url: prev.image_url || updatedImages[0]
      }));
      
      toast.success(newUrls.length > 1 ? `${newUrls.length} imágenes añadidas` : 'Imagen añadida');
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error('Error al subir: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = ''; 
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);

    try {
      const productData = {
        name: formData.name,
        category_id: formData.category_id,
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : null,
        discount_badge: formData.discount_badge || null,
        image_url: formData.images && formData.images.length > 0 ? formData.images[0] : (formData.image_url || ''),
        images: formData.images || [],
        is_active: formData.is_active,
        is_on_offer: formData.is_on_offer || false,
        stock: Number(formData.stock) || 0,
        tenant_id: tenant.id
      };

      let query;
      if (editingProduct?.id) {
        query = supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .eq('tenant_id', tenant.id);
      } else {
        query = supabase
          .from('products')
          .insert([productData]);
      }

      const { error } = await query;

      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      toast.success(editingProduct?.id ? 'Producto actualizado' : 'Producto creado');

      closeModal();
      fetchData();
    } catch (error: any) {
      console.error('Supabase Error:', error);
      toast.error(`Error al guardar: ${error.message}${error.details ? ` (${error.details})` : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Producto eliminado');
      fetchData();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast.error('Error al cambiar estado');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 md:flex-initial">
            <Filter size={18} className="text-slate-400" />
            <select
              className="bg-transparent outline-none text-sm font-medium w-full"
              value={selectedFilterCategory}
              onChange={(e) => setSelectedFilterCategory(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-all shadow-sm shadow-primary/20"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nuevo Producto</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products
          .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((product, index, filteredArr) => (
          <div key={product.id} className={`bg-white rounded-2xl border ${product.is_active ? 'border-slate-100' : 'border-slate-200 opacity-75'} shadow-sm overflow-hidden group hover:shadow-md transition-all relative`}>
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => moveProduct(index, 'up')}
                disabled={index === 0}
                className="p-1.5 bg-white/90 backdrop-blur shadow rounded-lg text-slate-600 hover:text-primary disabled:opacity-30"
              >
                <MoveUp size={14} />
              </button>
              <button 
                onClick={() => moveProduct(index, 'down')}
                disabled={index === filteredArr.length - 1}
                className="p-1.5 bg-white/90 backdrop-blur shadow rounded-lg text-slate-600 hover:text-primary disabled:opacity-30"
              >
                <MoveDown size={14} />
              </button>
            </div>
            <div className="relative aspect-square bg-slate-50 overflow-hidden">
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
              />
              {!product.is_active && (
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px]">
                  <span className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Inactivo</span>
                </div>
              )}
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded">
                  {product.categories?.name || 'Sin Categoría'}
                </span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openModal(product)}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id, product.name)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-sm line-clamp-2 h-10">{product.name}</h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">${product.price.toLocaleString()}</span>
                  {product.original_price && (
                    <span className="text-xs text-slate-400 line-through">${product.original_price.toLocaleString()}</span>
                  )}
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  product.stock > 10 ? 'bg-green-50 text-green-600' :
                  product.stock > 0 ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {product.stock === 0 ? 'Agotado' : `${product.stock} un.`}
                </div>
              </div>

              <button
                onClick={() => toggleStatus(product)}
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                  product.is_active 
                    ? 'bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-500' 
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {product.is_active ? 'Pausar Venta' : 'Activar Venta'}
              </button>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400">
            <ImageIcon size={48} className="mb-4 opacity-20" />
            <p className="font-medium">No se encontraron productos</p>
            <button onClick={() => openModal()} className="mt-4 text-primary font-bold hover:underline">Agregar mi primer producto</button>
          </div>
        )}
      </div>

      {/* Modal / Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-xl font-bold">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Nombre del Producto</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Papel Higiénico Elite 32 Rollos"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Categoría</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Estado</label>
                  <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: true })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.is_active ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                    >
                      Activo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: false })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!formData.is_active ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'}`}
                    >
                      Inactivo
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Precio de Venta</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      required
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Precio Original (Opcional)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      value={formData.original_price || ''}
                      onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) })}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Etiqueta Oferta (Opcional)</label>
                  <input
                    type="text"
                    value={formData.discount_badge || ''}
                    onChange={(e) => setFormData({ ...formData, discount_badge: e.target.value })}
                    placeholder="Ej: 20% OFF"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex items-end text-[10px] text-slate-400 leading-tight pb-2">
                  * Aparecerá en una etiqueta roja sobre el producto.
                </div>
              </div>

              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">Sección de Ofertas</h4>
                    <p className="text-[10px] text-rose-700">Mostrar este producto en la pestaña "Ofertas" adicionalmente.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_on_offer: !formData.is_on_offer })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_on_offer ? 'bg-rose-500' : 'bg-slate-200'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_on_offer ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold">Galería de Imágenes</label>
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setImageSourceMode('link')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        imageSourceMode === 'link' ? 'bg-white shadow-sm text-primary' : 'text-slate-50'
                      }`}
                    >
                      <LinkIcon size={12} />
                      Enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceMode('upload')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        imageSourceMode === 'upload' ? 'bg-white shadow-sm text-primary' : 'text-slate-50'
                      }`}
                    >
                      <Upload size={12} />
                      Subir
                    </button>
                  </div>
                </div>

                {/* Images Grid */}
                <Reorder.Group 
                  axis="x" 
                  values={formData.images || []} 
                  onReorder={(newImages) => setFormData({ ...formData, images: newImages })}
                  className="grid grid-cols-4 gap-2"
                >
                  {(formData.images || []).map((img, idx) => (
                    <Reorder.Item 
                      key={img} 
                      value={img}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-sm cursor-grab active:cursor-grabbing"
                    >
                      <img src={img} className="w-full h-full object-contain p-1" alt={`Gallery ${idx}`} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                        {idx === 0 ? (
                          <span className="text-[8px] bg-primary text-white px-2 py-0.5 rounded font-bold">PORTADA</span>
                        ) : (
                          <span className="text-[8px] bg-white text-slate-900 px-2 py-0.5 rounded font-bold">ARRASTRAR</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newImages = formData.images?.filter((_, i) => i !== idx);
                            setFormData({ ...formData, images: newImages });
                          }}
                          className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {idx === 0 && (
                        <div className="absolute top-0 left-0 bg-primary text-white text-[8px] px-1.5 py-0.5 font-bold rounded-br-lg shadow-sm">P</div>
                      )}
                    </Reorder.Item>
                  ))}
                  
                  {imageSourceMode === 'upload' && (
                    <div className="aspect-square">
                      <label className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-primary/50 transition-all group">
                        {uploadingImage ? (
                          <Loader2 size={16} className="animate-spin text-primary" />
                        ) : (
                          <>
                            <Plus size={20} className="text-slate-300 group-hover:text-primary transition-colors" />
                            <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase group-hover:text-primary">Añadir</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                    </div>
                  )}
                </Reorder.Group>

                {imageSourceMode === 'link' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        id="new-image-link"
                        type="url"
                        placeholder="Pegar link de imagen y pulsar (+)"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            if (input.value) {
                              if (input.value.includes('mercadolibre.cl') && !input.value.includes('mlstatic.com')) {
                                toast.error('Error: Pegaste el link de la página. Usa "Copiar dirección de imagen".');
                              }
                              setFormData(prev => ({ 
                                ...prev, 
                                images: [...(prev.images || []), input.value],
                                image_url: prev.image_url || input.value
                              }));
                              input.value = '';
                              toast.success('Link añadido');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('new-image-link') as HTMLInputElement;
                          if (input.value) {
                            if (input.value.includes('mercadolibre.cl') && !input.value.includes('mlstatic.com')) {
                              toast.error('Error: Pegaste el link de la página. Usa "Copiar dirección de imagen".');
                            }
                            setFormData(prev => ({ 
                              ...prev, 
                              images: [...(prev.images || []), input.value],
                              image_url: prev.image_url || input.value
                            }));
                            input.value = '';
                            toast.success('Link añadido');
                          }
                        }}
                        className="p-2.5 bg-primary text-white rounded-xl hover:bg-opacity-90 transition-all shadow-sm"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                      💡 <b>Tip para MercadoLibre:</b> No pegues el link de la barra de direcciones. Haz <b>clic derecho sobre la foto</b> y elige <b>"Copiar dirección de imagen"</b>.
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Inventario / Stock</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-primary text-white hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
