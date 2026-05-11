import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QrCode, XCircle, Camera, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = "qr-reader-target";

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const startScanner = async () => {
    setError(null);
    try {
      const html5QrCode = new Html5Qrcode(qrRegionId);
      scannerRef.current = html5QrCode;

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: "environment" }, // Prefer back camera
        config,
        (decodedText) => {
          onScan(decodedText);
          setScanning(false);
          stopScanner();
        },
        (_errorMessage) => {
          // Scanning in progress...
        }
      );
    } catch (err: any) {
      console.error("Failed to start scanner:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
      setScanning(false);
    }
  };

  useEffect(() => {
    if (scanning) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [scanning]);

  if (!scanning) {
    return (
      <div style={{ width: '100%' }}>
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
        >
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '1.25rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(37,99,235,0.2)'
          }}>
            <Camera size={28} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>Abrir Cámara</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              Usa la cámara trasera para escanear
            </p>
          </div>
        </button>
        
        {error && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            background: 'rgba(239,68,68,0.1)', 
            border: '1px solid rgba(239,68,68,0.2)', 
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#f87171',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      background: '#000',
      borderRadius: '1.25rem',
      overflow: 'hidden',
      position: 'relative',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div id={qrRegionId} style={{ width: '100%', minHeight: '300px' }}></div>
      
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        right: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{ 
          background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(4px)',
          padding: '0.4rem 0.8rem', 
          borderRadius: '2rem', 
          color: '#fff', 
          fontSize: '0.65rem', 
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
          Escaneando...
        </div>
        
        <button
          onClick={() => setScanning(false)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          <XCircle size={20} />
        </button>
      </div>

      <div style={{
        padding: '1rem',
        background: 'rgba(15,23,42,0.95)',
        color: '#94a3b8',
        fontSize: '0.7rem',
        fontWeight: 600,
        textAlign: 'center',
        lineHeight: 1.4
      }}>
        Enfoca el código QR de la etiqueta dentro del recuadro
      </div>

      <style>{`
        #qr-reader-target video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
