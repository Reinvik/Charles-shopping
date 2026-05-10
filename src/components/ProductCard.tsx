import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Check, Flame } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

interface ProductProps {
  id: string | number;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  discount?: string;
  isOnOffer?: boolean;
}

const ProductCard: React.FC<ProductProps> = ({ id, name, image, price, oldPrice, discount, isOnOffer }) => {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantity(prev => Math.max(1, prev - 1));
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({ id, name, image, price, original_price: oldPrice }, quantity);
    
    // Feedback animation
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div 
      onClick={() => navigate(`/product/${id}`)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="product-card"
      style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: 'clamp(10px, 4vw, 16px)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(8px, 3vw, 12px)',
        border: '1px solid #f0f0f0',
        transition: 'var(--transition)',
        cursor: 'pointer'
      }}
      whileHover={{ scale: 1.02, boxShadow: 'var(--shadow)' }}
    >
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
        {isOnOffer && (
          <div style={{ 
            backgroundColor: '#ef4444', 
            color: '#fff', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '10px', 
            fontWeight: '900',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)'
          }}>
            <Flame size={12} fill="white" />
            Oferta
          </div>
        )}
        {discount && <div className="badge-sale">{discount}</div>}
      </div>
      
      <div style={{ 
        width: '100%', 
        aspectRatio: '1', 
        overflow: 'hidden', 
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff'
      }}>
        <img 
          src={image} 
          alt={name} 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{ 
          fontSize: 'clamp(12px, 3.5vw, 14px)', 
          fontWeight: '600', 
          color: '#333',
          lineHeight: '1.3',
          minHeight: '36px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {name}
        </h3>

        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {oldPrice && (
            <span style={{ 
              fontSize: '11px', 
              color: '#999', 
              textDecoration: 'line-through' 
            }}>
              ${oldPrice.toLocaleString('es-CL')}
            </span>
          )}
          <span style={{ 
            fontSize: 'clamp(15px, 4.5vw, 18px)', 
            fontWeight: '800', 
            color: 'var(--primary)' 
          }}>
            ${price.toLocaleString('es-CL')} <span style={{ fontSize: '10px', opacity: 0.7 }}>CLP</span>
          </span>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginTop: '8px',
        gap: '10px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          border: '1px solid #ddd', 
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: '#fff'
        }}>
          <button 
            onClick={handleDecrement}
            style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <Minus size={14} />
          </button>
          <span style={{ padding: '0 8px', fontSize: '14px', fontWeight: '600', minWidth: '24px', textAlign: 'center' }}>
            {quantity}
          </span>
          <button 
            onClick={handleIncrement}
            style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} />
          </button>
        </div>
        
        <button 
          className={added ? "btn-primary" : "btn-primary"} 
          onClick={handleAddToCart}
          style={{ 
            padding: '8px', 
            borderRadius: '10px', 
            flex: 1,
            backgroundColor: added ? '#059669' : 'var(--primary)',
            transition: 'background-color 0.3s ease',
            height: '38px'
          }}
        >
          {added ? (
            <Check size={18} />
          ) : (
            <>
              <ShoppingCart size={16} />
              <span style={{ fontSize: '11px', fontWeight: '800' }}>Añadir</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
