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
import { useCroppedImage } from '../../hooks/useCroppedImage';

const CroppedProductImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const cropped = useCroppedImage(src);
  return <img src={cropped} alt={alt} className={className} />;
};

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
              <CroppedProductImage 
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
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Completa la información detallada de tu producto.</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full shadow-sm transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Columna Izquierda: Información General y Precios */}
                <div className="space-y-6">
                  {/* Sección: Información General */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <ImageIcon size={18} />
                      </div>
                      <h4 className="font-bold text-slate-700">Información General</h4>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nombre del Producto</label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Papel Higiénico Elite 32 Rollos"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Categoría</label>
                        <select
                          required
                          value={formData.category_id}
                          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm appearance-none cursor-pointer"
                        >
                          <option value="" disabled>Seleccionar...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Estado de Venta</label>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl h-[50px]">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_active: true })}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${formData.is_active ? 'bg-white shadow-md text-green-600' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                            Activo
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_active: false })}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${!formData.is_active ? 'bg-white shadow-md text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${!formData.is_active ? 'bg-slate-500' : 'bg-slate-300'}`} />
                            Pausado
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Precios e Inventario */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <Filter size={18} />
                      </div>
                      <h4 className="font-bold text-slate-700">Precios e Inventario</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Precio de Venta</label>
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-primary transition-colors">$</span>
                          <input
                            required
                            type="text"
                            inputMode="numeric"
                            value={formData.price ? formData.price.toLocaleString('es-CL') : ''}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/\D/g, '');
                              setFormData({ ...formData, price: cleanVal ? Number(cleanVal) : 0 });
                            }}
                            className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm font-bold text-slate-700"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Stock Disponible</label>
                        <div className="relative group">
                          <input
                            required
                            type="number"
                            value={formData.stock || 0}
                            onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm font-bold text-slate-700"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Unidades</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Precio Original (Tachado)</label>
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.original_price ? formData.original_price.toLocaleString('es-CL') : ''}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/\D/g, '');
                              setFormData({ ...formData, original_price: cleanVal ? Number(cleanVal) : 0 });
                            }}
                            placeholder="Sin descuento"
                            className="w-full pl-8 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm text-slate-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Etiqueta de Oferta</label>
                        <input
                          type="text"
                          value={formData.discount_badge || ''}
                          onChange={(e) => setFormData({ ...formData, discount_badge: e.target.value })}
                          placeholder="Ej: 20% OFF"
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${formData.is_on_offer ? 'bg-rose-50 border-rose-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex gap-3 items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.is_on_offer ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          <Plus size={20} />
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold ${formData.is_on_offer ? 'text-rose-900' : 'text-slate-600'}`}>Sección de Ofertas</h4>
                          <p className={`text-[10px] ${formData.is_on_offer ? 'text-rose-600' : 'text-slate-400'}`}>Mostrar permanentemente en la pestaña de Ofertas.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_on_offer: !formData.is_on_offer })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_on_offer ? 'bg-rose-500' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_on_offer ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Multimedia e Imágenes */}
                <div className="space-y-6 bg-slate-50/40 p-5 rounded-3xl border border-slate-100">
                  {/* Sección: Galería de Imágenes */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <ImageIcon size={18} />
                        </div>
                        <h4 className="font-bold text-slate-700">Multimedia</h4>
                      </div>
                      <div className="flex gap-1 p-1 bg-slate-200/60 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setImageSourceMode('link')}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            imageSourceMode === 'link' ? 'bg-white shadow-md text-primary' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <LinkIcon size={12} />
                          Por Enlace
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageSourceMode('upload')}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            imageSourceMode === 'upload' ? 'bg-white shadow-md text-primary' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <Upload size={12} />
                          Subir Foto
                        </button>
                      </div>
                    </div>

                    {/* Info Tip */}
                    {imageSourceMode === 'link' && (
                      <div className="flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                        <div className="text-amber-500 shrink-0 mt-0.5">
                          <LinkIcon size={16} />
                        </div>
                        <p className="text-[11px] text-amber-800 leading-normal">
                          <strong className="block mb-0.5 text-amber-900">Tip de Enlaces:</strong>
                          No pegues el link de la barra de direcciones. Haz <strong>clic derecho sobre la foto</strong> y elige <strong>"Copiar dirección de imagen"</strong>.
                        </p>
                      </div>
                    )}

                    <Reorder.Group 
                      axis="x" 
                      values={formData.images || []} 
                      onReorder={(newImages) => setFormData({ ...formData, images: newImages })}
                      className="grid grid-cols-3 gap-3"
                    >
                      {(formData.images || []).map((img, idx) => (
                        <Reorder.Item 
                          key={img} 
                          value={img}
                          className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-white group shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
                        >
                          <CroppedProductImage src={img} className="w-full h-full object-contain p-2" alt={`Gallery ${idx}`} />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            {idx === 0 && <span className="text-[8px] bg-primary text-white px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Principal</span>}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newImages = formData.images?.filter((_, i) => i !== idx);
                                setFormData({ ...formData, images: newImages });
                              }}
                              className="p-2 bg-white text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-xl"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}
                      
                      {imageSourceMode === 'upload' && (
                        <div className="aspect-square">
                          <label className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-primary/50 transition-all group overflow-hidden bg-white">
                            {uploadingImage ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 size={24} className="animate-spin text-primary" />
                                <span className="text-[10px] font-bold text-slate-400">SUBIENDO...</span>
                              </div>
                            ) : (
                              <>
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                  <Plus size={20} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight group-hover:text-primary transition-colors">Añadir</span>
                              </>
                            )}
                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={uploadingImage} />
                          </label>
                        </div>
                      )}
                    </Reorder.Group>

                    {imageSourceMode === 'link' && (
                      <div className="flex gap-2">
                        <div className="relative flex-1 group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                            <LinkIcon size={16} />
                          </div>
                          <input
                            id="new-image-link"
                            type="url"
                            placeholder="Pegar link de imagen y pulsar (+)"
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm shadow-sm"
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
                        </div>
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
                          className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-2xl hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95 shrink-0"
                        >
                          <Plus size={24} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-6 mt-6 flex gap-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all border border-transparent hover:border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  style={{ flex: 2 }}
                  className="py-4 px-10 rounded-2xl font-bold bg-primary text-white hover:bg-opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
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
