import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Mail, X, PhoneCall } from 'lucide-react';

const InstagramIcon = ({ size = 20, ...props }: any) => (
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

export const ContactBubble: React.FC = () => {
  const { settings } = useTheme();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Ocultar en páginas del administrador y login
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/login')) {
    return null;
  }

  const { contactWhatsapp, contactEmail, contactInstagram } = settings;

  // Filtrar canales activos
  const activeChannels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <MessageCircle size={20} />,
      url: contactWhatsapp ? `https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, '')}` : null,
      color: '#25D366',
      label: 'Enviar Mensaje'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <InstagramIcon size={20} />,
      url: contactInstagram ? `https://instagram.com/${contactInstagram.trim().replace(/^@/, '')}` : null,
      color: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      label: 'Seguir en Instagram'
    },
    {
      id: 'email',
      name: 'Correo',
      icon: <Mail size={20} />,
      url: contactEmail ? `mailto:${contactEmail.trim()}` : null,
      color: 'var(--primary)',
      label: 'Escribir Correo'
    }
  ].filter(channel => channel.url !== null);

  if (activeChannels.length === 0) return null;

  const handleFabClick = () => {
    if (activeChannels.length === 1) {
      // Si solo hay un canal configurado, abrir directamente en una pestaña nueva
      window.open(activeChannels[0].url!, '_blank', 'noopener,noreferrer');
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="contact-bubble-container">
      {/* Pila de opciones flotantes */}
      {isOpen && (
        <div className="contact-options-stack">
          {activeChannels.map((channel, index) => (
            <a
              key={channel.id}
              href={channel.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-option-item"
              style={{
                '--item-index': index,
                background: channel.color,
              } as React.CSSProperties}
              onClick={() => setIsOpen(false)}
            >
              <span className="contact-option-tooltip">{channel.name}</span>
              <div className="contact-option-icon">{channel.icon}</div>
            </a>
          ))}
        </div>
      )}

      {/* Botón de acción principal flotante (FAB) */}
      <button 
        onClick={handleFabClick}
        className={`contact-fab ${isOpen ? 'active' : ''}`}
        aria-label="Canales de contacto"
        style={{
          backgroundColor: 'var(--primary)',
        }}
      >
        {isOpen ? <X size={24} /> : <PhoneCall size={24} className="phone-icon-pulse" />}
      </button>

      <style>{`
        .contact-bubble-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 16px;
          font-family: inherit;
        }

        .contact-fab {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .contact-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }

        .contact-fab.active {
          transform: rotate(90deg);
          background-color: #334155 !important;
        }

        .phone-icon-pulse {
          animation: fab-pulse 2s infinite;
        }

        @keyframes fab-pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        .contact-options-stack {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          margin-bottom: 4px;
          animation: stack-fade-in 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes stack-fade-in {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .contact-option-item {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          color: white;
          text-decoration: none;
          box-shadow: 0 3px 10px rgba(0,0,0,0.15);
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          animation: item-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
          animation-delay: calc(var(--item-index) * 0.05s);
        }

        @keyframes item-slide-up {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .contact-option-item:hover {
          transform: scale(1.15) translateY(-2px);
          box-shadow: 0 6px 15px rgba(0,0,0,0.22);
        }

        .contact-option-tooltip {
          position: absolute;
          right: 60px;
          background-color: #1e293b;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          opacity: 0;
          transform: translateX(10px);
          transition: all 0.2s ease;
          pointer-events: none;
        }

        .contact-option-item:hover .contact-option-tooltip {
          opacity: 1;
          transform: translateX(0);
        }

        /* Ajustes adaptativos para móviles */
        @media (max-width: 640px) {
          .contact-bubble-container {
            bottom: 16px;
            right: 16px;
          }
          .contact-fab {
            width: 50px;
            height: 50px;
          }
          .contact-option-item {
            width: 42px;
            height: 42px;
          }
        }
      `}</style>
    </div>
  );
};
