import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  slug: string;
  display_name: string;
  custom_domain: string | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  setTenantById: (id: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setTenantById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('tenant_registry')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setTenant(data);
        localStorage.setItem('override_tenant_id', id);
      }
    } catch (err: any) {
      toast.error('Error al cambiar de tienda: ' + err.message);
    }
  };

  const resolveTenant = async () => {
    try {
      const hostname = window.location.hostname;
      const searchParams = new URLSearchParams(window.location.search);
      const storeParam = searchParams.get('store');
      const overrideId = localStorage.getItem('override_tenant_id');

      // Si hay un override manual (Super Admin), lo usamos
      if (overrideId) {
        const { data: overrideData } = await supabase
          .from('tenant_registry')
          .select('*')
          .eq('id', overrideId)
          .maybeSingle();
        
        if (overrideData) {
          setTenant(overrideData);
          setLoading(false);
          return;
        }
      }

      let query = supabase.from('tenant_registry').select('*');

      // 1. Prioridad: Parámetro de URL (útil para pruebas y dev)
      if (storeParam) {
        query = query.eq('slug', storeParam);
      } 
      // 2. Subdominio (ej: charlyhome.tiendasmart.cl o pasionporlosano.smartlean.cl)
      else if (hostname.endsWith('.tiendasmart.cl') || hostname.endsWith('.smartlean.cl') || hostname.endsWith('.vercel.app')) {
        const parts = hostname.split('.');
        const slug = parts[0];
        query = query.eq('slug', slug);
      }
      // 3. Dominio personalizado o Localhost
      else {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          query = query.eq('slug', 'charlyhome'); // Default para desarrollo
        } else if (hostname.endsWith('.charlyhome.cl')) {
          query = query.eq('slug', 'charlyhome');
        } else {
          query = query.eq('custom_domain', hostname);
        }

      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!data) {
        // Fallback a charlyhome
        const { data: fallbackData } = await supabase
          .from('tenant_registry')
          .select('*')
          .eq('slug', 'charlyhome')
          .single();
        
        if (fallbackData) {
          setTenant(fallbackData);
        } else {
          setError('Tienda no encontrada');
        }
      } else {
        setTenant(data);
      }
    } catch (err: any) {
      console.error('Error resolving tenant:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resolveTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, setTenantById }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
