import { Search, ShoppingCart, User, Settings, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { useTenant } from '../context/TenantContext';

import logoImg from '../assets/logo.png';
import { useTheme } from '../context/ThemeContext';

const AnnouncementBar = () => {
  const { settings } = useTheme();
  
  if (!settings.announcementText) return null;
  
  return (
    <div style={{
      background: 'linear-gradient(270deg, #000, #333, #000)',
      backgroundSize: '400% 400%',
      animation: 'gradientBG 15s ease infinite',
      color: '#fff',
      padding: '10px 0',
      fontSize: '11px',
      textAlign: 'center',
      fontWeight: '700',
      letterSpacing: '0.5px',
      textTransform: 'uppercase'
    }}>
      {settings.announcementText}
      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

interface HeaderProps {
  selectedCategoryId?: string | null;
  onCategorySelect?: (id: string | null) => void;
}

const Header = ({ selectedCategoryId, onCategorySelect }: HeaderProps) => {
  const { user, isAdmin } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();
  const { settings } = useTheme();
  const [categories, setCategories] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const { tenant } = useTenant();

  const fetchCategories = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('order_index', { ascending: true });
    if (data) setCategories(data);
  };

  useEffect(() => {
    fetchCategories();
  }, [tenant]);

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !tenant) return;
    try {
      const slug = newCatName.toLowerCase().trim().replace(/\s+/g, '-');
      const { error } = await supabase.from('categories').insert([{ 
        name: newCatName.trim(), 
        slug,
        tenant_id: tenant.id
      }]);
      if (error) throw error;
      setNewCatName('');
      setIsAddingCat(false);
      fetchCategories();
    } catch (err: any) {
      alert('Error al agregar categoría: ' + err.message);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!tempName.trim() || !tenant) return;
    try {
      const slug = tempName.toLowerCase().trim().replace(/\s+/g, '-');
      const { error } = await supabase
        .from('categories')
        .update({ name: tempName.trim(), slug })
        .eq('id', id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      setEditingCatId(null);
      fetchCategories();
    } catch (err: any) {
      alert('Error al actualizar categoría: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${name}"? Los productos asociados podrían quedar sin categoría.`)) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (err: any) {
      alert('Error al eliminar categoría: ' + err.message);
    }
  };

  return (
    <header style={{ 
      borderBottom: '1px solid var(--border)', 
      position: 'sticky', 
      top: 0, 
      backgroundColor: '#fff', 
      zIndex: 1000,
      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      transform: isVisible ? 'translateY(0)' : 'translateY(-100%)'
    }}>
      <AnnouncementBar />
      <div className="container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '12px 0' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src={settings.logoUrl || logoImg} 
              alt={settings.siteName} 
              className="site-logo"
              style={{ 
                height: 'clamp(50px, 12vw, 100px)', 
                width: 'auto', 
                cursor: 'pointer', 
                transition: 'var(--transition)' 
              }} 
            />
          </Link>
        </div>

        <div className="desktop-only" style={{ flex: 1, maxWidth: '500px', margin: '0 40px', position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Buscar productos..." 
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingRight: '45px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              backgroundColor: '#f5f5f5',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <Search size={20} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 24px)' }}>
          <div className="mobile-only">
            <Search size={22} color="var(--slate-600)" />
          </div>
          {isAdmin && (
            <Link to="/admin" className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '700', fontSize: '14px' }}>
              <Settings size={20} />
              <span>Admin</span>
            </Link>
          )}
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'inherit', textDecoration: 'none' }}>
            <User size={22} />
            <span className="desktop-only" style={{ fontSize: '14px', fontWeight: '600' }}>{user ? 'Mi Cuenta' : 'Ingresar'}</span>
          </Link>
          <div 
            onClick={() => setIsCartOpen(true)}
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                fontSize: '10px',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
              }}>{totalItems}</span>
            )}
          </div>
        </div>
      </div>
      
      <nav style={{ 
        backgroundColor: '#fff', 
        borderTop: '1px solid #f0f0f0',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }} className="hide-scrollbar">
        <ul className="container" style={{ 
          display: 'flex', 
          gap: '24px', 
          padding: '12px 1rem', 
          fontSize: '12px', 
          fontWeight: '700',
          color: '#444',
          minWidth: 'max-content'
        }}>
          <li 
            onClick={() => onCategorySelect?.(null)}
            style={{ 
              cursor: 'pointer', 
              transition: 'var(--transition)',
              color: !selectedCategoryId ? 'var(--primary)' : 'inherit',
              borderBottom: !selectedCategoryId ? '2px solid var(--primary)' : 'none',
              paddingBottom: '4px'
            }}
          >
            TODOS
          </li>
          {categories.map(category => (
            <li 
              key={category.id} 
              style={{ 
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer', 
                transition: 'var(--transition)',
                color: selectedCategoryId === category.id ? 'var(--primary)' : 'inherit',
                borderBottom: selectedCategoryId === category.id ? '2px solid var(--primary)' : 'none',
                paddingBottom: '4px',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                if (editingCatId === category.id) return;
                onCategorySelect?.(category.id);
              }}
            >
              {editingCatId === category.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input 
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateCategory(category.id);
                      if (e.key === 'Escape') setEditingCatId(null);
                    }}
                    style={{ padding: '2px 4px', fontSize: '12px', border: '1px solid var(--primary)', borderRadius: '4px' }}
                  />
                  <Check size={14} className="text-primary" onClick={() => handleUpdateCategory(category.id)} />
                  <X size={14} className="text-red-500" onClick={() => setEditingCatId(null)} />
                </div>
              ) : (
                <>
                  {category.name.toUpperCase()}
                  {isAdmin && (
                    <div className="admin-cat-actions" style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                      <Pencil 
                        size={12} 
                        style={{ opacity: 0.4 }} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCatId(category.id);
                          setTempName(category.name);
                        }} 
                      />
                      <Trash2 
                        size={12} 
                        style={{ opacity: 0.4 }} 
                        className="hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id, category.name);
                        }} 
                      />
                    </div>
                  )}
                </>
              )}
            </li>
          ))}

          {isAdmin && (
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isAddingCat ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input 
                    autoFocus
                    placeholder="Nueva..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCategory();
                      if (e.key === 'Escape') setIsAddingCat(false);
                    }}
                    style={{ padding: '2px 4px', fontSize: '12px', border: '1px solid var(--primary)', borderRadius: '4px' }}
                  />
                  <Plus size={16} className="text-primary" onClick={handleAddCategory} style={{ cursor: 'pointer' }} />
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingCat(true)}
                  style={{ 
                    background: 'none', border: '1px dashed #ccc', borderRadius: '4px', padding: '2px 8px',
                    fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                    color: '#999'
                  }}
                >
                  <Plus size={12} /> AGREGAR
                </button>
              )}
            </li>
          )}
        </ul>
      </nav>

      <style>{`
        .admin-cat-actions {
          opacity: 0.3;
          transition: opacity 0.2s;
        }
        li:hover .admin-cat-actions {
          opacity: 1;
        }
        .admin-cat-actions svg:hover {
          color: var(--primary);
          transform: scale(1.1);
        }
      `}</style>
    </header>
  );
};

export default Header;
