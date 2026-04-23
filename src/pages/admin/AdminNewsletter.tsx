import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

export const AdminNewsletter = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (err: any) {
      toast.error('Error al cargar suscriptores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este suscriptor?')) return;
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Suscriptor eliminado');
      fetchSubscribers();
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  const exportCSV = () => {
    const csvRows = [];
    csvRows.push(['ID', 'Email', 'Fecha de Registro'].join(','));
    subscribers.forEach(sub => {
      csvRows.push([
        sub.id,
        sub.email,
        new Date(sub.created_at).toLocaleString('es-CL')
      ].join(','));
    });
    
    const csvData = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvData);
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `suscriptores_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Suscriptores del Newsletter</h1>
          <p className="admin-subtitle">Gestiona las personas que reciben tus correos</p>
        </div>
        <button className="btn-primary" onClick={exportCSV} disabled={subscribers.length === 0} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      <div className="admin-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : subscribers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Mail size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>Aún no hay suscriptores.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Fecha de Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} className="text-slate-400" />
                        <span style={{ fontWeight: '500' }}>{sub.email}</span>
                      </div>
                    </td>
                    <td>{new Date(sub.created_at).toLocaleString('es-CL', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn delete" 
                          title="Eliminar"
                          onClick={() => handleDelete(sub.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
