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
    
    // History filters
    const [historyFilterType, setHistoryFilterType] = useState<'ALL' | 'DATE' | 'MONTH'>('ALL');
    const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>(new Date().toISOString().slice(0, 7));

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            localStorage.clear(); // Clear all auth data
            router.push('/login');
        }
    };

    // Calculate dynamic stats from orders
    const today = new Date();
    const dailyOrdersList = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getDate() === today.getDate() &&
               orderDate.getMonth() === today.getMonth() &&
               orderDate.getFullYear() === today.getFullYear();
    });

    const dailyOrderCount = dailyOrdersList.length;
    const totalTrays = dailyOrdersList.reduce((acc, order) => {
         return acc + order.items.reduce((s, i) => s + i.quantity, 0);
    }, 0);
    
    // User requested: "eğer o gün gelen siparişler teslim edildi değilse bekleyen sipariş sayısına ekleyelim"
    const waitingOrdersCount = dailyOrdersList.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;

    const stats = [
        { label: "Günlük Sipariş", value: dailyOrderCount.toString(), icon: "🛍️", color: "bg-blue-100 text-blue-600" },
        { label: "Toplam Tepsi", value: totalTrays.toString(), icon: "🥐", color: "bg-orange-100 text-orange-600" },
        { label: "Bekleyen Sipariş", value: waitingOrdersCount.toString(), icon: "🕒", color: "bg-yellow-100 text-yellow-600" },
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
            case 'WAITING': return 'bg-yellow-100 text-yellow-800';
            case 'PREPARING': return 'bg-orange-100 text-orange-800';
            case 'ON_WAY': return 'bg-blue-100 text-blue-800';
            case 'DELIVERED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getActiveButtonClass = (status: string) => {
         switch (status) {
            case 'WAITING': return 'bg-yellow-500 text-white ring-yellow-500 shadow-yellow-200';
            case 'PREPARING': return 'bg-orange-600 text-white ring-orange-600 shadow-orange-200';
            case 'ON_WAY': return 'bg-blue-600 text-white ring-blue-600 shadow-blue-200';
            case 'DELIVERED': return 'bg-green-600 text-white ring-green-600 shadow-green-200';
            case 'CANCELLED': return 'bg-red-600 text-white ring-red-600 shadow-red-200';
            default: return 'bg-gray-900 text-white ring-gray-900 shadow-gray-200';
        }
    };

    // Filter orders based on active tab
    const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        
        if (activeTab === 'daily_orders') {
            const today = new Date();
            return orderDate.getDate() === today.getDate() &&
                   orderDate.getMonth() === today.getMonth() &&
                   orderDate.getFullYear() === today.getFullYear();
        }

        if (activeTab === 'order_history') {
            if (historyFilterType === 'ALL') return true;
            
            // Check based on localized date string parts or ISO parts
            // Assuming createdAt is ISO string like "2023-10-27T10:00:00"
            if (historyFilterType === 'DATE') {
                 return order.createdAt.startsWith(selectedHistoryDate);
            }

            if (historyFilterType === 'MONTH') {
                return order.createdAt.startsWith(selectedHistoryMonth);
            }
        }

        return true; 
    });

    const sidebarItems = [
        { id: 'daily_orders', label: 'Günlük Siparişler', icon: '📅' },
        { id: 'order_history', label: 'Sipariş Geçmişi', icon: '📂' },
        { id: 'products', label: 'Ürünler', icon: '📦' },
        { id: 'users', label: 'Kullanıcılar', icon: '👥' },
        { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-800 font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-200 hidden md:flex flex-col shadow-2xl z-20 h-full relative">
                {/* Logo Section */}
                <div className="pt-10 pb-6 flex flex-col items-center justify-center">
                    <div className="h-16 w-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 mb-4">
                        <span className="text-3xl text-white font-bold">B</span>
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Böreksan</h2>
                        <span className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase mt-1 block">Yönetici</span>
                    </div>
                </div>

                {/* Navigation - Centered & No Scroll */}
                <nav className="flex-1 flex flex-col justify-center px-4 space-y-2">
                    {sidebarItems.map((item) => (
                        <button 
                             key={item.id} 
                             onClick={() => setActiveTab(item.id)}
                             className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all duration-300 group ${
                                activeTab === item.id 
                                ? 'bg-orange-50 text-orange-600 shadow-sm' 
                                : 'text-gray-500 hover:bg-white hover:text-orange-600 hover:shadow-md hover:-translate-y-0.5'
                            }`}
                        >
                            <span className={`text-xl transition-all duration-300 ${activeTab === item.id ? 'scale-110 drop-shadow-md' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                                {item.icon}
                            </span>
                            <span className="font-bold tracking-wide text-sm">{item.label}</span>
                            
                            {activeTab === item.id && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Bottom Section: Compact User & Logout */}
                <div className="p-6">
                    <div className="p-4 border-t border-gray-100 relative overflow-hidden group">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-5 rounded-full blur-xl transform group-hover:scale-150 transition-transform duration-500"></div>
                        
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">
                                A
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">Admin</p>
                                <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Süper Yetkili</p>
                            </div>
                             <button 
                                onClick={handleLogout}
                                title="Çıkış Yap"
                                className="p-2 bg-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-400 hover:cursor-pointer rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                {/* Header */}
                <header className="bg-white sticky top-0 z-10 border-b border-gray-100 px-8 py-5 flex justify-between items-center shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                            {activeTab === 'daily_orders' ? 'Bugünün Özeti' : 
                             activeTab === 'order_history' ? 'Sipariş Geçmişi' : 'Kontrol Paneli'}
                        </h1>
                        <p className="text-sm font-bold text-gray-400 mt-1">
                            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-3 bg-gray-50 hover:bg-orange-50 text-gray-400 hover:text-orange-600 rounded-xl transition-all relative border border-gray-100 hover:border-orange-200 group">
                            <span className="absolute top-2.5 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm group-hover:animate-pulse"></span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto space-y-8">
                    {/* Stats Grid */}
                    {activeTab === 'daily_orders' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {stats.map((stat, index) => (
                                <div key={index} className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all duration-300 relative overflow-hidden">
                                     <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500`}>
                                        <span className="text-8xl grayscale group-hover:grayscale-0">{stat.icon}</span>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                                                <span className="text-2xl">{stat.icon}</span>
                                            </div>
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                                        </div>
                                        <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Incoming Orders */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex flex-col xl:flex-row justify-between xl:items-center gap-6 bg-white">
                            <div className="flex flex-col gap-6 w-full xl:w-auto">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                                        <span className="bg-orange-400 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-md shadow-orange-200">
                                            {activeTab === 'daily_orders' ? 'G' : 'L'}
                                        </span>
                                        {activeTab === 'daily_orders' ? 'Gelen Siparişler' : 
                                        activeTab === 'order_history' ? 'Geçmiş Kayıtlar' : 'Sipariş Listesi'}
                                    </h2>
                                    {activeTab === 'daily_orders' && (
                                        <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full border border-orange-100">
                                            Canlı Akış
                                        </span>
                                    )}
                                </div>

                                {activeTab === 'order_history' && (
                                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-fit">
                                        <button 
                                            onClick={() => setHistoryFilterType('ALL')}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${historyFilterType === 'ALL' ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                        >
                                            Tümü
                                        </button>
                                        <button 
                                            onClick={() => setHistoryFilterType('DATE')}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${historyFilterType === 'DATE' ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                        >
                                            Gün Bazlı
                                        </button>
                                        <button 
                                            onClick={() => setHistoryFilterType('MONTH')}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${historyFilterType === 'MONTH' ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                        >
                                            Ay Bazlı
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'order_history' && historyFilterType === 'DATE' && (
                                    <div className="relative">
                                        <input 
                                            type="date" 
                                            value={selectedHistoryDate}
                                            onChange={(e) => setSelectedHistoryDate(e.target.value)}
                                            className="pl-4 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                        />
                                    </div>
                                )}

                                {activeTab === 'order_history' && historyFilterType === 'MONTH' && (
                                    <div className="relative">
                                        <input 
                                            type="month" 
                                            value={selectedHistoryMonth}
                                            onChange={(e) => setSelectedHistoryMonth(e.target.value)}
                                            className="pl-4 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 w-full xl:w-auto">
                                <div className="relative flex-1 xl:w-80 group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                        </svg>
                                    </span>
                                    <input 
                                        type="text" 
                                        placeholder="Sipariş, müşteri veya ürün ara..." 
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 hover:bg-gray-100 focus:bg-white border-transparent rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 shadow-inner transition-all outline-none"
                                    />
                                </div>
                                <button className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-gray-200 hover:border-orange-200 hover:text-orange-600 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                                    </svg>
                                    Filtrele
                                </button>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 border-b border-gray-100 text-gray-900">
                                    <tr>
                                        <th className="px-4 py-4 font-bold">Sipariş No</th>
                                        <th className="px-6 py-4 font-bold">Müşteri</th>
                                        <th className="px-6 py-4 font-bold">Zaman</th>
                                        <th className="px-6 py-4 font-bold">İçerik Özeti</th>
                                        <th className="px-6 py-4 font-bold text-right">Tutar</th>
                                        <th className="px-6 py-4 font-bold text-center">Durum</th>
                                        <th className="px-6 py-4 font-bold text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 bg-white">
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
                                            className="hover:bg-orange-50/50 transition-colors group cursor-pointer relative border-b border-slate-100"
                                        >
                                            <td className="px-6 py-4 font-mono font-bold text-slate-700 group-hover:text-orange-600 transition-colors">
                                                #{order.id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-gray-100 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs border border-gray-200">
                                                        {(order.shopName?.[0] || order.customerName?.[0] || "?").toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">{order.shopName || "Bireysel"}</p>
                                                        <p className="text-xs text-gray-500 font-medium">{order.customerName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-xs font-medium text-gray-500">
                                                    <span className="text-slate-600 text-sm">{formatDate(order.createdAt)}</span>
                                                    <span>{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {order.items.slice(0, 4).map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                                                            <span className="flex-shrink-0 bg-white border border-gray-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold shadow-sm">
                                                                {item.quantity}x
                                                            </span>
                                                            <span className="truncate max-w-[150px] font-medium" title={item.productName}>{item.productName}</span>
                                                        </div>
                                                    ))}
                                                    {order.items.length > 4 && (
                                                        <span className="text-xs text-gray-400 pl-1 font-bold">+{order.items.length - 4} diğer ürün...</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-700">
                                                {order.totalPrice} ₺
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                                    {order.status === 'WAITING' ? 'Bekliyor' : 
                                                     order.status === 'PREPARING' ? 'Hazırlanıyor' : 
                                                     order.status === 'ON_WAY' ? 'Yolda' : 
                                                     order.status === 'DELIVERED' ? 'Teslim' : 
                                                     order.status === 'CANCELLED' ? 'İptal' : order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {order.status === 'WAITING' ? (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApprove(order.id);
                                                        }}
                                                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-sm hover:shadow-md transition-all"
                                                    >
                                                        ONAYLA
                                                    </button>
                                                ) : (
                                                    <div className="text-gray-400 flex items-center justify-end gap-1">
                                                        <span className="text-xs font-medium">Detay</span>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                    </div>
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
                                    <div className="flex-row items-center gap-2 mb-5">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">Müşteri Bilgileri</h3>
                                        <div className="h-px bg-gray-100 flex-1 mt-3"></div>
                                    </div>
                                    
                                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 mb-2 block">Pastane / Müşteri</label>
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
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-white text-green-600 rounded-lg shadow-sm flex items-center justify-center text-sm">
                                                    📞
                                                </div>
                                                <p className="font-bold text-gray-800 font-mono tracking-tight">{selectedOrder.phone}</p>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 mb-2 block">Teslimat Adresi</label>
                                            <div className="flex items-center gap-3">
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
                                    
                                    {/* Left: Items & Status Detail */}
                                    <div className="lg:col-span-2 space-y-6">
                                        
                                        {/* Status Bar (Copied from Customer) */}
                                        <div className={`flex items-center justify-between p-5 rounded-2xl border shadow-sm ${
                                            selectedOrder.status === 'WAITING' ? 'bg-yellow-50 border-yellow-200' :
                                            selectedOrder.status === 'PREPARING' ? 'bg-orange-50 border-orange-200' :
                                            selectedOrder.status === 'ON_WAY' ? 'bg-blue-50 border-blue-200' :
                                            selectedOrder.status === 'DELIVERED' ? 'bg-green-50 border-green-200' :
                                            'bg-red-50 border-red-200'
                                        }`}>
                                            <div>
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                                                    selectedOrder.status === 'WAITING' ? 'text-yellow-700' :
                                                    selectedOrder.status === 'PREPARING' ? 'text-orange-700' :
                                                    selectedOrder.status === 'ON_WAY' ? 'text-blue-700' :
                                                    selectedOrder.status === 'DELIVERED' ? 'text-green-700' :
                                                    'text-red-700'
                                                }`}>SİPARİŞ DURUMU</p>
                                                <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedOrder.status)}`}>
                                                    {selectedOrder.status === 'WAITING' ? 'Bekliyor' :
                                                    selectedOrder.status === 'PREPARING' ? 'Hazırlanıyor' :
                                                    selectedOrder.status === 'ON_WAY' ? 'Yolda' :
                                                    selectedOrder.status === 'DELIVERED' ? 'Teslim Edildi' : 'İptal Edildi'}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                                                    selectedOrder.status === 'WAITING' ? 'text-yellow-700' :
                                                    selectedOrder.status === 'PREPARING' ? 'text-orange-700' :
                                                    selectedOrder.status === 'ON_WAY' ? 'text-blue-700' :
                                                    selectedOrder.status === 'DELIVERED' ? 'text-green-700' :
                                                    'text-red-700'
                                                }`}>TOPLAM TUTAR</p>
                                                <p className="text-3xl font-black text-slate-800">{selectedOrder.totalPrice} ₺</p>
                                            </div>
                                        </div>

                                        {/* Items Table (Copied from Customer) */}
                                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                                    <span>📦</span> Sipariş İçeriği
                                                </h3>
                                                <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-md">{calculateTrays(selectedOrder.items)} Tepsi Toplam</span>
                                            </div>
                                            
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left">Ürün</th>
                                                        <th className="px-6 py-4 text-center">Tepsi</th>
                                                        <th className="px-6 py-4 text-right">Birim Fiyat</th>
                                                        <th className="px-6 py-4 text-right">Ara Toplam</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {selectedOrder.items.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50">
                                                            <td className="px-6 py-4 font-bold text-gray-900">{item.productName}</td>
                                                            <td className="px-6 py-4 text-center bg-gray-50/30 font-mono text-gray-600">x{item.quantity}</td>
                                                            <td className="px-6 py-4 text-right text-gray-500">{item.unitPrice} ₺</td>
                                                            <td className="px-6 py-4 text-right font-bold text-slate-700 text-lg">{item.subTotal} ₺</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Right: Status (1 col) */}
                                    <div className="space-y-6">
                                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                                <span>⚡</span> Durum Güncelle
                                            </h3>

                                            <div className="flex-1 flex flex-col gap-2">
                                                {STATUS_OPTIONS.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => updateOrderStatus(selectedOrder.id, opt.value)}
                                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group shadow-lg ring-2 ring-offset-2
                                                            ${selectedOrder.status === opt.value 
                                                                ? getActiveButtonClass(opt.value)
                                                                : 'bg-gray-50 text-gray-600 ring-transparent shadow-none hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${opt.value === selectedOrder.status ? 'bg-white' : 'bg-gray-300 group-hover:bg-gray-400'}`}></div>
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
