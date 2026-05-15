import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import Footer from './components/Footer';
import { Login } from './pages/Login';
import { AdminLayout } from './pages/admin/AdminLayout';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';
import { CartProvider } from './context/CartContext';
import CartDrawer from './components/CartDrawer';
import { Toaster } from 'sonner';

import HeroBanner from './components/HeroBanner';
import { SEO } from './hooks/useSEO';
import { useTenant } from './context/TenantContext';

const HomePage: React.FC = () => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<any>(null);
  const { isAdmin } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const seoData = {
    title: selectedCategory ? selectedCategory.name : (tenant?.display_name || 'Inicio'),
    description: selectedCategory 
      ? `Compra ${selectedCategory.name.toLowerCase()} al mejor precio en ${tenant?.display_name}.`
      : `${tenant?.display_name}: Tu tienda de confianza. Productos de alta calidad con despacho a domicilio.`
  };

  React.useEffect(() => {
    const fetchProducts = async () => {
      if (!tenant) return;
      
      setLoading(true);
      let query = supabase
        .from('products')
        .select(`
          *,
          categories(id, name)
        `)
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .gt('stock', 0);
      
      const { data: offersCat } = await supabase
        .from('categories')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('slug', 'ofertas')
        .single();

      if (selectedCategoryId) {
        if (selectedCategoryId === offersCat?.id) {
          query = query.or(`category_id.eq.${selectedCategoryId},is_on_offer.eq.true`);
        } else {
          query = query.eq('category_id', selectedCategoryId);
        }
      }

      query = query.order('order_index', { ascending: true });

      const { data, error } = await query;
      
      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [selectedCategoryId, tenant]);

  React.useEffect(() => {
    if (selectedCategoryId && tenant) {
      const fetchCategory = async () => {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .eq('id', selectedCategoryId)
          .eq('tenant_id', tenant.id)
          .single();
        if (data) setSelectedCategory(data);
      };
      fetchCategory();
    } else {
      setSelectedCategory(null);
    }
  }, [selectedCategoryId, tenant]);

  return (
    <div className="app">
      <SEO {...seoData} />
      <Header 
        selectedCategoryId={selectedCategoryId} 
        onCategorySelect={setSelectedCategoryId} 
      />
      
      <main className="container" style={{ padding: '24px 0' }}>
        {!selectedCategoryId && <HeroBanner onCategorySelect={setSelectedCategoryId} />}
        
        <div style={{ marginBottom: '32px', padding: '0 4px' }}>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '800', marginBottom: '8px' }}>
            {selectedCategory ? selectedCategory.name : 'Catálogo Completo'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '600px' }}>
            {selectedCategory 
              ? `Explora nuestra selección de ${selectedCategory.name.toLowerCase()} con los mejores precios y stock garantizado.`
              : 'Descubre nuestra selección de productos de aseo y papelería de las mejores marcas con envío a domicilio.'}
          </p>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid #f0f0f0',
          paddingBottom: '16px',
          paddingLeft: '4px',
          paddingRight: '4px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '500' }}>
            <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{products.length} productos</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="desktop-only" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ordenar por:</span>
            <select style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: '#fff'
            }}>
              <option>Destacados</option>
              <option>Precio: Menor a Mayor</option>
              <option>Precio: Mayor a Menor</option>
              <option>A-Z</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
          </div>
        ) : products.length > 0 ? (
          <div className="product-grid">
            {isAdmin && (
              <div 
                onClick={() => navigate('/product/new')}
                style={{
                  border: '2px dashed var(--primary)',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '300px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(var(--primary-rgb), 0.02)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.05)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.02)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                  fontSize: '32px'
                }}>+</div>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>Añadir Producto</span>
              </div>
            )}
            {products.map(product => (
              <ProductCard 
                key={product.id}
                id={product.id}
                name={product.name}
                image={product.image_url}
                price={product.price}
                oldPrice={product.original_price}
                discount={product.discount_badge}
                isOnOffer={product.is_on_offer}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <h2 style={{ color: '#ccc', fontWeight: '500' }}>No se encontraron productos en esta categoría</h2>
            <button 
              onClick={() => setSelectedCategoryId(null)}
              className="btn-primary" 
              style={{ marginTop: '20px' }}
            >
              Ver todos los productos
            </button>
          </div>
        )}
      </main>

      <Footer onCategorySelect={setSelectedCategoryId} />
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" size={48} color="var(--primary)" />
    </div>
  );
  
  if (!user || !isAdmin) return <Navigate to="/login" />;

  return <>{children}</>;
};

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminNewsletter } from './pages/admin/AdminNewsletter';
import { AdminDelivery } from './pages/admin/AdminDelivery';
import { AdminTenants } from './pages/admin/AdminTenants';
import { AdminUsers } from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';
import CheckoutSuccess from './pages/checkout/Success';
import CheckoutFailure from './pages/checkout/Failure';
import { ProductDetail } from './pages/ProductDetail';
import { DynamicPage } from './pages/DynamicPage';
import DeliveryPortal from './pages/DeliveryPortal';

function App() {
  const { tenant } = useTenant();

  React.useEffect(() => {
    const trackVisit = async () => {
      if (!tenant) return;
      
      let sessionId = sessionStorage.getItem('shop_session_id');
      
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('shop_session_id', sessionId);
        
        // Registrar la visita silenciosamente
        try {
          await supabase.from('store_visits').insert([{ 
            session_id: sessionId,
            tenant_id: tenant.id 
          }]);
        } catch (err) {
          console.error("No se pudo registrar la visita", err);
        }
      }
    };
    
    trackVisit();
  }, [tenant]);

  return (
    <CartProvider>
      <Router>
        <CartDrawer />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/entrega/:orderId" element={<DeliveryPortal />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/failure" element={<CheckoutFailure />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/p/:slug" element={<DynamicPage />} />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                  <Route path="/products" element={<AdminLayout><AdminProducts /></AdminLayout>} />
                  <Route path="/orders" element={<AdminLayout><AdminOrders /></AdminLayout>} />
                  <Route path="/categories" element={<AdminLayout><AdminCategories /></AdminLayout>} />
                  <Route path="/banners" element={<AdminLayout><AdminBanners /></AdminLayout>} />
                  <Route path="/newsletter" element={<AdminLayout><AdminNewsletter /></AdminLayout>} />
                  <Route path="/delivery" element={<AdminLayout><AdminDelivery /></AdminLayout>} />
                  <Route path="/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
                  <Route path="/tenants" element={<AdminLayout><AdminTenants /></AdminLayout>} />
                  <Route path="/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
                </Routes>
              </ProtectedRoute>
            } 
          />
        </Routes>
        <Toaster position="top-right" richColors />
      </Router>
    </CartProvider>
  );
}

export default App;
