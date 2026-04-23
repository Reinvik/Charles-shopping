import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ThemeSettings {
  primaryColor: string;
  borderRadius: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  siteName: string;
  announcementText: string;
  freeDeliveryThreshold: number;
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
  siteName: 'Charles Shopping',
  announcementText: 'DESPACHOS GRATIS POR COMPRAS SOBRE $30.000 EN SANTIAGO',
  freeDeliveryThreshold: 30000
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

  const fetchTheme = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'theme')
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
  }, []);

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
