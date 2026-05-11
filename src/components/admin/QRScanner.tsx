import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, XCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan }) => {
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (scanning) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          onScan(decodedText);
          setScanning(false);
          if (scanner) {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
          }
        },
        (_error) => {
          // Ignore scanning errors
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [scanning, onScan]);

  if (!scanning) {
    return (
      <button
        onClick={() => setScanning(true)}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.08)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '1rem',
          padding: '2rem 1.5rem',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          transition: 'all 0.2s',
          minHeight: '200px'
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
        }}
      >
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '1rem',
          background: 'rgba(59,130,246,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3b82f6'
        }}>
          <QrCode size={32} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>Escanear QR</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
            Escanea la etiqueta del pedido para ver detalles
          </p>
        </div>
      </button>
    );
  }

  return (
    <div style={{
      width: '100%',
      background: '#000',
      borderRadius: '1rem',
      overflow: 'hidden',
      position: 'relative',
      minHeight: '250px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div id="qr-reader" style={{ width: '100%' }}></div>
      <button
        onClick={() => setScanning(false)}
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: 'rgba(0,0,0,0.5)',
          border: 'none',
          borderRadius: '50%',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <XCircle size={20} />
      </button>
      <div style={{
        padding: '0.75rem',
        background: '#1e293b',
        color: '#94a3b8',
        fontSize: '0.7rem',
        fontWeight: 700,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Buscando código QR...
      </div>
    </div>
  );
};

export default QRScanner;
