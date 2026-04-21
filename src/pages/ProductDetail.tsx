import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ShoppingCart, Plus, Minus, Check, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion } from 'framer-motion';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data && !error) {
        setProduct(data);
      }
      setLoading(false);
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart({ 
      id: product.id, 
      name: product.name, 
      image: product.image_url, 
      price: product.price, 
      original_price: product.original_price 
    }, quantity);
    
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Producto no encontrado</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>Volver a la tienda</button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {/* Header Bar */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #eaeaea', 
        backgroundColor: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: '600',
              color: '#333'
            }}
          >
            <ArrowLeft size={20} />
            Volver a la tienda
          </button>
        </div>
      </div>

      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="product-detail-layout">
          {/* Left Column: Image */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="product-image-container"
          >
            {product.discount_badge && (
              <div className="detail-badge-sale">{product.discount_badge}</div>
            )}
            <img src={product.image_url} alt={product.name} />
          </motion.div>

          {/* Right Column: Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="product-info-container"
          >
            <h1 className="product-title">{product.name}</h1>
            
            <div className="product-price-section">
              {product.original_price && (
                <span className="old-price">${product.original_price.toLocaleString('es-CL')} CLP</span>
              )}
              <span className="current-price">${product.price.toLocaleString('es-CL')} CLP</span>
            </div>

            <div className="product-description">
              <h3>Descripción</h3>
              <p>
                {product.description || "Este producto te garantiza la mejor calidad para tus compras en Charles Shopping. Ideal para tu hogar o tu empresa, contamos con el mejor stock de la ciudad."}
              </p>
            </div>

            <div className="product-actions-box">
              <label>Cantidad</label>
              <div className="quantity-selector">
                <button onClick={handleDecrement} className="qty-btn"><Minus size={18} /></button>
                <span className="qty-value">{quantity}</span>
                <button onClick={handleIncrement} className="qty-btn"><Plus size={18} /></button>
              </div>

              <button 
                onClick={handleAddToCart}
                className={`add-btn ${added ? 'added' : ''}`}
              >
                {added ? (
                  <>
                    <Check size={20} />
                    Agregado al carrito
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    Añadir {quantity} por ${(product.price * quantity).toLocaleString('es-CL')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        .product-detail-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (min-width: 768px) {
          .product-detail-layout {
            grid-template-columns: 1fr 1fr;
            align-items: start;
          }
        }

        .product-image-container {
          background: #fff;
          border-radius: 16px;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          aspect-ratio: 1;
        }

        .product-image-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .detail-badge-sale {
          position: absolute;
          top: 20px;
          left: 20px;
          background: #ef4444;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 10px rgba(239,68,68,0.3);
        }

        .product-info-container {
          display: flex;
          flex-direction: column;
          padding: 20px 0;
        }

        .product-title {
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 800;
          color: #1a1a1a;
          line-height: 1.2;
          margin-bottom: 20px;
        }

        .product-price-section {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-bottom: 30px;
          padding-bottom: 30px;
          border-bottom: 1px solid #eaeaea;
        }

        .old-price {
          font-size: 18px;
          color: #9ca3af;
          text-decoration: line-through;
          font-weight: 500;
        }

        .current-price {
          font-size: 32px;
          font-weight: 800;
          color: var(--primary);
        }

        .product-description h3 {
          font-size: 16px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 12px;
        }

        .product-description p {
          font-size: 15px;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .product-actions-box {
          background: #fff;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          border: 1px solid #f3f4f6;
        }

        .product-actions-box label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 10px;
        }

        .quantity-selector {
          display: flex;
          align-items: center;
          border: 2px solid #f3f4f6;
          border-radius: 8px;
          width: fit-content;
          margin-bottom: 20px;
        }

        .qty-btn {
          background: none;
          border: none;
          padding: 12px 16px;
          cursor: pointer;
          color: #4b5563;
          transition: all 0.2s;
        }

        .qty-btn:hover {
          background: #f9fafb;
          color: var(--primary);
        }

        .qty-value {
          font-size: 16px;
          font-weight: 700;
          width: 40px;
          text-align: center;
        }

        .add-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: var(--primary);
          color: white;
          padding: 18px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }

        .add-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }

        .add-btn.added {
          background: #10b981;
        }
      `}</style>
    </div>
  );
};
