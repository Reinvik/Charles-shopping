import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Mail, MessageCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const InstagramIcon = ({ size = 24, ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
import { useTenant } from '../context/TenantContext';

interface FooterProps {
  onCategorySelect?: (id: string | null) => void;
}

const Footer = ({ onCategorySelect }: FooterProps) => {
  const { settings } = useTheme();
  const { tenant } = useTenant();
  const [categories, setCategories] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [loadingNewsletter, setLoadingNewsletter] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!tenant) return;
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('name')
        .limit(5);
      if (data) setCategories(data);
    };
    fetchCategories();
  }, [tenant]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoadingNewsletter(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email }]);

      if (error) {
        if (error.code === '23505') { // Postgres unique violation code
          toast.info('Este correo ya está suscrito.');
        } else {
          throw error;
        }
      } else {
        toast.success('¡Gracias por suscribirte!');
        setEmail('');
      }
    } catch (err: any) {
      toast.error('Error al suscribirse: ' + err.message);
    } finally {
      setLoadingNewsletter(false);
    }
  };

  return (
    <footer style={{ backgroundColor: '#fff', borderTop: '1px solid var(--border)', padding: 'clamp(40px, 10vw, 60px) 0 30px' }}>
      <div className="container footer-grid">
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
            {settings.siteName}
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {settings.siteDescription}
          </p>
          {(settings.contactWhatsapp || settings.contactEmail || settings.contactInstagram) && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
              {settings.contactWhatsapp && (
                <a 
                  href={`https://wa.me/${settings.contactWhatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#fff',
                    backgroundColor: '#25D366',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(37, 211, 102, 0.15)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#128C7E';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#25D366';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}

              {settings.contactInstagram && (
                <a 
                  href={`https://instagram.com/${settings.contactInstagram.trim().replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#fff',
                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(220, 39, 67, 0.15)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(0.9)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <InstagramIcon size={14} /> Instagram
                </a>
              )}

              {settings.contactEmail && (
                <a 
                  href={`mailto:${settings.contactEmail.trim()}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#fff',
                    backgroundColor: 'var(--primary)',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(0.9)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Mail size={14} /> Correo
                </a>
              )}
            </div>
          )}
        </div>
        
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Categorías</h4>
          <ul style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categories.map(category => (
              <li 
                key={category.id} 
                style={{ cursor: 'pointer' }}
                className="hover:text-primary transition-colors"
                onClick={() => {
                  onCategorySelect?.(category.id);
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
              >
                {category.name}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Ayuda</h4>
          <ul style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li><Link to="/p/seguimiento-de-pedido" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-primary transition-colors">Seguimiento de Pedido</Link></li>
            <li><Link to="/p/politicas-de-envio" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-primary transition-colors">Políticas de Envío</Link></li>
            <li><Link to="/p/preguntas-frecuentes" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-primary transition-colors">Preguntas Frecuentes</Link></li>
            <li><Link to="/p/contacto" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-primary transition-colors">Contacto</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Newsletter</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '15px' }}>
            Suscríbete para recibir ofertas exclusivas.
          </p>
          <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                outline: 'none',
                fontSize: '13px'
              }}
            />
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loadingNewsletter}
              style={{ padding: '8px 16px', fontSize: '13px', minWidth: '80px', display: 'flex', justifyContent: 'center' }}
            >
              {loadingNewsletter ? <Loader2 size={16} className="animate-spin" /> : 'Unirse'}
            </button>
          </form>
        </div>
      </div>
      
      <div className="container" style={{ marginTop: '60px', borderTop: '1px solid #f0f0f0', paddingTop: '30px', textAlign: 'center', fontSize: '11px', color: '#999', display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
        <span>© {new Date().getFullYear()} {settings.siteName}. Todos los derechos reservados.</span>
        <span>|</span>
        <a href="https://smartlean.cl" target="_blank" rel="noopener noreferrer" style={{ 
          color: '#0ea5e9', 
          textDecoration: 'none', 
          transition: 'color 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#0284c7'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#0ea5e9'; }}
        >
          Powered by SmartLean
        </a>
      </div>
    </footer>
  );
};

export default Footer;
