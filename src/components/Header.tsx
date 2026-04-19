import { Search, ShoppingCart, User, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

import logoImg from '../assets/logo.png';
import { useTheme } from '../context/ThemeContext';

const AnnouncementBar = () => (
  <div style={{
    backgroundColor: '#000',
    color: '#fff',
    padding: '8px 0',
    fontSize: '12px',
    textAlign: 'center',
    fontWeight: '500'
  }}>
    DESPACHOS GRATIS POR COMPRAS SOBRE $30.000 EN SANTIAGO
  </div>
);

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

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

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
        padding: '20px 0' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src={settings.logoUrl || logoImg} 
              alt={settings.siteName} 
              style={{ height: '110px', width: 'auto', cursor: 'pointer', transition: 'var(--transition)' }} 
            />
          </Link>
        </div>

        <div style={{ flex: 1, maxWidth: '500px', margin: '0 40px', position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Buscar productos..." 
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingRight: '45px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              backgroundColor: '#f5f5f5',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <Search size={20} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {isAdmin && (
            <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '700', fontSize: '14px' }}>
              <Settings size={20} />
              <span>Admin</span>
            </Link>
          )}
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'inherit', textDecoration: 'none' }}>
            <User size={20} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{user ? 'Mi Cuenta' : 'Ingresar'}</span>
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
      
      <nav style={{ backgroundColor: '#fff', borderTop: '1px solid #f0f0f0' }}>
        <ul className="container" style={{ 
          display: 'flex', 
          gap: '30px', 
          padding: '12px 0', 
          fontSize: '13px', 
          fontWeight: '600',
          color: '#444'
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
              onClick={() => onCategorySelect?.(category.id)}
              style={{ 
                cursor: 'pointer', 
                transition: 'var(--transition)',
                color: selectedCategoryId === category.id ? 'var(--primary)' : 'inherit',
                borderBottom: selectedCategoryId === category.id ? '2px solid var(--primary)' : 'none',
                paddingBottom: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              {category.name.toUpperCase()}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
