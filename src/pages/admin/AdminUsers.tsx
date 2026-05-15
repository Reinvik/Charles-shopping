import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  UserPlus, 
  Loader2, 
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  tenant_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Tenant {
  id: string;
  display_name: string;
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'admin',
    tenant_id: '',
    password: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, tenantsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('tenant_registry').select('id, display_name')
    ]);

    if (profilesRes.error) toast.error('Error al cargar usuarios');
    else setUsers(profilesRes.data || []);

    if (tenantsRes.error) toast.error('Error al cargar tiendas');
    else setTenants(tenantsRes.data || []);

    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return toast.error('El email es obligatorio');
    if (!formData.password) return toast.error('La contraseña es obligatoria');

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          tenant_id: formData.tenant_id || null
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Usuario creado correctamente. Ya puede iniciar sesión.');
      setIsAdding(false);
      setFormData({ email: '', full_name: '', role: 'admin', tenant_id: '', password: '' });
      fetchData();
    } catch (err: any) {
      toast.error('Error al crear usuario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (userId: string, updates: Partial<Profile>) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) toast.error('Error al actualizar: ' + error.message);
    else {
      toast.success('Usuario actualizado');
      fetchData();
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el acceso de ${email}?`)) return;
    
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) toast.error('Error al eliminar: ' + error.message);
    else {
      toast.success('Usuario eliminado');
      fetchData();
    }
  };

  return (
    <div className="admin-users">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Gestión de Usuarios</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Controla el acceso y roles de los administradores de tienda.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', background: '#E60000', 
            color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' 
          }}
        >
          <UserPlus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {isAdding && (
        <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '2rem', border: '1px solid #f0f0f0' }}>
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '800' }}>Registrar Nuevo Administrador</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Email</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="correo@ejemplo.com"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #eee' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Contraseña</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder="********"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #eee' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Nombre Completo</label>
              <input 
                type="text" 
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                placeholder="Nombre del admin"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #eee' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Rol</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #eee' }}
              >
                <option value="admin">Admin Tienda</option>
                <option value="user">Usuario</option>
                <option value="superuser">Super Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Tienda Asignada</label>
              <select 
                value={formData.tenant_id}
                onChange={e => setFormData({...formData, tenant_id: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #eee' }}
              >
                <option value="">Acceso Global / Ninguna</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.display_name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>Crear</button>
              <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #eee', background: 'none' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto' }} size={40} />
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f0f0f0' }}>
                <th style={{ textAlign: 'left', padding: '1.25rem', fontSize: '12px', fontWeight: '800', color: '#64748b' }}>USUARIO</th>
                <th style={{ textAlign: 'left', padding: '1.25rem', fontSize: '12px', fontWeight: '800', color: '#64748b' }}>ROL</th>
                <th style={{ textAlign: 'left', padding: '1.25rem', fontSize: '12px', fontWeight: '800', color: '#64748b' }}>TIENDA ASIGNADA</th>
                <th style={{ textAlign: 'left', padding: '1.25rem', fontSize: '12px', fontWeight: '800', color: '#64748b' }}>ESTADO</th>
                <th style={{ textAlign: 'center', padding: '1.25rem', fontSize: '12px', fontWeight: '800', color: '#64748b' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: '800' }}>
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{user.full_name || 'Sin nombre'}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <select 
                      value={user.role}
                      onChange={(e) => handleUpdate(user.id, { role: e.target.value })}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #eee', fontSize: '12px', fontWeight: '600' }}
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Admin Tienda</option>
                      <option value="superuser">Super Admin</option>
                    </select>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <select 
                      value={user.tenant_id || ''}
                      onChange={(e) => handleUpdate(user.id, { tenant_id: e.target.value || null })}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #eee', fontSize: '12px', fontWeight: '600', maxWidth: '200px' }}
                    >
                      <option value="">Acceso Global / Ninguna</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.display_name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <button 
                      onClick={() => handleUpdate(user.id, { is_active: !user.is_active })}
                      style={{ 
                        background: user.is_active ? '#ecfdf5' : '#fef2f2', 
                        color: user.is_active ? '#059669' : '#dc2626',
                        border: 'none', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                      }}
                    >
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDelete(user.id, user.email)}
                      style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
