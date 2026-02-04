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

interface Product {
    id: number;
    name: string;
    description?: string;
    priceTray: number;
    pricePortion: number;
}

const AdminDashboard = () => {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
    const [activeTab, setActiveTab] = useState('daily_orders');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    
    // Product Management State
    const [products, setProducts] = useState<Product[]>([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productForm, setProductForm] = useState<Partial<Product>>({ 
        name: '', description: '', priceTray: 0, pricePortion: 0 
    });

    // History filters
    const [historyFilterType, setHistoryFilterType] = useState<'ALL' | 'DATE' | 'MONTH'>('ALL');
    const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>(new Date().toISOString().slice(0, 7));

    // Report View State
    const [reportShop, setReportShop] = useState<string>('');
    const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    
    // Daily Entry State
    const [dailyChanges, setDailyChanges] = useState<Record<string, number>>({});
    const [savingDaily, setSavingDaily] = useState(false);

    const fetchProducts = async () => {
        try {
            const response = await api.get<Product[]>('/products');
            setProducts(response.data);
        } catch (error) {
            console.error("Failed to fetch products:", error);
        }
    };

    const handleSaveProduct = async () => {
        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, productForm);
            } else {
                await api.post('/products', productForm);
            }
            await fetchProducts();
            setIsProductModalOpen(false);
            setEditingProduct(null);
            setProductForm({ name: '', description: '', priceTray: 0, pricePortion: 0 });
        } catch (error) {
            console.error("Failed to save product:", error);
            alert("Ürün kaydedilemedi!");
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        try {
            await api.delete(`/products/${id}`);
            await fetchProducts();
        } catch (error) {
            console.error("Failed to delete product:", error);
            alert("Ürün silinemedi!");
        }
    };

    const openProductModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setProductForm({
                name: product.name,
                description: product.description || '',
                priceTray: product.priceTray,
                pricePortion: product.pricePortion
            });
        } else {
            setEditingProduct(null);
            setProductForm({ name: '', description: '', priceTray: 0, pricePortion: 0 });
        }
        setIsProductModalOpen(true);
    };

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
    
    // Calculate Daily Turnover (Revenue from non-cancelled orders)
    const dailyTurnover = dailyOrdersList
        .filter(o => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.totalPrice, 0);

    // User requested: "eğer o gün gelen siparişler teslim edildi değilse bekleyen sipariş sayısına ekleyelim"
    const waitingOrdersCount = dailyOrdersList.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;

    const stats = [
        { 
            label: "GÜNLÜK CİRO", 
            value: `${dailyTurnover.toLocaleString('tr-TR')} ₺`, 
            subValue: `${dailyOrderCount} Sipariş`,
            icon: "₺", 
            color: "bg-emerald-50 text-emerald-600 border-emerald-100" 
        },
        { 
            label: "TOPLAM TEPSİ", 
            value: totalTrays.toString(), 
            subValue: "Üretim Bekleyen",
            icon: "tray", // Using a string to identify, we will render SVG
            color: "bg-orange-50 text-orange-600 border-orange-100" 
        },
        { 
            label: "BEKLEYEN SİPARİŞ", 
            value: waitingOrdersCount.toString(), 
            subValue: "Teslimat Aşamasında",
            icon: "clock", 
            color: "bg-blue-50 text-blue-600 border-blue-100" 
        },
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
        fetchProducts();
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
            case 'PREPARING': return 'bg-red-100 text-red-800';
            case 'ON_WAY': return 'bg-blue-100 text-blue-800';
            case 'DELIVERED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getActiveButtonClass = (status: string) => {
         switch (status) {
            case 'WAITING': return 'bg-yellow-500 text-white ring-yellow-500 shadow-yellow-200';
            case 'PREPARING': return 'bg-red-600 text-white ring-red-600 shadow-red-200';
            case 'ON_WAY': return 'bg-blue-600 text-white ring-blue-600 shadow-blue-200';
            case 'DELIVERED': return 'bg-green-600 text-white ring-green-600 shadow-green-200';
            case 'CANCELLED': return 'bg-gray-600 text-white ring-gray-600 shadow-gray-200';
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
        { id: 'daily_orders', label: 'Günlük Siparişler' },
        { id: 'order_history', label: 'Sipariş Geçmişi' },
        { id: 'products', label: 'Ürünler' },
        { id: 'users', label: 'Dükkanlar' },
        { id: 'settings', label: 'Ayarlar' },
    ];

    const renderIcon = (id: string, active: boolean) => {
        const colorClass = active ? "text-red-500" : "text-gray-400 group-hover:text-red-500";
        switch (id) {
            case 'daily_orders':
                return <svg className={`w-5 h-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
            case 'order_history':
                return <svg className={`w-5 h-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>;
            case 'products':
                return <svg className={`w-5 h-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
            case 'users':
                return <svg className={`w-5 h-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
            case 'settings':
                return <svg className={`w-5 h-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-white text-gray-800 font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white flex flex-col z-20 h-full relative border-r border-gray-100">
                {/* Logo Section */}
                <div className="pt-8 pb-10 flex flex-col items-center justify-center">
                    <div className="h-16 w-16 bg-red-500 rounded-2xl flex items-center justify-center mb-3 shadow-red-200 shadow-lg">
                        <span className="text-3xl text-white font-bold">B</span>
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Böreksan</h2>
                        <span className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase mt-1 block">Yönetici</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col px-6 space-y-1">
                    {sidebarItems.map((item) => {
                        const active = activeTab === item.id;
                        return (
                            <button 
                                key={item.id} 
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 group relative ${
                                    active 
                                    ? 'bg-red-50/80 text-gray-900 font-bold' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                }`}
                            >
                                <div className="flex items-center gap-4 relative z-10 w-full">
                                    {renderIcon(item.id, active)}
                                    <span className={`text-sm tracking-wide ${active ? 'text-gray-900' : ''}`}>{item.label}</span>
                                </div>
                                
                                {active && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-500 rounded-r-lg"></span>
                                )}
                                {active && (
                                    <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="p-6 mt-auto">
                   <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center font-bold text-white shadow-md group-hover:scale-105 transition-transform">
                            A
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900">Admin</p>
                            <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">Süper Yetkili</p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                   </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F9FAFB]">
                {/* Modern Header */}
                <div className="px-10 py-3 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                            {activeTab === 'daily_orders' ? 'Bugünün Özeti' : 
                             activeTab === 'order_history' ? 'Sipariş Geçmişi' : 
                             activeTab === 'products' ? 'Ürün Yönetimi' : 'Kontrol Paneli'}
                        </h1>
                        <p className="text-sm font-bold text-gray-400 ml-1">
                            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button className="p-3 bg-white text-gray-400 hover:text-red-500 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative group">
                        <span className="absolute top-3 right-3.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </button>
                </div>

                <div className={`p-8 max-w-7xl mx-auto space-y-8 ${activeTab === 'order_history' ? 'h-[calc(100vh-90px)] flex flex-col pb-2' : ''}`}>
                    {/* Stats Grid */}
                    {activeTab === 'daily_orders' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {stats.map((stat, index) => (
                                <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                                    <div className="relative z-10">
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                                        <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{stat.value}</h3>
                                        <p className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-lg inline-block">{stat.subValue}</p>
                                    </div>
                                    
                                    <div className={`p-4 rounded-2xl ${stat.color} bg-opacity-30`}>
                                        {stat.icon === '₺' && <span className="text-2xl font-bold font-mono">₺</span>}
                                        {stat.icon === 'tray' && (
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        )}
                                        {stat.icon === 'clock' && (
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Daily Shop Matrix */}
                    {activeTab === 'daily_orders' && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <span>🏭</span> Dükkan Sipariş Girişi
                                    </h2>
                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Bugün</span>
                                    <span className="text-[10px] text-gray-400 font-medium ml-2 hidden sm:inline-block border-l pl-3 border-gray-200">
                                        * Günlük istenen sipariş miktarlarını girebilirsiniz.
                                    </span>
                                </div>
                                {Object.keys(dailyChanges).length > 0 && (
                                    <button 
                                        onClick={async () => {
                                            setSavingDaily(true);
                                            try {
                                                const updates: { shopName: string, productId: number, targetQuantity: number }[] = [];
                                                const currentIso = new Date().toISOString().slice(0, 10);
                                                
                                                // Iterate all known shops to safely reconstruct keys and check changes
                                                const allShops = Array.from(new Set(orders.map(o => o.shopName || o.customerName)))
                                                    .filter(s => s && s.toLowerCase() !== 'admin');

                                                allShops.forEach(shop => {
                                                    const shopOrders = orders.filter(o => 
                                                        o.createdAt.startsWith(currentIso) && 
                                                        (o.shopName === shop || o.customerName === shop) && 
                                                        o.status !== 'CANCELLED'
                                                    );

                                                    products.forEach(p => {
                                                        const key = `${shop}-${p.id}`;
                                                        if (dailyChanges[key] === undefined) return;
                                                        
                                                        const val = dailyChanges[key];
                                                        const currentQty = shopOrders.flatMap(o => o.items)
                                                            .filter(i => i.productName === p.name)
                                                            .reduce((sum, i) => sum + i.quantity, 0);
                                                        
                                                        if (val !== currentQty) {
                                                            updates.push({ shopName: shop, productId: p.id, targetQuantity: val });
                                                        }
                                                    });
                                                });

                                                if (updates.length === 0) {
                                                    alert("Herhangi bir değişiklik yapmadınız.");
                                                    return;
                                                }

                                                await Promise.all(updates.map(u => 
                                                    api.post('/orders/daily-update', u)
                                                ));

                                                setDailyChanges({});
                                                await fetchOrders();
                                                alert('Değişiklikler kaydedildi!');
                                            } catch (e) {
                                                console.error(e);
                                                alert('Hata oluştu!');
                                            } finally {
                                                setSavingDaily(false);
                                            }
                                        }}
                                        disabled={savingDaily}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-green-700 transition flex items-center gap-2 hover:cursor-pointer"
                                    >
                                        {savingDaily ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                    </button>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-center border-collapse">
                                    <thead className="bg-white sticky top-0 z-40">
                                        <tr>
                                            <th className="py-4 px-6 text-left min-w-[200px] bg-white text-gray-400 text-[10px] font-bold uppercase tracking-widest sticky left-0 z-50 border-b border-gray-50">DÜKKAN</th>
                                            {products.map(p => (
                                                <th key={p.id} className="py-4 px-2 min-w-[100px] bg-white border-b border-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">{p.name}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50/50">
                                        {(() => {
                                            // Get all shops but exclude 'Admin' (or current user if needed)
                                            // We assume the admin username is 'Admin' or 'admin'.
                                            const allShops = Array.from(new Set(orders.map(o => o.shopName || o.customerName)))
                                                .filter(s => s && s.toLowerCase() !== 'admin')
                                                .sort();
                                            
                                            const currentIso = new Date().toISOString().slice(0, 10);

                                            return allShops.map(shop => {
                                                const shopOrders = orders.filter(o => 
                                                    o.createdAt.startsWith(currentIso) && 
                                                    (o.shopName === shop || o.customerName === shop) && 
                                                    o.status !== 'CANCELLED'
                                                );
                                                
                                                const productTotals: Record<number, number> = {};
                                                products.forEach(p => productTotals[p.id] = 0);
                                                
                                                shopOrders.flatMap(o => o.items).forEach(item => {
                                                    const prod = products.find(p => p.name === item.productName);
                                                    if (prod) productTotals[prod.id] += item.quantity;
                                                });

                                                return (
                                                    <tr key={shop} className="hover:bg-gray-50/50 transition-colors group">
                                                        <td className="py-4 px-6 text-left text-sm font-bold text-gray-700 sticky left-0 z-30 bg-white group-hover:bg-gray-50/50 transition-colors border-r border-transparent group-hover:border-gray-100">
                                                            {shop}
                                                        </td>
                                                        {products.map(p => {
                                                            const currentQty = productTotals[p.id];
                                                            const key = `${shop}-${p.id}`;
                                                            const val = dailyChanges[key] !== undefined ? dailyChanges[key] : currentQty;
                                                            const isChanged = dailyChanges[key] !== undefined && dailyChanges[key] !== currentQty;
                                                            
                                                            return (
                                                                <td key={p.id} className="p-2 relative">
                                                                    <input 
                                                                        type="number" 
                                                                        min="0"
                                                                        value={val === 0 ? '' : val}
                                                                        onChange={(e) => {
                                                                            const newVal = parseInt(e.target.value) || 0;
                                                                            if (newVal < 0) return; // Prevent negative input in visual field
                                                                            setDailyChanges(prev => ({...prev, [key]: newVal}));
                                                                        }}
                                                                        className={`w-full text-center py-2 rounded-lg border-2 outline-none font-bold transition-all ${
                                                                            isChanged 
                                                                            ? 'border-green-400 bg-green-50 text-green-700' 
                                                                            : val > 0 
                                                                                ? 'border-transparent bg-gray-50 text-gray-900 focus:border-red-200 focus:bg-white' 
                                                                                : 'border-dashed border-gray-300 text-gray-400 bg-transparent hover:border-gray-400 focus:border-red-200 focus:text-gray-900 focus:bg-white'
                                                                        }`}
                                                                        placeholder="-"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === '-') e.preventDefault();
                                                                        }}
                                                                    />
                                                                    {isChanged && (
                                                                        <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Incoming Orders */}
                    {activeTab === 'daily_orders' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex flex-col xl:flex-row justify-between xl:items-center gap-6 bg-white">
                            <div className="flex flex-col gap-4 w-full xl:w-auto">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                       Gelen Siparişler
                                    </h2>
                                    <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100">
                                        Canlı Akış
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4 w-full xl:w-auto">
                                <div className="relative flex-1 xl:w-80 group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                        </svg>
                                    </span>
                                    <input 
                                        type="text" 
                                        placeholder="Sipariş, müşteri veya ürün ara..." 
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 hover:bg-gray-100 focus:bg-white border-transparent rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 shadow-inner transition-all outline-none"
                                    />
                                </div>
                                <button className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-gray-200 hover:border-red-200 hover:text-red-600 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                                    </svg>
                                    Filtrele
                                </button>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white sticky top-0 z-40">
                                    <tr>
                                        <th className="py-4 px-14 text-left bg-white text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-50">Müşteri</th>
                                        <th className="py-4 px-5 text-left bg-white text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-50">Zaman</th>
                                        {products.map(p => (
                                            <th key={p.id} className="py-4 px-2 min-w-[80px] bg-white border-b border-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest text-center" title={p.name}>
                                                {p.name}
                                            </th>
                                        ))}
                                        <th className="py-4 px-7 text-right bg-white text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-50">Tutar</th>
                                        <th className="py-4 px-5 text-center bg-white text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-50">Durum</th>
                                        <th className="py-4 px-5 text-right bg-white text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-50">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50/50 bg-white">
                                    {loading && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
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
                                            className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        >
                                            {/* <td className="px-6 py-4 text-xs font-bold text-gray-700 font-mono">
                                                #{order.id}
                                            </td> */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-gray-100 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs border border-gray-200">
                                                        {(order.shopName?.[0] || order.customerName?.[0] || "?").toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">{order.shopName || "Bireysel"}</p>
                                                        <p className="text-xs text-gray-500 font-medium">{order.customerName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col text-xs font-medium text-gray-500">
                                                    <span className="text-slate-600 text-sm">{formatDate(order.createdAt)}</span>
                                                    <span>{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                            </td>
                                            {products.map(p => {
                                                const item = order.items.find(i => i.productName === p.name);
                                                return (
                                                    <td key={p.id} className="px-2 py-4 text-center">
                                                        {item && item.quantity > 0 ? (
                                                            <span className="inline-block px-2 py-1 text-xs font-bold text-gray-700">
                                                                {item.quantity}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-200 text-xs font-bold">0</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-5 py-4 text-right font-bold text-slate-700">
                                                {order.totalPrice} ₺
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                                    {order.status === 'WAITING' ? 'Bekliyor' : 
                                                     order.status === 'PREPARING' ? 'Hazırlanıyor' : 
                                                     order.status === 'ON_WAY' ? 'Yolda' : 
                                                     order.status === 'DELIVERED' ? 'Teslim' : 
                                                     order.status === 'CANCELLED' ? 'İptal' : order.status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-4 text-right">
                                                <div className="text-gray-400 flex items-center justify-end gap-1">
                                                    <span className="text-xs font-medium">Detay</span>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    )}

                    {/* Order History / Shop Matrix Report */}
                    {activeTab === 'order_history' && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 h-full">
                            {/* Toolbar */}
                            <div className="p-6 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-4">
                                     <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        📄 Dükkan Raporları
                                    </h2>
                                </div>
                                <div className="flex items-center gap-4">
                                    <select 
                                        value={reportShop} 
                                        onChange={(e) => setReportShop(e.target.value)}
                                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 hover:cursor-pointer min-w-[200px]"
                                    >
                                        <option value="">Dükkan Seçiniz...</option>
                                        {Array.from(new Set(orders.map(o => o.shopName || o.customerName))).filter(Boolean).sort().map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <input 
                                        type="month"
                                        value={reportMonth}
                                        onChange={(e) => setReportMonth(e.target.value)}
                                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 hover:cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Matrix Table */}
                            <div className="overflow-auto flex-1 relative bg-white">
                                {!reportShop ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 pb-20">
                                        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                            <span className="text-4xl">🏪</span>
                                        </div>
                                        <h3 className="font-bold text-xl text-gray-800 mb-2">Dükkan Raporu</h3>
                                        <p className="text-gray-500 font-medium">Detaylı tabloyu görüntülemek için yukarıdan bir dükkan seçiniz.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-center border-collapse">
                                        <thead className="bg-white sticky top-0 z-40">
                                            <tr>
                                                <th className="py-4 px-6 text-left min-w-[150px] bg-white text-gray-400 text-[10px] font-bold uppercase tracking-widest sticky left-0 z-50 border-b border-gray-50">
                                                    TARİH
                                                </th>
                                                {products.map(p => (
                                                    <th key={p.id} className="py-4 px-2 min-w-[80px] bg-white border-b border-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest" title={p.name}>
                                                        {p.name}
                                                    </th>
                                                ))}
                                                <th className="py-4 px-4 bg-white border-b border-gray-50 min-w-[100px] text-gray-400 text-[10px] font-bold uppercase tracking-widest">TUTAR</th>
                                                <th className="py-4 px-4 bg-white border-b border-gray-50 min-w-[100px] text-gray-400 text-[10px] font-bold uppercase tracking-widest">ÖDENEN</th>
                                                <th className="py-4 px-4 bg-white border-b border-gray-50 min-w-[100px] text-gray-400 text-[10px] font-bold uppercase tracking-widest">KALAN</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50/50">
                                            {(() => {
                                                const year = parseInt(reportMonth.split('-')[0]);
                                                const month = parseInt(reportMonth.split('-')[1]);
                                                const daysInMonth = new Date(year, month, 0).getDate();
                                                const rows = [];
                                                
                                                // Aggregates for footer
                                                const colTotals: Record<string, number> = {};
                                                let totalAmount = 0;

                                                // Today for comparison
                                                const now = new Date();
                                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                                                for (let d = 1; d <= daysInMonth; d++) {
                                                    const currentDate = new Date(year, month - 1, d);
                                                    const isFuture = currentDate > today;
                                                    const currentIso = `${reportMonth}-${d.toString().padStart(2, '0')}`;
                                                    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                                                    const dateStr = d + ' ' + currentDate.toLocaleString('tr-TR', {month: 'long'});
                                                    
                                                    // Filter for day orders (simple startswith match on ISO string YYYY-MM-DD...)
                                                    const dayOrders = orders.filter(o => 
                                                        o.createdAt.startsWith(currentIso) && 
                                                        (o.shopName === reportShop || o.customerName === reportShop) && 
                                                        o.status !== 'CANCELLED'
                                                    );

                                                    const dailyTotal = dayOrders.reduce((acc, o) => acc + o.totalPrice, 0);
                                                    totalAmount += dailyTotal;

                                                    const productCounts: Record<string, number> = {};
                                                    dayOrders.flatMap(o => o.items).forEach(item => {
                                                        productCounts[item.productName] = (productCounts[item.productName] || 0) + item.quantity;
                                                        colTotals[item.productName] = (colTotals[item.productName] || 0) + item.quantity;
                                                    });

                                                    // Handle Row Click Logic
                                                    const handleRowClick = () => {
                                                        if (dayOrders.length === 0) return;

                                                        const mergedItems: OrderItemResponse[] = [];
                                                        dayOrders.flatMap(o => o.items).forEach(item => {
                                                             const existing = mergedItems.find(i => i.productName === item.productName);
                                                             if (existing) {
                                                                 existing.quantity += item.quantity;
                                                                 existing.subTotal += item.subTotal;
                                                             } else {
                                                                 mergedItems.push({...item});
                                                             }
                                                        });

                                                        const aggregatedOrder: OrderResponse = {
                                                            ...dayOrders[0],
                                                            id: dayOrders[0].id, // Keep ID for key purposes, generally ignored in this view
                                                            totalPrice: dailyTotal,
                                                            status: dayOrders.every(o => o.status === 'DELIVERED') ? 'DELIVERED' : 'WAITING',
                                                            createdAt: currentIso + 'T12:00:00.000Z', 
                                                            items: mergedItems
                                                        };
                                                        setSelectedOrder(aggregatedOrder);
                                                    };

                                                    rows.push(
                                                        <tr 
                                                            key={d} 
                                                            onClick={handleRowClick}
                                                            className={`hover:bg-gray-50/50 transition-colors group ${dayOrders.length > 0 ? 'cursor-pointer hover:bg-blue-50/10' : ''}`}
                                                        >
                                                            <td className="py-4 px-6 text-left text-sm font-medium text-gray-600 sticky left-0 z-30 bg-white group-hover:bg-gray-50/50 transition-colors flex items-center gap-3">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${dailyTotal > 0 ? 'bg-red-400' : 'bg-gray-200'}`}></span>
                                                                {dateStr}
                                                            </td>
                                                            {products.map(p => {
                                                                const count = productCounts[p.name];
                                                                const displayValue = count ? count : (isFuture ? '' : '0');
                                                                // If count exists, show bold black, if 0 show light gray
                                                                const styleClass = count 
                                                                    ? "font-bold text-gray-600" 
                                                                    : "font-bold text-gray-200";
                                                                    
                                                                return (
                                                                    <td key={p.id} className={`py-4 px-2 text-sm ${styleClass}`}>
                                                                        {displayValue}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="py-4 px-4 text-sm font-bold text-red-600 text-center">
                                                                {dailyTotal > 0 ? `${dailyTotal.toLocaleString('tr-TR')} ₺` : (isFuture ? '' : <span className="text-red-200">0</span>)}
                                                            </td>
                                                            <td className="py-4 px-4 text-sm font-medium text-green-500 text-center">-</td>
                                                            <td className="py-4 px-4 text-sm font-medium text-orange-400 text-center">-</td>
                                                        </tr>
                                                    );
                                                }
                                                return (
                                                    <>
                                                        {rows}
                                                        {/* Footer Totals */}
                                                        <tr className="bg-gray-50/50 border-t border-gray-100 sticky bottom-0 z-40">
                                                            <td className="py-6 px-6 text-left sticky left-0 bottom-0 z-50 bg-gray-50 text-gray-900 text-xs font-bold uppercase tracking-widest shadow-[4px_0_24px_-4px_rgba(0,0,0,0.02)]">
                                                                GENEL TOPLAM
                                                            </td>
                                                            {products.map(p => (
                                                                <td key={p.id} className="py-6 px-2 text-gray-900 font-bold text-sm bg-gray-50/50">
                                                                    {colTotals[p.name] || 0}
                                                                </td>
                                                            ))}
                                                            <td className="py-6 px-4 text-center font-bold text-red-600 text-sm bg-gray-50/50">
                                                                {totalAmount.toLocaleString('tr-TR')} ₺
                                                            </td>
                                                            <td className="py-6 px-4 text-center font-bold text-green-600 text-sm bg-gray-50/50">
                                                                0 ₺
                                                            </td>
                                                            <td className="py-6 px-4 text-center font-bold text-orange-600 text-sm bg-gray-50/50">
                                                                {totalAmount.toLocaleString('tr-TR')} ₺
                                                            </td>
                                                        </tr>
                                                    </>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Product Management Section */}
                    {activeTab === 'products' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>📦</span> Ürün Listesi
                                </h2>
                                <button 
                                    onClick={() => openProductModal()}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm shadow-md shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2 hover:cursor-pointer"
                                >
                                    <span>➕</span> Yeni Ürün Ekle
                                </button>
                            </div>
                            
                            {products.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                    <div className="text-4xl mb-3 opacity-30">🥐</div>
                                    <p className="text-gray-400 font-medium">Henüz ürün eklenmemiş.</p>
                                    <button 
                                        onClick={() => openProductModal()}
                                        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-full font-bold shadow-md hover:bg-red-700 transition"
                                    >
                                        İlk Ürünü Ekle
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {products.map(product => (
                                        <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group">
                                            {/* Image Section */}
                                            <div className="h-40 bg-gray-50 relative overflow-hidden group flex items-center justify-center border-b border-gray-50">
                                                <div className="text-5xl opacity-80 transition-transform duration-300 group-hover:scale-110">🥐</div>

                                                {/* Action Overlay */}
                                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                                                    <button 
                                                        onClick={() => openProductModal(product)}
                                                        className="h-10 w-10 bg-white text-gray-700 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-500 hover:text-white transition-all transform hover:scale-110"
                                                        title="Düzenle"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                        className="h-10 w-10 bg-white text-gray-700 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                                                        title="Sil"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Content Section */}
                                            <div className="p-5 flex-1 flex flex-col">
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">{product.name}</h3>
                                                <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">{product.description || "Açıklama yok."}</p>
                                                
                                                <div className="mt-auto grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TEPSİ</p>
                                                        <p className="text-lg font-bold text-red-600">{product.priceTray} ₺</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ADET</p>
                                                        <p className="text-lg font-bold text-red-600">{product.pricePortion > 0 ? `${product.pricePortion} ₺` : '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Product Card (Moved to end) */}
                                    <button 
                                        onClick={() => openProductModal()}
                                        className="h-full border-3 border-dashed border-gray-200 hover:border-red-300 bg-gray-50/50 hover:bg-white rounded-2xl flex flex-col items-center justify-center gap-5 text-gray-400 hover:text-red-500 transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 hover:cursor-pointer p-6"
                                    >
                                        <div className="h-16 w-16 rounded-full bg-white border-2 border-gray-200 group-hover:border-red-200 group-hover:bg-red-50 flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-110">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <span className="block font-bold text-base group-hover:text-gray-900 transition-colors">Yeni Ürün Ekle</span>
                                            <span className="text-[10px] font-medium opacity-60 mt-1 block">Listeye lezzet katın</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {activeTab === 'order_history' 
                                        ? `${new Date(selectedOrder.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} Özeti`
                                        : `Sipariş #${selectedOrder.id}`
                                    }
                                </h2>
                                <p className="text-xs text-gray-400 font-bold mt-1">
                                    {activeTab === 'order_history' 
                                        ? 'Günlük Toplam Sipariş Dökümü'
                                        : new Date(selectedOrder.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    }
                                </p>
                            </div>
                            <button 
                                onClick={closeModal} 
                                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            <div className="flex flex-col gap-6">
                                
                                {/* Customer & Info Grid */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">MÜŞTERİ</p>
                                        <p className="font-bold text-gray-900 text-lg">{(selectedOrder.shopName || selectedOrder.customerName)}</p>
                                        <p className="text-gray-500 text-xs mt-1 font-medium">{selectedOrder.phone}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-center items-end text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">TOPLAM TUTAR</p>
                                        <p className="font-bold text-gray-900 text-2xl">{selectedOrder.totalPrice.toLocaleString('tr-TR')} ₺</p>
                                    </div>
                                </div>
                                
                                {/* Address (If exists) */}
                                {selectedOrder.address && (
                                    <div className="px-4 py-3 bg-white border border-gray-100 rounded-xl">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">TESLİMAT ADRESİ</p>
                                        <p className="text-sm font-medium text-gray-700">{selectedOrder.address}</p>
                                    </div>
                                )}

                                {/* Items Table */}
                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                     <table className="w-full text-sm border-collapse">
                                        <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-widest border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Ürün</th>
                                                <th className="px-4 py-3 text-center">Tepsi</th>
                                                <th className="px-4 py-3 text-right">Fiyat</th>
                                                <th className="px-4 py-3 text-right">Tutar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {selectedOrder.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 font-bold text-gray-700">{item.productName}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-gray-600 bg-gray-50/30">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right text-gray-400 text-xs">{item.unitPrice.toLocaleString('tr-TR')} ₺</td>
                                                    <td className="px-4 py-3 text-right font-bold text-gray-700">{item.subTotal.toLocaleString('tr-TR')} ₺</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t border-gray-100">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Genel Toplam</td>
                                                <td className="px-4 py-3 text-right font-black text-gray-900">{selectedOrder.totalPrice.toLocaleString('tr-TR')} ₺</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Status Actions */}
                                {activeTab !== 'order_history' && (
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">DURUM GÜNCELLE</p>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                        {STATUS_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => updateOrderStatus(selectedOrder.id, opt.value)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                                    selectedOrder.status === opt.value 
                                                    ? 'bg-gray-900 text-white border-gray-900 shadow-md ring-2 ring-gray-100 ring-offset-2'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-900'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
                            </h2>
                            <button 
                                onClick={() => setIsProductModalOpen(false)}
                                className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all hover:cursor-pointer"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Ürün Adı</label>
                                <input 
                                    type="text" 
                                    value={productForm.name}
                                    onChange={e => setProductForm({...productForm, name: e.target.value})}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                    placeholder="Örn: Su Böreği"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Açıklama (Opsiyonel)</label>
                                <textarea 
                                    value={productForm.description}
                                    onChange={e => setProductForm({...productForm, description: e.target.value})}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none h-24"
                                    placeholder="Ürün açıklaması..."
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tepsi Fiyatı (₺)</label>
                                    <input 
                                        type="number" 
                                        value={productForm.priceTray}
                                        onChange={e => setProductForm({...productForm, priceTray: parseFloat(e.target.value) || 0})}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Adet Fiyatı (₺)</label>
                                    <input 
                                        type="number" 
                                        value={productForm.pricePortion}
                                        onChange={e => setProductForm({...productForm, pricePortion: parseFloat(e.target.value) || 0})}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsProductModalOpen(false)}
                                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors hover:cursor-pointer"
                            >
                                İptal
                            </button>
                            <button 
                                onClick={handleSaveProduct}
                                className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-200 transition-all hover:cursor-pointer"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
