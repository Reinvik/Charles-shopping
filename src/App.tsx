import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import Footer from './components/Footer';
import { Login } from './pages/Login';
import { AdminLayout } from './pages/admin/AdminLayout';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { Loader2, Pencil, Check, X } from 'lucide-react';
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
  const { settings, refreshTheme } = useTheme();
  const navigate = useNavigate();

  const [isEditingDesc, setIsEditingDesc] = React.useState(false);
  const [descInput, setDescInput] = React.useState(settings.siteDescription || '');
  const [savingDesc, setSavingDesc] = React.useState(false);

  React.useEffect(() => {
    setDescInput(settings.siteDescription || '');
  }, [settings.siteDescription]);

  const handleSaveDescription = async () => {
    if (!tenant) return;
    try {
      setSavingDesc(true);
      const updatedTheme = {
        ...settings,
        siteDescription: descInput
      };
      
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          tenant_id: tenant.id,
          key: 'theme',
          value: updatedTheme,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key,tenant_id' });

      if (error) throw error;
      
      await refreshTheme();
      setIsEditingDesc(false);
    } catch (err: any) {
      alert('Error al guardar la descripción: ' + err.message);
    } finally {
      setSavingDesc(false);
    }
  };

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

      query = query
        .order('is_on_offer', { ascending: false })
        .order('order_index', { ascending: true });

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
          {isEditingDesc ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', maxWidth: '600px', flexDirection: 'column' }}>
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveDescription}
                  disabled={savingDesc}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <Check size={14} /> {savingDesc ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingDesc(false);
                    setDescInput(settings.siteDescription || '');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#e2e8f0',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '600px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>
                {selectedCategory 
                  ? `Explora nuestra selección de ${selectedCategory.name.toLowerCase()} con los mejores precios y stock garantizado.`
                  : (settings.siteDescription || 'Descubre nuestra selección de productos de aseo y papelería de las mejores marcas con envío a domicilio.')}
              </span>
              {isAdmin && !selectedCategory && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                    backgroundColor: '#fee2e2',
                  }}
                  title="Editar descripción"
                >
                  <Pencil size={14} />
                </button>
              )}
            </p>
          )}
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
                onClick={() => navigate('/admin/products?action=add' + (selectedCategoryId ? `&category=${selectedCategoryId}` : ''))}
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
                name={product.name || 'Producto sin nombre'}
                price={Number(product.price) || 0}
                image={product.image_url || 'https://via.placeholder.com/400?text=Sin+Imagen'}
                oldPrice={product.original_price ? Number(product.original_price) : undefined}
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
import { AdminCoupons } from './pages/admin/AdminCoupons';
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminNewsletter } from './pages/admin/AdminNewsletter';
import { AdminDelivery } from './pages/admin/AdminDelivery';
import { AdminTenants } from './pages/admin/AdminTenants';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminTransactions } from './pages/admin/AdminTransactions';
import AdminSettings from './pages/admin/AdminSettings';
import CheckoutSuccess from './pages/checkout/Success';
import CheckoutFailure from './pages/checkout/Failure';
import { ProductDetail } from './pages/ProductDetail';
import { DynamicPage } from './pages/DynamicPage';
import DeliveryPortal from './pages/DeliveryPortal';
import { useTheme } from './context/ThemeContext';

function App() {
  const { tenant, loading: tenantLoading } = useTenant();
  const { loading: themeLoading } = useTheme();

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

  if (tenantLoading || themeLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <Loader2 className="animate-spin" size={48} color="#94a3b8" />
      </div>
    );
  }

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
                  <Route path="/coupons" element={<AdminLayout><AdminCoupons /></AdminLayout>} />
                  <Route path="/banners" element={<AdminLayout><AdminBanners /></AdminLayout>} />
                  <Route path="/newsletter" element={<AdminLayout><AdminNewsletter /></AdminLayout>} />
                  <Route path="/delivery" element={<AdminLayout><AdminDelivery /></AdminLayout>} />
                  <Route path="/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
                  <Route path="/tenants" element={<AdminLayout><AdminTenants /></AdminLayout>} />
                  <Route path="/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
                  <Route path="/transactions" element={<AdminLayout><AdminTransactions /></AdminLayout>} />
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
