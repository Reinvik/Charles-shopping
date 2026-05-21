import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from './TenantContext';

interface ThemeSettings {
  primaryColor: string;
  borderRadius: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  siteName: string;
  siteDescription: string;
  announcementText: string;
  freeDeliveryThreshold: number;
  deliveryCost: number;
  googleMapsApiKey?: string;
  notificationPhone?: string;
  telegramToken?: string;
  telegramChatId?: string;
  defaultProductDescription: string;
}

interface ThemeContextType {
  settings: ThemeSettings;
  loading: boolean;
  refreshTheme: () => Promise<void>;
}

const defaultSettings: ThemeSettings = {
  primaryColor: '#E60000',
  borderRadius: '8',
  logoUrl: null,
  faviconUrl: null,
  siteName: 'Charly Home',
  siteDescription: 'Tu tienda de confianza para productos de aseo y papelería. Despachos rápidos y seguros a todo Santiago.',
  announcementText: 'DESPACHOS GRATIS POR COMPRAS SOBRE $30.000 EN SANTIAGO',
  freeDeliveryThreshold: 30000,
  deliveryCost: 3500,
  defaultProductDescription: 'Este producto te garantiza la mejor calidad para tus compras en Charly Home. Ideal para tu hogar o tu empresa, contamos con el mejor stock de la ciudad.'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const applyTheme = (theme: ThemeSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primaryColor);
    
    // Simple darkening logic for hover (approximate)
    // If it's a hex, we can just use the same for now or a CSS filter
    root.style.setProperty('--primary-hover', theme.primaryColor); 
    
    root.style.setProperty('--radius', `${theme.borderRadius}px`);
    root.style.setProperty('--radius-sm', `${Math.max(0, parseInt(theme.borderRadius) - 2)}px`);
    root.style.setProperty('--radius-lg', `${parseInt(theme.borderRadius) + 4}px`);

    // Update Favicon
    if (theme.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = theme.faviconUrl;
    }

    // Update Title
    if (theme.siteName) {
      document.title = theme.siteName;
    }
  };

  const { tenant } = useTenant();

  const fetchTheme = async () => {
    if (!tenant) return;
    
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'theme')
        .eq('tenant_id', tenant.id)
        .single();

      if (data && data.value) {
        const themeValue = data.value as ThemeSettings;
        const newSettings = { ...defaultSettings, ...themeValue };
        setSettings(newSettings);
        applyTheme(newSettings);
      }
    } catch (error) {
      console.error('Error fetching theme:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, [tenant]);

  return (
    <ThemeContext.Provider value={{ settings, loading, refreshTheme: fetchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
