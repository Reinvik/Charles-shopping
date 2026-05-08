import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, Trash2, Loader2, Save, X, MoveUp, MoveDown } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  order_index: number;
}

export const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const currentCat = categories[index];
    const targetCat = categories[newIndex];

    const { error: err1 } = await supabase
      .from('categories')
      .update({ order_index: targetCat.order_index })
      .eq('id', currentCat.id);

    const { error: err2 } = await supabase
      .from('categories')
      .update({ order_index: currentCat.order_index })
      .eq('id', targetCat.id);

    if (err1 || err2) toast.error('Error al reordenar');
    else fetchCategories();
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error('Error al cargar categorías: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    try {
      const slug = generateSlug(newValue.trim());
      const { error } = await supabase
        .from('categories')
        .insert([{ 
          name: newValue.trim(), 
          slug,
          order_index: categories.length 
        }]);

      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      toast.success('Categoría creada correctamente');
      setNewValue('');
      setIsAdding(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Supabase Error:', error);
      toast.error(`Error al crear categoría: ${error.message}${error.details ? ` (${error.details})` : ''}`);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.trim()) return;

    try {
      const slug = generateSlug(editValue.trim());
      const { error } = await supabase
        .from('categories')
        .update({ name: editValue.trim(), slug })
        .eq('id', id);

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      toast.success('Categoría actualizada');
      setIsEditing(null);
      fetchCategories();
    } catch (error: any) {
      console.error('Supabase Error:', error);
      toast.error(`Error al actualizar: ${error.message}${error.details ? ` (${error.details})` : ''}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${name}"? Esto podría afectar a los productos asociados.`)) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Categoría eliminada');
      fetchCategories();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Categorías</h2>
          <p className="text-slate-500 text-sm">Gestiona las categorías de tus productos</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-all"
        >
          <Plus size={20} />
          Nueva Categoría
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-4 items-center">
          <input
            autoFocus
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Nombre de la categoría..."
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <Save size={18} /> Guardar
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="text-slate-500 hover:text-slate-700 p-2"
          >
            <X size={20} />
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-sm text-slate-700">Orden</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-700">Nombre</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-700">Slug</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-700 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {categories.map((category, index) => (
              <tr key={category.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => moveCategory(index, 'up')} 
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button 
                      onClick={() => moveCategory(index, 'down')} 
                      disabled={index === categories.length - 1}
                      className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"
                    >
                      <MoveDown size={14} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {isEditing === category.id ? (
                    <input
                      autoFocus
                      type="text"
                      className="w-full px-3 py-1 border border-primary rounded"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(category.id)}
                    />
                  ) : (
                    <span className="font-medium">{category.name}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">
                  {category.slug}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {isEditing === category.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(category.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={() => setIsEditing(null)}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(category.id);
                            setEditValue(category.name);
                          }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id, category.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                  No hay categorías creadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
