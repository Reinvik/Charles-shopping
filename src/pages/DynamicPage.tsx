import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';

export const DynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<any>(null);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('store_pages')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Not found
            setPage(null);
          } else {
            console.error('Error fetching page:', error);
          }
        } else if (data) {
          setPage(data);
          setTitle(data.title || '');
          setContent(data.content || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchPage();
  }, [slug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const pageData = {
        slug,
        title,
        content
      };

      if (page) {
        // Update
        const { error } = await supabase
          .from('store_pages')
          .update(pageData)
          .eq('id', page.id);
        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('store_pages')
          .insert([pageData])
          .select()
          .single();
        if (error) throw error;
        setPage(data);
      }
      
      toast.success('Página guardada correctamente');
      setIsEditing(false);
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      
      <main className="container" style={{ padding: '40px 20px', minHeight: '60vh', maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            fontWeight: '600',
            color: '#333',
            marginBottom: '30px'
          }}
        >
          <ArrowLeft size={20} />
          Volver a la tienda
        </button>

        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button 
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                  setTitle(page?.title || '');
                  setContent(page?.content || '');
                } else {
                  setIsEditing(true);
                  if (!page) {
                    setTitle(slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '');
                    setContent('Escribe aquí el contenido de la página...');
                  }
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                backgroundColor: isEditing ? '#f3f4f6' : '#fff', border: '1px solid #e5e7eb',
                cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s'
              }}
            >
              {isEditing ? <><X size={16} /> Cancelar</> : <><Pencil size={16} className="text-primary" /> Editar Página</>}
            </button>
            
            {isEditing && (
              <button 
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                  backgroundColor: 'var(--primary)', color: '#fff', border: 'none', marginLeft: '10px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar
              </button>
            )}
          </div>
        )}

        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la página"
              style={{ fontSize: '32px', fontWeight: '800', width: '100%', padding: '10px', border: '2px solid var(--primary)', borderRadius: '8px', outline: 'none' }}
            />
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenido..."
              style={{ minHeight: '400px', width: '100%', padding: '20px', fontSize: '16px', lineHeight: '1.6', border: '2px solid var(--primary)', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        ) : (
          <div>
            {!page ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '16px' }}>Página no encontrada</h1>
                <p style={{ color: '#666' }}>Esta página aún no tiene contenido.</p>
                {isAdmin && (
                  <p style={{ marginTop: '20px', color: 'var(--primary)', fontWeight: 'bold' }}>
                    ¡Eres administrador! Haz clic en "Editar Página" para crearla.
                  </p>
                )}
              </div>
            ) : (
              <>
                <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '30px', color: '#1a1a1a' }}>{page.title}</h1>
                <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#4b5563', whiteSpace: 'pre-wrap' }}>
                  {page.content}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
