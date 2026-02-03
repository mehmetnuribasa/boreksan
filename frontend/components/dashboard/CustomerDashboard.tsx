import React, { useEffect, useState, useMemo } from 'react';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';

interface Product {
    id: number;
    name: string;
    description: string;
    priceTray: number;
    // adding local fields for UI fallback
    image?: string;
    tag?: string;
}

interface CartItem {
    productId: number;
    name: string;
    price: number;
    quantity: number;
}

interface OrderItemResponse {
    productName: string;
    quantity: number;
    unitPrice: number;
    subTotal: number;
}

interface OrderResponse {
    id: number;
    customerName: string;
    shopName: string;
    address: string;
    phone: string;
    totalPrice: number;
    status: 'WAITING' | 'PREPARING' | 'ON_WAY' | 'DELIVERED' | 'CANCELLED';
    createdAt: string;
    items: OrderItemResponse[];
}

const CustomerDashboard = () => {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [customerOrders, setCustomerOrders] = useState<OrderResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [activeTab, setActiveTab] = useState<'market' | 'daily_orders' | 'order_history'>('market');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    
    // User info state
    const [username, setUsername] = useState<string>('');
    const [shopName, setShopName] = useState<string>('');
    const [isLate, setIsLate] = useState(false);

    // Local state to track the "amount to add" input for each product
    const [inputQuantities, setInputQuantities] = useState<{ [key: number]: number }>({});
    
    // Order History State
    const [historyFilterType, setHistoryFilterType] = useState<'ALL' | 'DATE' | 'MONTH'>('ALL');
    const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);

    const months = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    useEffect(() => {
        // Load user info from localStorage
        const storedUsername = localStorage.getItem('username');
        const storedShopName = localStorage.getItem('shopName');
        
        if (storedUsername) setUsername(storedUsername);
        if (storedShopName) setShopName(storedShopName);

        // Check time for banner
        const hour = new Date().getHours();
        setIsLate(hour >= 22);
    }, []);

    const filteredHistoryOrders = useMemo(() => {
        if (activeTab !== 'order_history') return [];
        let filtered = [...customerOrders];

        // Only show relevant statuses if needed, but for now show what backend returned as 'history'
        // If the backend returns all orders, we might want to filter out 'active' ones if 'order_history' only implies past.
        // But usually history implies 'all past records'.
        
        if (historyFilterType === 'DATE') {
            filtered = filtered.filter(o => o.createdAt.startsWith(selectedHistoryDate));
        } else if (historyFilterType === 'MONTH') {
            filtered = filtered.filter(o => o.createdAt.startsWith(selectedHistoryMonth));
        }
        
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [customerOrders, historyFilterType, selectedHistoryDate, selectedHistoryMonth, activeTab]);

    const handleLogout = async () => {
        try {
            // Call backend to delete refresh token from DB and clear cookies
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            localStorage.clear();
            router.push('/login');
        }
    };

    // Fallback images since backend doesn't have them yet
    const FALLBACK_IMAGES = [
        "https://images.unsplash.com/photo-1599818469888-038237cb71be?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1626202158826-62aad3056073?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1606329438965-0b7d0473ce4f?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1623334757620-3b036dd8b92b?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1621285853634-713b8dd6b5fd?q=80&w=600&auto=format&fit=crop",
    ];

    useEffect(() => {
        fetchProducts();
        if (activeTab === 'daily_orders' || activeTab === 'order_history') {
            fetchCustomerOrders();
        }
    }, [activeTab]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.get<Product[]>('/products');
            // Assign random images for visual appeal
            const productsWithImages = response.data.map((p, index) => ({
                ...p,
                image: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
                tag: index === 0 ? "Bestseller" : undefined 
            }));
            setProducts(productsWithImages);
        } catch (error) {
            console.error("Fetch products failed", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomerOrders = async () => {
        try {
            const response = await api.get<OrderResponse[]>('/orders');
            setCustomerOrders(response.data);
        } catch (error) {
            console.error("Fetch orders failed", error); // Optionally show toast
        }
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

    // Helper to format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    };

    const handleQuantityChange = (productId: number, delta: number) => {
        setInputQuantities(prev => {
            const current = prev[productId] || 1;
            const update = Math.max(1, current + delta);
            return { ...prev, [productId]: update };
        });
    };

    const addToCart = (product: Product) => {
        const qty = inputQuantities[product.id] || 1;
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item => 
                    item.productId === product.id 
                        ? { ...item, quantity: item.quantity + qty }
                        : item
                );
            }
            return [...prev, { 
                productId: product.id, 
                name: product.name, 
                price: product.priceTray, 
                quantity: qty 
            }];
        });
        
        // Reset input quantity
        setInputQuantities(prev => ({ ...prev, [product.id]: 1 }));
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const placeOrder = async () => {
        if (cart.length === 0) return;

        try {
            const payload = {
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                }))
            };

            await api.post('/orders', payload);
            alert("Siparişiniz başarıyla alındı!");
            setCart([]);
            setIsCartOpen(false);
            // If on orders tab, refresh
            if (activeTab === 'daily_orders') fetchCustomerOrders();
        } catch (error) {
            console.error("Order failed", error);
            alert("Sipariş oluşturulurken bir hata oluştu.");
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Filter orders
    // Today's orders: orders created today
    const today = new Date().toISOString().split('T')[0];
    const dailyOrders = customerOrders.filter(o => o.createdAt.startsWith(today));
    
    // Past orders: orders created before today or cancelled ones (excluding today's cancelled if logic requires, but usually all past is fine)
    // Actually user description: "siparişlerim bugunkü siparişleri göstersin, geçmş siparişlerim de bütün geçmiş siparişleri göstersin"
    // So 'daily_orders' -> today's orders (any status)
    // 'order_history' -> all orders before today
    const pastOrdersHistory = customerOrders.filter(o => !o.createdAt.startsWith(today));
    
    // Calculate daily stats
    const dailyTotalSpent = dailyOrders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalPrice, 0);
    const dailyOrderCount = dailyOrders.length;

    return (
        <div className="min-h-screen bg-gray-50 font-sans relative">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-500 text-white p-1 rounded font-bold text-xl cursor-default">⚡</div>
                        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight cursor-default mr-8">Böreksan</h1>

                        {/* Navigation Tabs */}
                        <div className="hidden md:flex space-x-1">
                            <button 
                                onClick={() => setActiveTab('market')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'market' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                🏪 Market
                            </button>
                            <button 
                                onClick={() => setActiveTab('daily_orders')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'daily_orders' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                📋 Siparişlerim (Bugün)
                            </button>
                            <button 
                                onClick={() => setActiveTab('order_history')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'order_history' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                📁 Geçmiş Siparişler
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors hover:cursor-pointer"
                        >
                            <span className="text-xl">🛒</span>
                            {cartItemCount > 0 && (
                                <span className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                                    {cartItemCount}
                                </span>
                            )}
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="h-10 w-10 rounded-full bg-orange-100 overflow-hidden border-2 border-orange-200 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 hover:cursor-pointer"
                            >
                                {username ? username.charAt(0).toUpperCase() : 'M'}
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                        <p className="text-sm font-bold text-gray-900">{username || "Misafir"}</p>
                                        <p className="text-xs text-gray-500 font-medium truncate">{shopName || "Börekçim"}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        Çıkış Yap
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero Banner */}
                {activeTab === 'market' && (
                <div className="relative rounded-2xl overflow-hidden bg-gray-900 text-white shadow-2xl mb-12">
                    <div className="absolute inset-0">
                         <img 
                            src={isLate 
                                ? "https://images.unsplash.com/photo-1485637701894-09ad422f6de6?q=80&w=2000&auto=format&fit=crop" // Night/closed theme
                                : "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=2000&auto=format&fit=crop" // Morning/pastry theme
                            } 
                            className="w-full h-full object-cover opacity-50 transition-opacity duration-700" 
                            alt="Banner" 
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                    </div>
                    
                    <div className="relative z-10 px-8 py-20 sm:px-20 text-center">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-wider mb-6 shadow-lg transform transition-all hover:scale-105 cursor-default ${isLate ? 'bg-red-600' : 'bg-green-600'}`}>
                            {isLate ? 'SİPARİŞ SAATİ GEÇTİ' : 'SİPARİŞ VAKTİ'}
                        </span>
                        
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-white drop-shadow-lg leading-tight">
                            {isLate 
                                ? "Bugünlük sipariş alımı kapandı." 
                                : "Sipariş saati dolmadan yetişin!"}
                        </h2>
                        
                        <p className="text-lg sm:text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto mb-10 font-light leading-relaxed">
                            {isLate 
                                ? "Saat 22:00'dan sonra vereceğiniz siparişler, yarın sabah değil, bir sonraki gün teslim programına dahil edilecektir." 
                                : "Yarın sabah taze teslimat için siparişinizi saat 22:00'a kadar oluşturun."}
                        </p>
                    </div>
                </div>
                )}

                {/* Mobile Tab Navigation */}
                <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2">
                    <button 
                        onClick={() => setActiveTab('market')}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold ${activeTab === 'market' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        🏪 Market
                    </button>
                    <button 
                        onClick={() => setActiveTab('daily_orders')}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold ${activeTab === 'daily_orders' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        📋 Siparişlerim
                    </button>
                    <button 
                        onClick={() => setActiveTab('order_history')}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold ${activeTab === 'order_history' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        📁 Geçmiş
                    </button>
                </div>

                {activeTab === 'market' && (
                <>
                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Taze Ürünler</h2>
                    <div className="flex flex-wrap gap-2">
                        {['All', 'Börekler', 'Tatlılar', 'Diğer'].map((cat, i) => (
                            <button 
                                key={cat} 
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                categoryFilter === cat 
                                ? 'bg-gray-900 text-white shadow-md' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                {loading ? (
                     <div className="flex justify-center py-20">
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                     </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full overflow-hidden group">
                            <div className="relative h-48 overflow-hidden bg-gray-100">
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    {product.tag && (
                                        <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-md">
                                            {product.tag}
                                        </span>
                                    )}
                            </div>
                            <div className="p-5 flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{product.name}</h3>
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description || "Lezzetli günlük taze ürün."}</p>
                                    
                                    <div className="mt-auto pt-4 border-t border-gray-50">
                                        <div className="flex items-baseline gap-1 mb-4">
                                            <span className="text-xl font-bold text-orange-600">{product.priceTray} ₺</span>
                                            <span className="text-xs text-gray-400 font-medium">/ Tepsi</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 h-9">
                                                <button 
                                                    onClick={() => handleQuantityChange(product.id, -1)}
                                                    className="px-3 h-full text-gray-600 hover:bg-gray-200 font-bold transition-colors rounded-l-lg"
                                                >-</button>
                                                <input 
                                                    type="number"
                                                    min="1"
                                                    value={inputQuantities[product.id] || 1}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (!isNaN(val) && val >= 1) {
                                                            setInputQuantities(prev => ({ ...prev, [product.id]: val }));
                                                        }
                                                    }}
                                                    className="w-12 text-center bg-transparent border-none focus:ring-0 text-sm font-medium p-0 h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button 
                                                    onClick={() => handleQuantityChange(product.id, 1)}
                                                    className="px-3 h-full text-gray-600 hover:bg-gray-200 font-bold transition-colors rounded-r-lg"
                                                >+</button>
                                            </div>
                                            <button 
                                                onClick={() => addToCart(product)}
                                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-orange-200 shadow-md hover:shadow-lg hover:cursor-pointer"
                                            >
                                                <span>🛒</span> Ekle
                                            </button>
                                        </div>
                                    </div>
                            </div>
                            </div>
                        ))}
                    </div>
                )}
                </>
                )}

                {activeTab === 'daily_orders' && (
                     <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Daily Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-sm font-medium text-gray-500">Bugünkü Sipariş Adedi</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-2">{dailyOrderCount} <span className="text-sm font-normal text-gray-400">Tepsi</span></p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-sm font-medium text-gray-500">Bugünkü Harcama</p>
                                <p className="text-3xl font-extrabold text-orange-600 mt-2">{dailyTotalSpent.toLocaleString('tr-TR')} ₺</p>
                            </div>
                        </div>

                        {/* Daily Orders List */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg text-lg">📅</span> 
                                Bugünün Siparişleri
                            </h3>
                            
                            {dailyOrders.length === 0 ? (
                                <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
                                    <div className="text-4xl mb-4">🍽️</div>
                                    <h3 className="text-lg font-bold text-gray-900">Henüz siparişiniz yok</h3>
                                    <p className="text-gray-500 mt-1">Bugün için taze lezzetlerden sipariş verebilirsiniz.</p>
                                    <button 
                                        onClick={() => setActiveTab('market')}
                                        className="mt-6 px-6 py-2 bg-orange-600 text-white rounded-full font-bold shadow-md hover:bg-orange-700 transition"
                                    >
                                        Hemen Sipariş Ver
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                {dailyOrders.map(order => (
                                    <div key={order.id} className="bg-white rounded-xl border border-orange-100 p-6 shadow-sm relative overflow-hidden">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${order.status === 'CANCELLED' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-lg font-bold text-gray-900">#{order.id}</span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                                        {order.status === 'WAITING' ? 'Onay Bekliyor' :
                                                         order.status === 'PREPARING' ? 'Hazırlanıyor' :
                                                         order.status === 'ON_WAY' ? 'Yolda' : 
                                                         order.status === 'DELIVERED' ? 'Teslim Edildi' : 'İptal'}
                                                    </span>
                                                </div>
                                                <p className="text-gray-500 text-sm mt-1">{formatDate(order.createdAt)}</p>
                                            </div>
                                            
                                            <div className="flex-1 md:px-8">
                                                <div className="flex flex-wrap gap-2">
                                                    {order.items.map((item, idx) => (
                                                        <span key={idx} className="bg-gray-50 text-gray-700 px-3 py-1 rounded-lg text-sm border border-gray-200">
                                                            {item.quantity}x {item.productName}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-gray-900">{order.totalPrice} ₺</p>
                                                <p className="text-xs text-gray-400">Toplam Tutar</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {activeTab === 'order_history' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                         {/* Past Orders History */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <span className="bg-gray-100 text-gray-600 p-1.5 rounded-lg text-lg">📁</span> 
                                    Geçmiş Sipariş Kayıtları
                                </h3>
                                
                                {/* Filters */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={() => setHistoryFilterType('ALL')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                            historyFilterType === 'ALL' 
                                            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        }`}
                                    >
                                        Tümü
                                    </button>
                                    <button
                                        onClick={() => setHistoryFilterType('DATE')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                            historyFilterType === 'DATE' 
                                            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        }`}
                                    >
                                        Güne Göre
                                    </button>
                                    <button
                                        onClick={() => setHistoryFilterType('MONTH')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                            historyFilterType === 'MONTH' 
                                            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        }`}
                                    >
                                        Ay'a Göre
                                    </button>
                                </div>
                            </div>

                            {/* Date/Month Pickers */}
                            {(historyFilterType === 'DATE' || historyFilterType === 'MONTH') && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-gray-700">
                                            {historyFilterType === 'DATE' ? 'Tarih Seçin:' : 'Ay Seçin:'}
                                        </span>
                                        <input 
                                            type={historyFilterType === 'DATE' ? 'date' : 'month'}
                                            value={historyFilterType === 'DATE' ? selectedHistoryDate : selectedHistoryMonth}
                                            onChange={(e) => {
                                                if (historyFilterType === 'DATE') setSelectedHistoryDate(e.target.value);
                                                else setSelectedHistoryMonth(e.target.value);
                                            }}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div className="text-sm text-gray-500 font-medium">
                                    {historyFilterType === 'ALL' && 'Tüm zamanların kayıtları listeleniyor'}
                                    {historyFilterType === 'DATE' && `${selectedHistoryDate} tarihli kayıtlar listeleniyor`}
                                    {historyFilterType === 'MONTH' && `${months[parseInt(selectedHistoryMonth.split('-')[1]) - 1]} ${selectedHistoryMonth.split('-')[0]} dönemi kayıtları listeleniyor`}
                                </div>
                                <div className="text-sm font-bold bg-orange-50 text-orange-700 px-3 py-1 rounded-full border border-orange-100">
                                    {filteredHistoryOrders.length} Kayıt
                                </div>
                            </div>
                            
                            {filteredHistoryOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                                    <span className="text-4xl mb-3 opacity-20">📅</span>
                                    <p className="text-gray-500 font-medium">Bu kriterlere uygun kayıt bulunamadı.</p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-left text-sm text-gray-600">
                                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-900">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Sipariş No</th>
                                                <th className="px-6 py-4 font-bold">Tarih</th>
                                                <th className="px-6 py-4 font-bold">İçerik Özeti</th>
                                                <th className="px-6 py-4 font-bold text-right">Tutar</th>
                                                <th className="px-6 py-4 font-bold text-center">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {filteredHistoryOrders.map(order => (
                                                <tr 
                                                    key={order.id} 
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="hover:bg-orange-50/50 transition-colors group cursor-pointer relative"
                                                >
                                                    <td className="px-6 py-4 font-mono font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                                                        #{order.id}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="block text-gray-900 font-medium whitespace-nowrap">{formatDate(order.createdAt)}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            {order.items.slice(0, 4).map((item, i) => (
                                                                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                                                    <span className="flex-shrink-0 bg-white border border-gray-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold shadow-sm">
                                                                        {item.quantity}x
                                                                    </span>
                                                                    <span className="truncate max-w-[200px] font-medium" title={item.productName}>{item.productName}</span>
                                                                </div>
                                                            ))}
                                                            {order.items.length > 4 && (
                                                                <span className="text-xs text-gray-400 pl-1 font-bold">
                                                                    +{order.items.length - 4} diğer ürün...
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                        {order.totalPrice} ₺
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                                            {order.status === 'WAITING' ? 'Bekliyor' :
                                                             order.status === 'PREPARING' ? 'Hazırlanıyor' :
                                                             order.status === 'ON_WAY' ? 'Yolda' :
                                                             order.status === 'DELIVERED' ? 'Teslim' : 'İptal'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedOrder(null)}
                    ></div>
                    
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Sipariş Detayı</h3>
                                <p className="text-sm text-gray-500 font-mono">#{selectedOrder.id} • {formatDate(selectedOrder.createdAt)}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedOrder(null)}
                                className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 flex items-center justify-center transition-colors hover:cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {/* Status Bar */}
                            <div className={`flex items-center justify-between mb-8 p-4 rounded-xl border ${
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
                                    }`}>DURUM</p>
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
                                    <p className="text-2xl font-black text-gray-900">{selectedOrder.totalPrice} ₺</p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>📦</span> Sipariş İçeriği
                            </h4>
                            <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Ürün</th>
                                            <th className="px-4 py-3 text-center">Tepsi</th>
                                            <th className="px-4 py-3 text-right">Birim Fiyat</th>
                                            <th className="px-4 py-3 text-right">Ara Toplam</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {selectedOrder.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                                                <td className="px-4 py-3 text-center bg-gray-50/50 font-mono text-gray-600">x{item.quantity}</td>
                                                <td className="px-4 py-3 text-right text-gray-500">{item.unitPrice} ₺</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">{item.subTotal} ₺</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t border-gray-100">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-600">Genel Toplam</td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900 text-lg">{selectedOrder.totalPrice} ₺</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Shop/Info Card */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">FİRMA</p>
                                        <p className="font-medium text-gray-900">{selectedOrder.shopName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">MÜŞTERİ</p>
                                        <p className="font-medium text-gray-900">{selectedOrder.customerName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button 
                                onClick={() => setSelectedOrder(null)}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors hover:cursor-pointer"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Sidebar / Modal */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
                    
                    {/* Sidebar */}
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">Sepetim ({cartItemCount})</h2>
                            <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <span className="text-4xl block mb-2">🛒</span>
                                    <p>Sepetiniz şu an boş.</p>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.productId} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="h-16 w-16 bg-white rounded-lg flex items-center justify-center text-2xl shadow-sm">
                                            🥐
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">{item.name}</h4>
                                            <p className="text-sm text-gray-500">{item.price} ₺ x {item.quantity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">{item.price * item.quantity} ₺</p>
                                            <button 
                                                onClick={() => removeFromCart(item.productId)}
                                                className="text-xs text-red-500 font-medium hover:underline mt-1 hover:cursor-pointer"
                                            >
                                                Kaldır
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 bg-white">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-gray-500 font-medium">Toplam Tutar</span>
                                <span className="text-3xl font-extrabold text-gray-900">{cartTotal} ₺</span>
                            </div>
                            <button 
                                onClick={placeOrder}
                                disabled={cart.length === 0}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-200 transition-all active:scale-[0.98] hover:cursor-pointer"
                            >
                                Siparişi Onayla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="mt-20 border-t border-gray-200 py-10 bg-white">
                <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
                    <p>&copy; 2026 Boreksan Toptan Satış. Tüm hakları saklıdır.</p>
                </div>
            </footer>
        </div>
    );
};

export default CustomerDashboard;
