import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../admin.css';
import logoImg from '../../assets/logo.png';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  LogOut, 
  ChevronRight,
  Menu,
  X,
  Palette,
  Globe,
  Mail,
  Truck
} from 'lucide-react';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Productos', icon: Package, path: '/admin/products' },
    { label: 'Categorías', icon: Tags, path: '/admin/categories' },
    { label: 'Banners', icon: Palette, path: '/admin/banners' },
    { label: 'Newsletter', icon: Mail, path: '/admin/newsletter' },
    { label: 'Despacho', icon: Truck, path: '/admin/delivery' },
    { label: 'Ajustes', icon: Palette, path: '/admin/settings' },
    { label: 'Ver Tienda', icon: Globe, path: '/' },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <img src={logoImg} alt="Charles Shopping" />
          </Link>
          <button className="mobile-close" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {location.pathname === item.path && <ChevronRight size={16} className="active-indicator" />}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <p className="user-email">{user?.email}</p>
            <p className="user-role">Administrador</p>
          </div>
          <button onClick={handleSignOut} className="sign-out-btn">
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="header-title">
            <h1>{navItems.find(i => i.path === location.pathname)?.label || 'Panel'}</h1>
          </div>
        </header>

        <div className="admin-content">
          {children}
        </div>
      </main>

      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #f4f6f8;
          color: #1a1a1a;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .admin-sidebar {
          width: 280px;
          background: #0a0a0a;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 1000;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #fff;
        }

        .sidebar-header {
          padding: 2.5rem 1.5rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        /* Subtle top glow */
        .sidebar-header::before {
          content: '';
          position: absolute;
          top: -50px;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(230, 0, 0, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .sidebar-logo {
          position: relative;
          z-index: 2;
        }

        .sidebar-logo img {
          height: 60px;
          filter: drop-shadow(0 0 15px rgba(230, 0, 0, 0.15));
        }

        .mobile-close {
          display: none;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          position: absolute;
          right: 15px;
          top: 20px;
        }

        .sidebar-nav {
          padding: 1.5rem 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1.2rem;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          border-radius: 12px;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.04);
          color: white;
          transform: translateX(4px);
        }

        .nav-item.active {
          background: linear-gradient(90deg, rgba(230, 0, 0, 0.1) 0%, rgba(230, 0, 0, 0.02) 100%);
          color: #ff4d4d;
          border: 1px solid rgba(230, 0, 0, 0.2);
          box-shadow: inset 2px 0 0 #ff4d4d;
        }

        .active-indicator {
          margin-left: auto;
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.3s ease;
        }

        .nav-item.active .active-indicator {
          opacity: 1;
          transform: translateX(0);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
        }

        .user-info {
          margin-bottom: 1.25rem;
        }

        .user-email {
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }

        .user-role {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .sign-out-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.85rem;
          background: rgba(230, 0, 0, 0.08);
          color: #ff4d4d;
          border: 1px solid rgba(230, 0, 0, 0.2);
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .sign-out-btn:hover {
          background: #E60000;
          color: white;
          box-shadow: 0 4px 15px rgba(230, 0, 0, 0.3);
          transform: translateY(-2px);
        }

        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          /* If there's a scroll area needed inside main */
          overflow-y: auto;
          height: 100vh;
        }

        .admin-header {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          padding: 1.25rem 2.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          gap: 1.5rem;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: #1a1a1a;
        }

        .header-title h1 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0;
          color: #111;
          letter-spacing: -0.02em;
        }

        .admin-content {
          padding: 2.5rem;
          flex: 1;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed;
            transform: translateX(-100%);
            box-shadow: 20px 0 50px rgba(0,0,0,0.5);
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .mobile-close, .mobile-menu-btn {
            display: block;
          }
          
          .admin-header {
            padding: 1rem 1.5rem;
          }
          
          .admin-content {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};
