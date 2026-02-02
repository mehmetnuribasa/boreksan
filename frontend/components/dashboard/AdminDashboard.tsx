import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from "@/lib/axios";

// Types based on backend DTOs
interface OrderItemResponse {
    productName: string;
    quantity: number;
    unitPrice: number;
    subTotal: number;
}

interface OrderResponse {
    id: number;
    customerName: string; // username
    shopName: string;
    address: string;
    phone: string;
    totalPrice: number;
    status: 'WAITING' | 'PREPARING' | 'ON_WAY' | 'DELIVERED' | 'CANCELLED';
    createdAt: string; // ISO string
    items: OrderItemResponse[];
}

const AdminDashboard = () => {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
    const [activeTab, setActiveTab] = useState('daily_orders');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.clear(); // Clear all auth data
        router.push('/login');
    };

    // Mock Stats (These could also be fetched from an endpoint later)
    const stats = [
        { label: "Günlük Sipariş", value: "142", trend: "Düne göre +12%", icon: "🛍️", color: "bg-blue-100 text-blue-600" },
        { label: "Toplam Satılan Tepsi", value: "1,050", trend: "Düne göre +5%", icon: "🥐", color: "bg-orange-100 text-orange-600" },
        { label: "Bekleyen Sipariş", value: "12", sub: "İlgi bekliyor", icon: "🕒", color: "bg-yellow-100 text-yellow-600" },
    ];

    const STATUS_OPTIONS = [ 
        { value: 'WAITING', label: 'BEKLİYOR' },
        { value: 'PREPARING', label: 'HAZIRLANIYOR' },
        { value: 'ON_WAY', label: 'YOLDA' },
        { value: 'DELIVERED', label: 'TESLİM EDİLDİ' },
        { value: 'CANCELLED', label: 'İPTAL' },
    ];

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get<OrderResponse[]>('/orders');
            setOrders(response.data);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const closeModal = () => setSelectedOrder(null);

    const updateOrderStatus = async (orderId: number, newStatus: string) => {
        try {
            // Update status
            await api.put(`/orders/${orderId}/status`, null, {
                params: { newStatus } 
            });
            
            // Refresh main list
            await fetchOrders();
            
            // Update selected order view if needed
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
            }
        } catch (error) {
            console.error("Failed to update order status:", error);
            alert("Durum güncellenemedi!");
        }
    };

    const handleApprove = (orderId: number) => {
        updateOrderStatus(orderId, 'PREPARING');
    };

    // Helper to calculate total trays
    const calculateTrays = (items: OrderItemResponse[]) => {
        return items.reduce((acc, item) => acc + item.quantity, 0);
    };

    // Helper to format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    // Helper for status colors
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'WAITING': return 'bg-orange-100 text-orange-700';
            case 'PREPARING': return 'bg-blue-100 text-blue-700';
            case 'ON_WAY': return 'bg-purple-100 text-purple-700';
            case 'DELIVERED': return 'bg-green-100 text-green-700';
            case 'CANCELLED': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Filter orders based on active tab
    const filteredOrders = orders.filter(order => {
        if (activeTab === 'daily_orders') {
            const orderDate = new Date(order.createdAt);
            const today = new Date();
            return orderDate.getDate() === today.getDate() &&
                   orderDate.getMonth() === today.getMonth() &&
                   orderDate.getFullYear() === today.getFullYear();
        }
        return true; // show all for history
    });

    const sidebarItems = [
        { id: 'daily_orders', label: 'Günlük Siparişler', icon: '📅' },
        { id: 'order_history', label: 'Sipariş Geçmişi', icon: '📂' },
        { id: 'products', label: 'Ürünler', icon: '📦' },
        { id: 'users', label: 'Kullanıcılar', icon: '👥' },
        { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-100 hidden md:flex flex-col shadow-lg z-10">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 text-2xl font-extrabold text-gray-900 tracking-tight">
                        <span className="text-orange-600 bg-orange-100 p-2 rounded-xl">🔶</span>
                        <span>Böreksan</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-400 mt-2 ml-1 tracking-wider uppercase">YÖNETİCİ PANELİ</p>
                </div>
                <nav className="flex-1 mt-6 px-4 space-y-1">
                    {sidebarItems.map((item) => (
                        <button 
                             key={item.id} 
                             onClick={() => setActiveTab(item.id)}
                             className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200 group relative overflow-hidden ${activeTab === item.id ? 'bg-orange-600 text-white shadow-md shadow-orange-200' : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'}`}>
                            
                            {activeTab === item.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-800 opacity-20"></div>
                            )}

                            <span className={`text-xl transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                            <span className="font-semibold tracking-wide">{item.label}</span>
                            
                            {activeTab === item.id && (
                                <span className="ml-auto text-white opacity-60">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="p-6 border-t border-gray-100 relative">
                    {/* User Menu Popup */}
                    {isUserMenuOpen && (
                        <div className="absolute bottom-full left-6 right-6 mb-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-2 z-20">
                            <div className="py-1">
                                <button 
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 font-bold flex items-center gap-3 transition-colors text-sm"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    Çıkış Yap
                                </button>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isUserMenuOpen ? 'bg-white border-orange-200 shadow-md ring-2 ring-orange-100' : 'bg-gray-50 border-gray-100 hover:bg-white hover:shadow-md'}`}
                    >
                        <div className="h-10 w-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                            AU
                        </div>
                        <div className="text-left flex-1">
                            <p className="text-sm font-bold text-gray-800">Admin User</p>
                            <p className="text-xs text-gray-500 font-medium">Süper Admin</p>
                        </div>
                        <div className="text-gray-400">
                            <svg className={`w-5 h-5 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </div>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 px-8 py-5 flex justify-between items-center shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {activeTab === 'daily_orders' ? 'Bugünün Özeti' : 
                             activeTab === 'order_history' ? 'Sipariş Geçmişi' : 'Kontrol Paneli'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 font-medium">Hoşgeldin, sistem durumu aktif.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-all relative">
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            🔔
                        </button>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto space-y-8">
                    {/* Stats Grid */}
                    {activeTab === 'daily_orders' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {stats.map((stat, index) => (
                                <div key={index} className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">{stat.label}</p>
                                            <h3 className="text-3xl font-extrabold text-gray-900 mt-3 tracking-tight">{stat.value}</h3>
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {stat.trend ? '↗' : 'ℹ'} {stat.trend || stat.sub}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`p-4 rounded-xl ${stat.color} bg-opacity-20 group-hover:scale-110 transition-transform duration-300`}>
                                            <span className="text-3xl">{stat.icon}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Incoming Orders */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                    📄
                                </div>
                                <h2 className="text-lg font-bold text-gray-800">
                                    {activeTab === 'daily_orders' ? 'Gelen Siparişler' : 
                                     activeTab === 'order_history' ? 'Tüm Kayıtlar' : 'Liste'}
                                </h2>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                    <input 
                                        type="text" 
                                        placeholder="Sipariş, müşteri veya ürün ara..." 
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-100 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                                <button className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 border border-transparent hover:border-gray-200">
                                    <span>⚙️</span> Filtrele
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50/50 text-xs w-full uppercase font-bold text-gray-400 tracking-wider">
                                    <tr className="border-b border-gray-100">
                                        <th className="px-6 py-5">Sipariş</th>
                                        <th className="px-6 py-5">Müşteri</th>
                                        <th className="px-6 py-5">Zaman</th>
                                        <th className="px-6 py-5">İçerik</th>
                                        <th className="px-6 py-5">Tutar</th>
                                        <th className="px-6 py-5">Durum</th>
                                        <th className="px-6 py-5 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                                                    <span className="text-gray-400 font-medium animate-pulse">Veriler yükleniyor...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {!loading && filteredOrders.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-16">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-4xl mb-4 opacity-50">📭</span>
                                                    <h3 className="text-lg font-bold text-gray-700">Kayıt Bulunamadı</h3>
                                                    <p className="text-gray-400 text-sm mt-1">
                                                        {activeTab === 'daily_orders' ? 'Bugün için henüz sipariş girişi yapılmamış.' : 'Geçmişe ait sipariş kaydı yok.'}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {!loading && filteredOrders.map((order) => (
                                        <tr 
                                            key={order.id} 
                                            onClick={() => setSelectedOrder(order)}
                                            className="group hover:bg-orange-50/50 transition-all duration-200 cursor-pointer border-b border-gray-50 last:border-b-0 hover:shadow-sm"
                                        >
                                            <td className="px-6 py-5 font-bold text-gray-800">
                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">#{order.id}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                        {(order.shopName?.[0] || order.customerName?.[0] || "?").toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-sm">{order.shopName || "Bireysel Müşteri"}</p>
                                                        <p className="text-xs text-gray-500 font-medium">{order.customerName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col text-xs font-semibold text-gray-500">
                                                    <span className="text-gray-800">{formatDate(order.createdAt)}</span>
                                                    <span className="text-[10px] opacity-70">
                                                        {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    {order.items.slice(0, 2).map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                                                            <span className="bg-white border border-gray-200 px-1.5 rounded font-bold text-orange-600 shadow-sm">{item.quantity}x</span>
                                                            <span className="truncate max-w-[120px]" title={item.productName}>{item.productName}</span>
                                                        </div>
                                                    ))}
                                                    {order.items.length > 2 && (
                                                        <span className="text-[10px] text-gray-400 font-bold pl-1">+{order.items.length - 2} diğer ürün</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="font-extrabold text-gray-900 bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                                                    {order.totalPrice} ₺
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold tracking-wide uppercase ${getStatusColor(order.status)}`}>
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></span>
                                                    {order.status === 'WAITING' ? 'BEKLİYOR' : 
                                                     order.status === 'PREPARING' ? 'HAZIRLANIYOR' : 
                                                     order.status === 'ON_WAY' ? 'YOLDA' : 
                                                     order.status === 'DELIVERED' ? 'TESLİM' : 
                                                     order.status === 'CANCELLED' ? 'İPTAL' : order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {order.status === 'WAITING' ? (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApprove(order.id);
                                                        }}
                                                        className="group/btn relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300 transition-all transform hover:-translate-y-0.5"
                                                    >
                                                        <span className="relative z-10 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                            ONAYLA
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOrder(order);
                                                        }}
                                                        className="text-gray-400 hover:text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-all font-bold text-xs flex items-center gap-1 ml-auto"
                                                    >
                                                        <span>DETAY</span>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-2xl">
                                    📦
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Sipariş #{selectedOrder.id}</h2>
                                    <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                                        <span>🕒 {formatDate(selectedOrder.createdAt)}</span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span>{new Date(selectedOrder.createdAt).toLocaleDateString('tr-TR')}</span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={closeModal} 
                                className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                            <div className="flex flex-col gap-8">
                                
                                {/* Top: Customer Info (Horizontal) */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                    </div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">Müşteri Bilgileri</h3>
                                        <div className="h-px bg-gray-100 flex-1"></div>
                                    </div>
                                    
                                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 mb-1 block">Fırın / Müşteri</label>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                    {(selectedOrder.shopName?.[0] || selectedOrder.customerName?.[0] || "?").toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-lg leading-tight">{selectedOrder.shopName || selectedOrder.customerName}</p>
                                                    {selectedOrder.shopName && <p className="text-xs text-gray-500 font-medium">{selectedOrder.customerName}</p>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 mb-2 block">İletişim</label>
                                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <div className="h-8 w-8 bg-white text-green-600 rounded-lg shadow-sm flex items-center justify-center text-sm">
                                                    📞
                                                </div>
                                                <p className="font-bold text-gray-800 font-mono tracking-tight">{selectedOrder.phone}</p>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 mb-2 block">Teslimat Adresi</label>
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                                                    📍
                                                </div>
                                                <p className="font-bold text-gray-800 text-sm leading-relaxed">{selectedOrder.address}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    
                                    {/* Left: Items (2 cols) */}
                                    <div className="lg:col-span-2">
                                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
                                            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                                    <span>🛒</span> Sipariş İçeriği
                                                </h3>
                                                <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-md">{calculateTrays(selectedOrder.items)} Tepsi Toplam</span>
                                            </div>
                                            <div className="flex-1 divide-y divide-gray-50">
                                                {selectedOrder.items.map((item, idx) => (
                                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl shadow-inner border border-gray-200">
                                                                🥐
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{item.productName}</p>
                                                                <p className="text-sm text-gray-500 font-medium">{item.unitPrice} ₺ / birim</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block font-bold text-gray-900 text-lg">{item.subTotal} ₺</span>
                                                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded ml-auto w-fit">
                                                                x{item.quantity} Tepsi
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center">
                                                <span className="font-medium text-gray-500">Ara Toplam</span>
                                                <span className="font-bold text-gray-900">{selectedOrder.totalPrice} ₺</span>
                                            </div>
                                            <div className="bg-gray-900 p-5 text-white flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Genel Toplam</span>
                                                    <span className="font-extrabold text-3xl tracking-tight">{selectedOrder.totalPrice} ₺</span>
                                                </div>
                                                <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center text-xl">
                                                    🧾
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Status (1 col) */}
                                    <div className="space-y-6">
                                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                                <span>⚡</span> Sipariş Durumu
                                            </h3>
                                            
                                            <div className={`p-6 rounded-2xl border-2 text-center transition-all mb-8 ${getStatusColor(selectedOrder.status).replace('text-', 'border-').replace('bg-', 'bg-opacity-5 ')}`}>
                                                <div className={`w-3 h-3 mx-auto mb-2 rounded-full ${getStatusColor(selectedOrder.status).split(' ')[1].replace('text-', 'bg-')} animate-pulse`}></div>
                                                <span className={`block text-xl font-black tracking-tight ${getStatusColor(selectedOrder.status).split(' ')[1]}`}>
                                                    {selectedOrder.status === 'WAITING' ? 'BEKLİYOR' : 
                                                     selectedOrder.status === 'PREPARING' ? 'HAZIRLANIYOR' : 
                                                     selectedOrder.status === 'ON_WAY' ? 'YOLDA' : 
                                                     selectedOrder.status === 'DELIVERED' ? 'TESLİM EDİLDİ' : 
                                                     selectedOrder.status === 'CANCELLED' ? 'İPTAL' : selectedOrder.status}
                                                </span>
                                            </div>

                                            <div className="flex-1 flex flex-col gap-2">
                                                {STATUS_OPTIONS.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => updateOrderStatus(selectedOrder.id, opt.value)}
                                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group
                                                            ${selectedOrder.status === opt.value 
                                                                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 ring-2 ring-gray-900 ring-offset-2' 
                                                                : 'bg-gray-50 text-gray-600 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${opt.value === selectedOrder.status ? 'bg-green-400' : 'bg-gray-300 group-hover:bg-gray-400'}`}></div>
                                                            {opt.label}
                                                        </div>
                                                        {selectedOrder.status === opt.value && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">AKTİF</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
