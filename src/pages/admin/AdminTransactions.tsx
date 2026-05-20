import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, 
  Filter, 
  RotateCw, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  ChevronRight, 
  Eye, 
  Building,
  CreditCard,
  Calendar,
  Mail,
  DollarSign,
  Loader2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  created_at: string;
  total: number;
  status: 'paid' | 'pending' | 'rejected';
  customer_email: string;
  flow_token: string | null;
  items: any[];
  shipping_details: any;
  tenant_id: string;
  payment_details: any | null;
  tenant?: {
    display_name: string;
    slug: string;
  } | null;
}

interface TenantOption {
  id: string;
  display_name: string;
}

export const AdminTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Tenants for dropdown
      const { data: tenantData, error: tenantErr } = await supabase
        .from('tenant_registry')
        .select('id, display_name');
      if (tenantErr) throw tenantErr;
      setTenants(tenantData || []);

      // Fetch all orders with tenant info
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*, tenant:tenant_registry(display_name, slug)')
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;
      setTransactions((ordersData as any) || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      toast.error('Error al cargar transacciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncStatus = async (orderId: string) => {
    setSyncingId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke('flow-check-status', {
        body: { orderId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Estado sincronizado correctamente con Flow');
      
      // Update local state
      if (data?.order) {
        setTransactions(prev => 
          prev.map(tx => tx.id === orderId ? { ...tx, ...data.order } : tx)
        );
        if (selectedTx && selectedTx.id === orderId) {
          setSelectedTx({ ...selectedTx, ...data.order });
        }
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      toast.error('Error al sincronizar con Flow: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  // Filtered transactions
  const filteredTxs = transactions.filter(tx => {
    const matchesSearch = 
      tx.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.flow_token?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesTenant = tenantFilter === 'all' || tx.tenant_id === tenantFilter;

    return matchesSearch && matchesStatus && matchesTenant;
  });

  // Stats calculators
  const stats = {
    totalSales: filteredTxs
      .filter(tx => tx.status === 'paid')
      .reduce((sum, tx) => sum + tx.total, 0),
    paidCount: filteredTxs.filter(tx => tx.status === 'paid').length,
    pendingCount: filteredTxs.filter(tx => tx.status === 'pending').length,
    rejectedCount: filteredTxs.filter(tx => tx.status === 'rejected').length,
    totalCount: filteredTxs.length,
    conversionRate: filteredTxs.length > 0 
      ? Math.round((filteredTxs.filter(tx => tx.status === 'paid').length / filteredTxs.length) * 100) 
      : 0
  };

  const getStatusBadge = (status: 'paid' | 'pending' | 'rejected') => {
    switch (status) {
      case 'paid':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', 
            borderRadius: '20px', backgroundColor: '#ecfdf5', color: '#059669', fontSize: '12px', fontWeight: '700' 
          }}>
            <CheckCircle size={14} /> Exitosa
          </span>
        );
      case 'rejected':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', 
            borderRadius: '20px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: '700' 
          }}>
            <XCircle size={14} /> Rechazada
          </span>
        );
      case 'pending':
      default:
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', 
            borderRadius: '20px', backgroundColor: '#fffbeb', color: '#d97706', fontSize: '12px', fontWeight: '700' 
          }}>
            <HelpCircle size={14} /> No Concretada
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '0px' }}>
      {/* Header Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Transacciones de Pago</h2>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '4px 0 0' }}>Monitorea y audita los pagos e intentos realizados por Flow.</p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px',
            border: '1.5px solid #eee', background: 'white', color: '#333', fontWeight: '600', cursor: 'pointer'
          }}
        >
          <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '12px', backgroundColor: '#eef2ff', color: '#4f46e5', borderRadius: '14px' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>Ingresos Totales (Exitosos)</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>${stats.totalSales.toLocaleString('es-CL')}</h3>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '14px' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>Pagos Exitosos</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>{stats.paidCount}</h3>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '12px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '14px' }}>
            <HelpCircle size={24} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>No Concretados</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>{stats.pendingCount}</h3>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '14px' }}>
            <XCircle size={24} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>Rechazados</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>{stats.rejectedCount}</h3>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '12px', backgroundColor: '#faf5ff', color: '#9333ea', borderRadius: '14px' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>Conversión</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>{stats.conversionRate}%</h3>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ 
        background: 'white', padding: '1.25rem', borderRadius: '20px', border: '1px solid #f0f0f0', 
        display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' 
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por correo de cliente, token de Flow o ID..."
            style={{ 
              width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px', 
              border: '1.5px solid #eee', outline: 'none', fontSize: '14px' 
            }}
          />
        </div>

        {/* Store selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={16} style={{ color: '#64748b' }} />
          <select 
            value={tenantFilter}
            onChange={e => setTenantFilter(e.target.value)}
            style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #eee', fontSize: '14px', outline: 'none' }}
          >
            <option value="all">Todas las Tiendas</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.display_name}</option>
            ))}
          </select>
        </div>

        {/* Status selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: '#64748b' }} />
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #eee', fontSize: '14px', outline: 'none' }}
          >
            <option value="all">Todos los Estados</option>
            <option value="paid">Exitosas</option>
            <option value="pending">No Concretadas (Pendientes)</option>
            <option value="rejected">Rechazadas</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto', color: '#E60000' }} />
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #f0f0f0', backgroundColor: '#fafafa' }}>
                  <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Tienda</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Cliente / Pedido</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Monto</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Fecha</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Código Flow (Token)</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Medio</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Estado</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.length > 0 ? (
                  filteredTxs.map(tx => {
                    const payMedia = tx.payment_details?.paymentData?.media || '-';
                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background-color 0.2s' }} className="hover-row">
                        <td style={{ padding: '16px 20px', fontWeight: '700', color: '#1e293b' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building size={14} style={{ color: '#94a3b8' }} />
                            {tx.tenant?.display_name || tx.tenant_id.substring(0,8)}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: '600', color: '#334155' }}>{tx.customer_email}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: #{tx.id.substring(0, 8)}...</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: '800', color: 'var(--primary)' }}>
                          ${tx.total.toLocaleString('es-CL')}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: '#64748b' }}>
                          {new Date(tx.created_at).toLocaleString('es-CL', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <code style={{ 
                            fontSize: '11px', background: '#f1f5f9', padding: '3px 8px', 
                            borderRadius: '6px', color: '#475569', wordBreak: 'break-all' 
                          }}>
                            {tx.flow_token ? tx.flow_token.substring(0, 16) + '...' : 'Sin Token'}
                          </code>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                          {payMedia}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {getStatusBadge(tx.status)}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {tx.status === 'pending' && (
                              <button 
                                onClick={() => handleSyncStatus(tx.id)}
                                disabled={syncingId === tx.id}
                                title="Sincronizar estado con Flow"
                                style={{ 
                                  background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', 
                                  padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' 
                                }}
                              >
                                <RotateCw size={16} className={syncingId === tx.id ? 'animate-spin' : ''} />
                              </button>
                            )}
                            <button 
                              onClick={() => setSelectedTx(tx)}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: 'none',
                                padding: '6px 12px', borderRadius: '8px', color: '#475569', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                              }}
                            >
                              <Eye size={14} /> Detalle
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron transacciones con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedTx && (
        <div style={{ 
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ 
            background: 'white', borderRadius: '24px', width: '100%', maxWidth: '750px', 
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' 
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800' }}>Detalle de Transacción</h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>ID Orden: {selectedTx.id}</span>
              </div>
              <button 
                onClick={() => setSelectedTx(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Left Column: Client & Order Details */}
              <div>
                <h4 style={{ margin: '0 0 1rem', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>Información del Pedido</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Mail size={16} style={{ color: '#94a3b8' }} />
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Correo Cliente</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{selectedTx.customer_email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Calendar size={16} style={{ color: '#94a3b8' }} />
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Fecha Intento</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(selectedTx.created_at).toLocaleString('es-CL')}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Building size={16} style={{ color: '#94a3b8' }} />
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tienda Origen</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{selectedTx.tenant?.display_name}</div>
                    </div>
                  </div>
                </div>

                <h4 style={{ margin: '2rem 0 1rem', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>Productos</h4>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '10px' }}>
                  {selectedTx.items?.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < selectedTx.items.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                      <div style={{ fontSize: '13px', color: '#334155' }}>
                        {item.name} <span style={{ color: '#94a3b8', fontSize: '11px' }}>x{item.quantity}</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700' }}>
                        ${((item.price || 0) * (item.quantity || 1)).toLocaleString('es-CL')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Flow Technical Details */}
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '2rem' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>Auditoría de Pasarela (Flow)</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Estado de Pago</span>
                    <div style={{ marginTop: '4px' }}>{getStatusBadge(selectedTx.status)}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Flow Token (Consultar en el Portal)</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                      <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', color: '#475569', userSelect: 'all' }}>
                        {selectedTx.flow_token || 'Sin Token'}
                      </code>
                    </div>
                  </div>

                  {selectedTx.payment_details ? (
                    <>
                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>ID Transacción Flow</span>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                          {selectedTx.payment_details.flowOrder || '-'}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Medio / Proveedor</span>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                          {selectedTx.payment_details.paymentData?.media || '-'} ({selectedTx.payment_details.paymentData?.provider || '-'})
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Tipo Tarjeta / Detalles</span>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                          {selectedTx.payment_details.paymentData?.cardType || '-'} {selectedTx.payment_details.paymentData?.last4Card ? `**** ${selectedTx.payment_details.paymentData.last4Card}` : ''}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Fecha Acreditación Flow</span>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                          {selectedTx.payment_details.paymentData?.date || '-'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '12px', background: '#fafafa', borderRadius: '12px', color: '#64748b', fontSize: '13px' }}>
                      No hay detalles de pago almacenados.
                      {selectedTx.status === 'pending' && (
                        <div style={{ marginTop: '8px' }}>
                          Puedes intentar sincronizar el estado para verificar si el pago fue concretado tardíamente.
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTx.status === 'rejected' && (
                    <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2', color: '#dc2626', fontSize: '13px' }}>
                      <strong>Motivo de falla/no concreción:</strong>
                      <div style={{ marginTop: '4px' }}>
                        {selectedTx.payment_details?.pending_info?.message || 
                         'El cliente canceló la transacción o la tarjeta fue rechazada por la pasarela.'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#fafafa', borderRadius: '0 0 24px 24px' }}>
              {selectedTx.status === 'pending' && (
                <button 
                  onClick={() => handleSyncStatus(selectedTx.id)}
                  disabled={syncingId === selectedTx.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px',
                    backgroundColor: '#6366f1', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  <RotateCw size={16} className={syncingId === selectedTx.id ? 'animate-spin' : ''} />
                  Sincronizar con Flow
                </button>
              )}
              <button 
                onClick={() => setSelectedTx(null)}
                style={{
                  padding: '10px 20px', borderRadius: '12px', border: '1.5px solid #eee', background: 'white',
                  color: '#475569', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled custom classes for hover row effect */}
      <style>{`
        .hover-row:hover {
          background-color: #f8fafc !important;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
