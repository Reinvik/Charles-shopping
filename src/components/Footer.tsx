import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const Footer = () => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name')
        .limit(5);
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  return (
    <footer style={{ backgroundColor: '#fff', borderTop: '1px solid var(--border)', padding: '60px 0 30px' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>
            <span style={{ color: 'var(--dark)' }}>CHARLES</span>
            <span style={{ color: 'var(--primary)' }}>SHOPPING</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Tu tienda de confianza para productos de aseo y papelería. Despachos rápidos y seguros a todo Santiago.
          </p>
        </div>
        
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Categorías</h4>
          <ul style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categories.map(category => (
              <li key={category.id} style={{ cursor: 'pointer' }}>{category.name}</li>
            ))}
            {categories.length === 0 && (
              <>
                <li>Papel Higiénico</li>
                <li>Detergentes</li>
                <li>Limpieza de Hogar</li>
              </>
            )}
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Ayuda</h4>
          <ul style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li>Seguimiento de Pedido</li>
            <li>Políticas de Envío</li>
            <li>Preguntas Frecuentes</li>
            <li>Contacto</li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Newsletter</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '15px' }}>
            Suscríbete para recibir ofertas exclusivas.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="email" 
              placeholder="Email" 
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                outline: 'none',
                fontSize: '13px'
              }}
            />
            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Unirse</button>
          </div>
        </div>
      </div>
      
      <div className="container" style={{ marginTop: '60px', borderTop: '1px solid #f0f0f0', paddingTop: '30px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
        © 2026 Charles Shopping Delivery Home. Todos los derechos reservados.
      </div>
    </footer>
  );
};

export default Footer;
