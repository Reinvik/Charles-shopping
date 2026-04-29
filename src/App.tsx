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

const HomePage: React.FC = () => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<any>(null);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase
        .from('products')
        .select(`
          *,
          categories(id, name)
        `)
        .eq('is_active', true)
        .gt('stock', 0);
      
      if (selectedCategoryId) {
        // Si es la categoría de ofertas, mostramos productos de esa categoría O con el flag is_on_offer
        if (selectedCategoryId === '146e6d06-2a88-444e-b32c-25cd0db766eb') {
          query = query.or(`category_id.eq.${selectedCategoryId},is_on_offer.eq.true`);
        } else {
          query = query.eq('category_id', selectedCategoryId);
        }
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [selectedCategoryId]);

  React.useEffect(() => {
    if (selectedCategoryId) {
      const fetchCategory = async () => {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .eq('id', selectedCategoryId)
          .single();
        if (data) setSelectedCategory(data);
      };
      fetchCategory();
    } else {
      setSelectedCategory(null);
    }
  }, [selectedCategoryId]);

  return (
    <div className="app">
      <Header 
        selectedCategoryId={selectedCategoryId} 
        onCategorySelect={setSelectedCategoryId} 
      />
      
      <main className="container" style={{ padding: '40px 0' }}>
        {!selectedCategoryId && <HeroBanner onCategorySelect={setSelectedCategoryId} />}
        
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>
            {selectedCategory ? selectedCategory.name : 'Catálogo Completo'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
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
          paddingBottom: '16px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>
            Mostrando <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{products.length} productos</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ordenar por:</span>
            <select style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '24px' 
          }}>
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

      <Footer />
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
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminNewsletter } from './pages/admin/AdminNewsletter';
import { AdminDelivery } from './pages/admin/AdminDelivery';
import AdminSettings from './pages/admin/AdminSettings';
import CheckoutSuccess from './pages/checkout/Success';
import CheckoutFailure from './pages/checkout/Failure';
import { ProductDetail } from './pages/ProductDetail';
import { DynamicPage } from './pages/DynamicPage';

function App() {
  React.useEffect(() => {
    const trackVisit = async () => {
      let sessionId = sessionStorage.getItem('shop_session_id');
      
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('shop_session_id', sessionId);
        
        // Registrar la visita silenciosamente
        try {
          await supabase.from('store_visits').insert([{ session_id: sessionId }]);
        } catch (err) {
          console.error("No se pudo registrar la visita", err);
        }
      }
    };
    
    trackVisit();
  }, []);

  return (
    <CartProvider>
      <Router>
        <CartDrawer />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
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
                  <Route path="/categories" element={<AdminLayout><AdminCategories /></AdminLayout>} />
                  <Route path="/banners" element={<AdminLayout><AdminBanners /></AdminLayout>} />
                  <Route path="/newsletter" element={<AdminLayout><AdminNewsletter /></AdminLayout>} />
                  <Route path="/delivery" element={<AdminLayout><AdminDelivery /></AdminLayout>} />
                  <Route path="/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
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
