import { useState, useEffect } from 'react';

// Caché global para evitar procesar la misma imagen múltiples veces
const cropCache: { [url: string]: string } = {};

export const useCroppedImage = (imageUrl: string) => {
  const [croppedUrl, setCroppedUrl] = useState<string>(cropCache[imageUrl] || imageUrl);

  useEffect(() => {
    if (!imageUrl) {
      setCroppedUrl('');
      return;
    }

    // Si ya está en caché, usarla inmediatamente
    if (cropCache[imageUrl]) {
      setCroppedUrl(cropCache[imageUrl]);
      return;
    }

    // Si es un data URL, placeholder o logo, no procesar
    if (imageUrl.startsWith('data:') || imageUrl.includes('placeholder') || imageUrl.includes('logo') || imageUrl.includes('assets/')) {
      setCroppedUrl(imageUrl);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Necesario para evitar problemas de CORS al leer pixeles en canvas

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (isMounted) setCroppedUrl(imageUrl);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Comprueba si un píxel es negro, muy oscuro o transparente
        const isBlackOrTransparent = (r: number, g: number, b: number, a: number) => {
          if (a < 15) return true; // transparente
          return r <= 20 && g <= 20 && b <= 20; // negro o gris muy oscuro
        };

        let topCut = 0;
        let bottomCut = canvas.height - 1;
        let leftCut = 0;
        let rightCut = canvas.width - 1;

        // 1. Escanear de arriba hacia abajo para encontrar la primera fila no negra
        for (let y = 0; y < canvas.height; y++) {
          let rowIsBlack = true;
          // Muestrear cada 4 píxeles para optimizar rendimiento
          for (let x = 0; x < canvas.width; x += 4) {
            const idx = (y * canvas.width + x) * 4;
            if (!isBlackOrTransparent(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
              rowIsBlack = false;
              break;
            }
          }
          if (!rowIsBlack) {
            topCut = y;
            break;
          }
        }

        // 2. Escanear de abajo hacia arriba para encontrar la última fila no negra
        for (let y = canvas.height - 1; y >= 0; y--) {
          let rowIsBlack = true;
          for (let x = 0; x < canvas.width; x += 4) {
            const idx = (y * canvas.width + x) * 4;
            if (!isBlackOrTransparent(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
              rowIsBlack = false;
              break;
            }
          }
          if (!rowIsBlack) {
            bottomCut = y;
            break;
          }
        }

        // 3. Escanear de izquierda a derecha para encontrar la primera columna no negra
        for (let x = 0; x < canvas.width; x++) {
          let colIsBlack = true;
          for (let y = 0; y < canvas.height; y += 4) {
            const idx = (y * canvas.width + x) * 4;
            if (!isBlackOrTransparent(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
              colIsBlack = false;
              break;
            }
          }
          if (!colIsBlack) {
            leftCut = x;
            break;
          }
        }

        // 4. Escanear de derecha a izquierda para encontrar la última columna no negra
        for (let x = canvas.width - 1; x >= 0; x--) {
          let colIsBlack = true;
          for (let y = 0; y < canvas.height; y += 4) {
            const idx = (y * canvas.width + x) * 4;
            if (!isBlackOrTransparent(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
              colIsBlack = false;
              break;
            }
          }
          if (!colIsBlack) {
            rightCut = x;
            break;
          }
        }

        const croppedHeight = bottomCut - topCut + 1;
        const croppedWidth = rightCut - leftCut + 1;

        // Solo recortar si los cortes son significativos y no destruyen la imagen completa
        if (
          (topCut > 0 || bottomCut < canvas.height - 1 || leftCut > 0 || rightCut < canvas.width - 1) &&
          croppedHeight > canvas.height * 0.1 &&
          croppedWidth > canvas.width * 0.1
        ) {
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = croppedWidth;
          cropCanvas.height = croppedHeight;
          const cropCtx = cropCanvas.getContext('2d');
          if (cropCtx) {
            cropCtx.drawImage(
              img,
              leftCut, topCut, croppedWidth, croppedHeight,
              0, 0, croppedWidth, croppedHeight
            );
            // Comprimir como JPEG para mejorar peso
            const dataUrl = cropCanvas.toDataURL('image/jpeg', 0.9);
            cropCache[imageUrl] = dataUrl;
            if (isMounted) {
              setCroppedUrl(dataUrl);
            }
            return;
          }
        }
      } catch (e) {
        // En caso de error de CORS o similar, fallamos de manera silenciosa
        console.warn('Error al recortar los bordes negros de la imagen:', e);
      }

      // Si no se requirió corte o hubo un error, usar la imagen original
      cropCache[imageUrl] = imageUrl;
      if (isMounted) {
        setCroppedUrl(imageUrl);
      }
    };

    img.onerror = () => {
      cropCache[imageUrl] = imageUrl;
      if (isMounted) {
        setCroppedUrl(imageUrl);
      }
    };

    img.src = imageUrl;

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return croppedUrl;
};
