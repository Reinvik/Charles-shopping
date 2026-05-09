import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Loader2, Search, Filter, 
  ShoppingBag, Calendar, Mail, 
  CheckCircle2, Clock, XCircle, AlertCircle,
  Users, Eye, Package, Printer, Phone, MapPin
} from 'lucide-react';
import { toast } from 'sonner';


interface Order {
  id: string;
  total: number;
  status: string;
  customer_email: string;
  items: any[];
  flow_token?: string;
  shipping_details?: {
    fullName: string;
    phone: string;
    address: string;
    comuna: string;
    reference: string;
  };
  created_at: string;
}

export const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error('Error al cargar pedidos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
            <CheckCircle2 size={14} /> Pagado
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">
            <Clock size={14} /> Pendiente
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-100">
            <XCircle size={14} /> Rechazado
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-700 rounded-full text-xs font-bold border border-slate-100">
            <AlertCircle size={14} /> {status}
          </span>
        );
    }
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por ID u email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 w-full md:w-auto shadow-sm">
          <Filter size={18} className="text-slate-400" />
          <select
            className="bg-transparent outline-none text-sm font-semibold w-full md:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="paid">Pagados</option>
            <option value="pending">Pendientes</option>
            <option value="rejected">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pedido</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                        <ShoppingBag size={16} />
                      </div>
                      <span className="font-bold text-sm text-slate-700">#{order.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-600 flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(order.created_at).toLocaleDateString('es-CL')}
                      </span>
                      <span className="text-[10px] text-slate-400 pl-5">
                        {new Date(order.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={14} className="text-slate-400" />
                      {order.customer_email || 'Anónimo'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    ${order.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package size={48} className="mb-4 opacity-20" />
                      <p className="font-medium text-lg">No se encontraron pedidos</p>
                      <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Detalles del Pedido</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">#{selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {/* Customer & Status Header */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Información del Cliente</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedOrder.customer_email}</p>
                  <p className="text-xs text-slate-500">{new Date(selectedOrder.created_at).toLocaleString('es-CL')}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado del Pago</p>
                  <div className="flex justify-end mt-1">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
              </div>

              {/* Shipping Information Section */}
              {selectedOrder.shipping_details && (
                <div className="mb-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={14} /> Información de Despacho
                    </h4>
                    <button 
                      onClick={() => {
                        const order = selectedOrder;
                        const printWindow = window.open('', '_blank');
                        if (!printWindow || !order.shipping_details) return;

                        const qrValue = `https://charlyhome.cl/orders/${order.id}`;
                        
                        const labelHtml = `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <style>
                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                                @page { size: 100mm 150mm; margin: 0; }
                                body { 
                                  font-family: 'Inter', sans-serif; 
                                  margin: 0; 
                                  padding: 5mm; 
                                  width: 90mm;
                                  color: #000;
                                }
                                .container {
                                  border: 1.5pt solid #000;
                                  height: 135mm;
                                  display: flex;
                                  flex-direction: column;
                                }
                                .header {
                                  padding: 4mm;
                                  border-bottom: 1pt solid #000;
                                  display: flex;
                                  justify-content: space-between;
                                  align-items: flex-start;
                                }
                                .store-info { font-size: 8pt; font-weight: 700; }
                                .order-id { font-size: 7pt; margin-top: 2pt; }
                                .flex-section {
                                  display: grid;
                                  grid-template-columns: 1fr 1fr;
                                  border-bottom: 1pt solid #000;
                                  text-align: center;
                                }
                                .flex-box {
                                  padding: 3mm;
                                  font-size: 18pt;
                                  font-weight: 900;
                                  border-right: 1pt solid #000;
                                }
                                .date-box {
                                  padding: 3mm;
                                  font-size: 14pt;
                                  font-weight: 700;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                }
                                .qr-section {
                                  flex: 1;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  padding: 5mm;
                                }
                                .commune-section {
                                  padding: 4mm;
                                  text-align: center;
                                  border-top: 1pt solid #000;
                                  border-bottom: 1pt solid #000;
                                }
                                .commune-name {
                                  font-size: 20pt;
                                  font-weight: 900;
                                  text-transform: uppercase;
                                }
                                .delivery-type {
                                  font-size: 12pt;
                                  font-weight: 700;
                                  text-align: center;
                                  padding: 2mm;
                                  border-bottom: 1pt solid #000;
                                }
                                .footer {
                                  padding: 4mm;
                                  font-size: 9pt;
                                }
                                .detail-row { margin-bottom: 3pt; }
                                .label { font-weight: 700; }
                              </style>
                            </head>
                            <body>
                              <div class="container">
                                <div class="header">
                                  <div>
                                    <div class="store-info">CHARLY HOME</div>
                                    <div class="order-id">Pedido: #${order.id.slice(0, 8)}</div>
                                  </div>
                                  <div style="font-size: 7pt; text-align: right;">
                                    Santiago, Chile<br>
                                    Venta: ${new Date(order.created_at).getTime()}
                                  </div>
                                </div>
                                <div class="flex-section">
                                  <div class="flex-box">FLEX</div>
                                  <div class="date-box">${new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }).toUpperCase()}</div>
                                </div>
                                <div class="qr-section">
                                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrValue}" width="120" height="120" />
                                </div>
                                <div class="commune-section">
                                  <div class="commune-name">${order.shipping_details.comuna}</div>
                                </div>
                                <div class="delivery-type">RESIDENCIAL</div>
                                <div class="footer">
                                  <div class="detail-row"><span class="label">Dirección:</span> ${order.shipping_details.address}</div>
                                  <div class="detail-row"><span class="label">Referencia:</span> ${order.shipping_details.reference || 'N/A'}</div>
                                  <div class="detail-row"><span class="label">Teléfono:</span> ${order.shipping_details.phone}</div>
                                  <div class="detail-row"><span class="label">Destinatario:</span> ${order.shipping_details.fullName}</div>
                                </div>
                              </div>
                              <script>
                                window.onload = () => {
                                  window.print();
                                  setTimeout(() => window.close(), 1000);
                                };
                              </script>
                            </body>
                          </html>
                        `;

                        printWindow.document.write(labelHtml);
                        printWindow.document.close();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                    >
                      <Printer size={14} /> Generar Etiqueta
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg text-blue-500 shadow-sm">
                        <Users size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Destinatario</p>
                        <p className="text-sm font-bold text-slate-800">{selectedOrder.shipping_details.fullName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={12} /> {selectedOrder.shipping_details.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg text-blue-500 shadow-sm">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Destino</p>
                        <p className="text-sm font-bold text-slate-800">{selectedOrder.shipping_details.address}</p>
                        <p className="text-xs text-slate-500">{selectedOrder.shipping_details.comuna}</p>
                        {selectedOrder.shipping_details.reference && (
                          <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">Ref: {selectedOrder.shipping_details.reference}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Productos del Pedido</p>
                <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100 space-y-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-50 shadow-sm">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ShoppingBag size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.quantity} unidad(es) x ${item.price.toLocaleString()}</p>
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        ${(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>${selectedOrder.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Envío</span>
                  <span className="text-green-600 font-bold">Gratis</span>
                </div>
                <div className="flex justify-between text-xl font-black text-slate-900 pt-2">
                  <span>Total</span>
                  <span>${selectedOrder.total.toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.flow_token && (
                <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} className="text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Referencia de Pago</span>
                  </div>
                  <p className="text-[10px] font-mono text-primary/70 break-all">{selectedOrder.flow_token}</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
