import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../admin.css';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  LogOut, 
  ChevronRight,
  Menu,
  X,
  Palette
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
    { label: 'Ajustes', icon: Palette, path: '/admin/settings' },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <img src="/logo.png" alt="Charles Shopping" />
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
          background: #f8f9fa;
          color: #1a1a1a;
        }

        .admin-sidebar {
          width: 280px;
          background: #ffffff;
          border-right: 1px solid #e9ecef;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 1000;
          transition: transform 0.3s ease;
        }

        .sidebar-header {
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-logo img {
          height: 40px;
        }

        .mobile-close {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
        }

        .sidebar-nav {
          padding: 1rem;
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          color: #495057;
          text-decoration: none;
          border-radius: 0.75rem;
          margin-bottom: 0.5rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .nav-item:hover {
          background: #f1f3f5;
          color: #1a1a1a;
        }

        .nav-item.active {
          background: #fff0f0;
          color: var(--primary-red);
        }

        .active-indicator {
          margin-left: auto;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid #e9ecef;
        }

        .user-info {
          margin-bottom: 1rem;
        }

        .user-email {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: 0.75rem;
          color: #adb5bd;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sign-out-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #fff5f5;
          color: #e03131;
          border: 1px solid #ffa8a8;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .sign-out-btn:hover {
          background: #ffe3e3;
        }

        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .admin-header {
          background: white;
          padding: 1rem 2rem;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
        }

        .header-title h1 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
        }

        .admin-content {
          padding: 2rem;
          flex: 1;
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed;
            transform: translateX(-100%);
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .mobile-close, .mobile-menu-btn {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};
