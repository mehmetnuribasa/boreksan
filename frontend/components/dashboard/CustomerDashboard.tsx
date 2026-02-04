import React, { useEffect, useState, useMemo } from 'react';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';

interface Product {
    id: number;
    name: string;
    description: string;
    priceTray: number;
    pricePortion?: number;
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
    const [activeTab, setActiveTab] = useState<'market' | 'all_orders' | 'products_view'>('all_orders');
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
        if (activeTab === 'all_orders') {
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
            case 'PREPARING': return 'bg-red-100 text-red-800';
            case 'ON_WAY': return 'bg-blue-100 text-blue-800';
            case 'DELIVERED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-gray-100 text-gray-800';
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
            if (activeTab === 'all_orders') fetchCustomerOrders();
        } catch (error) {
            console.error("Order failed", error);
            alert("Sipariş oluşturulurken bir hata oluştu.");
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Unified order filtering
    const filteredHistoryOrders = customerOrders.filter(order => {
        if (historyFilterType === 'ALL') return true;
        if (historyFilterType === 'DATE') return order.createdAt.startsWith(selectedHistoryDate);
        if (historyFilterType === 'MONTH') return order.createdAt.startsWith(selectedHistoryMonth);
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 font-sans relative">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        {/* Logo */}
                        <div className="flex items-center gap-3 group cursor-default">
                             <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-red-200 shadow-lg group-hover:shadow-red-300 transition-all duration-300 group-hover:scale-105">
                                <span className="text-white font-black text-xl">B</span>
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Böreksan</h1>
                        </div>

                        {/* Navigation Tabs - Modern Segmented Control Style */}
                        <div className="hidden md:flex items-center">
                            {[
                                { id: 'all_orders', label: 'Siparişler', icon: (active: boolean) => <svg className={`w-4 h-4 ${active ? 'fill-current' : 'stroke-current'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active?0:2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
                                { id: 'products_view', label: 'Fiyat Listesi', icon: (active: boolean) => <svg className={`w-4 h-4 ${active ? 'fill-current' : 'stroke-current'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active?0:2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
                                { id: 'market', label: 'Market', icon: (active: boolean) => <svg className={`w-4 h-4 ${active ? 'fill-current' : 'stroke-current'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active?0:2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg> }
                            ].map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button 
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-2 px-5 py-2 text-sm font-bold transition-all duration-300 relative overflow-hidden${
                                            isActive 
                                            ? 'text-gray-900 border-b-2 border-gray-300' 
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 hover:cursor-pointer'
                                        }`}
                                    >
                                        {tab.icon(isActive)}
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {/* Cart Button */}
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            className="group relative h-11 w-11 flex items-center justify-center text-gray-500 rounded-full transition-all hover:scale-105 active:scale-95 hover:cursor-pointer"
                        >
                            <span className="text-xl">🛒</span>
                            {cartItemCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-red-100 animate-pulse">
                                    {cartItemCount}
                                </span>
                            )}
                        </button>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="h-11 pl-1 pr-4 flex items-center gap-3 transition-all active:scale-95 group hover:cursor-pointer"
                            >
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center text-red-600 font-bold border border-red-50 transition-transform">
                                    {username ? username.charAt(0).toUpperCase() : 'M'}
                                </div>
                                <div className="hidden sm:flex flex-col items-start">
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 leading-none">
                                        {username || "Misafir"}
                                    </span>
                                </div>
                                <svg className={`w-4 h-4 text-gray-400 group-hover:text-red-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl py-2 border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
                                    <div className="px-5 py-3 border-b border-gray-50 mb-1">
                                        <p className="text-sm font-bold text-gray-900">{username || "Misafir"}</p>
                                        <p className="text-xs text-gray-400 font-bold tracking-wide uppercase mt-0.5">{shopName || "Börekçim"}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50/50 font-bold flex items-center gap-3 transition-colors group hover:cursor-pointer"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        </div>
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
                        onClick={() => setActiveTab('all_orders')}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold ${activeTab === 'all_orders' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        📁 Tüm Siparişler
                    </button>
                    <button 
                        onClick={() => setActiveTab('market')}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold ${activeTab === 'market' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        🏪 Market
                    </button>
                    <button 
                        onClick={() => setActiveTab('products_view')}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold ${activeTab === 'products_view' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        📋 Ürün Listesi
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
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
                                            <span className="text-xl font-bold text-red-600">{product.priceTray} ₺</span>
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
                                                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-red-200 shadow-md hover:shadow-lg hover:cursor-pointer"
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


                

                {activeTab === 'all_orders' && (() => {
                    // Pre-calculate totals for the header stats
                    const currentMonthOrders = customerOrders.filter(o => 
                        o.createdAt.startsWith(selectedHistoryMonth) && 
                        o.status !== 'CANCELLED'
                    );
                    const currentMonthTotal = currentMonthOrders.reduce((acc, o) => acc + o.totalPrice, 0);

                    // Find favorite product
                    const productStats: Record<string, number> = {};
                    currentMonthOrders.flatMap(o => o.items).forEach(item => {
                        productStats[item.productName] = (productStats[item.productName] || 0) + item.quantity;
                    });
                    const favoriteProduct = Object.entries(productStats).sort(([,a], [,b]) => b - a)[0];

                    // Find last active order
                    const lastOrder = customerOrders.length > 0 ? customerOrders[customerOrders.length - 1] : null;

                    return (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Dashboard Header / Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Total Debt Card */}
                                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg shadow-red-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 text-red-100 text-sm font-medium mb-2">
                                            <span className="p-1 bg-white/20 rounded text-xs">💰</span>
                                            Güncel Borç Bakiyesi
                                        </div>
                                        <div className="text-4xl font-bold tracking-tight mb-1">
                                            {currentMonthTotal.toLocaleString('tr-TR')} <span className="text-2xl font-normal opacity-80">₺</span>
                                        </div>
                                        <div className="text-red-100/80 text-xs font-medium flex items-center justify-between mt-4 border-t border-white/20 pt-3">
                                            <span>
                                                {selectedHistoryMonth.split('-')[0]} - {months[parseInt(selectedHistoryMonth.split('-')[1]) - 1]} Dönemi
                                            </span>
                                            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Ödenmedi</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Shop & User Info Card */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden hover:border-red-100 transition-colors duration-300">
                                    <div className="flex items-start justify-between">
                                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">HESAP BİLGİLERİ</span>
                                        <span className="text-2xl">🏪</span>
                                    </div>
                                    <div>
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-md font-bold text-gray-900">{shopName || "Börekçim"}</span>
                                            <span className="text-s text-gray-500 font-medium">{username || "Misafir"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                AKTİF ÜYE
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Favorite Product Card */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center hover:border-blue-100 transition-colors duration-300">
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">EN ÇOK TERCİH ETTİĞİNİZ</span>
                                        <span className="text-2xl">🏆</span>
                                    </div>
                                    {favoriteProduct ? (
                                        <>
                                            <div className="text-2xl font-bold text-gray-900 truncate" title={favoriteProduct[0]}>
                                                {favoriteProduct[0]}
                                            </div>
                                            <div className="mt-2 text-sm text-gray-500 font-medium flex items-center gap-2">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                                                    {favoriteProduct[1]} Tepsi
                                                </span>
                                                <span className="text-xs text-gray-400">bu ay sipariş edildi</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-gray-400 text-sm font-medium">Henüz veri yok.</div>
                                    )}
                                </div>
                            </div>

                            {/* Monthly Order Matrix Report */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden flex flex-col h-[calc(100vh-120px)]">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <span className="bg-gray-100 text-gray-600 p-1.5 rounded-lg text-lg">🗓️</span> 
                                        Aylık Sipariş Raporu
                                    </h3>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-500">
                                            {months[parseInt(selectedHistoryMonth.split('-')[1]) - 1]} ayı görüntüleniyor
                                        </div>
                                        <input 
                                            type="month"
                                            value={selectedHistoryMonth}
                                            onChange={(e) => setSelectedHistoryMonth(e.target.value)}
                                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 hover:cursor-pointer shadow-sm hover:border-gray-300 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-auto flex-1 relative bg-white border border-gray-100 rounded-xl custom-scrollbar">
                                    <table className="w-full text-center border-collapse">
                                        <thead className="bg-white sticky top-0 z-40 shadow-sm">
                                            <tr>
                                                <th className="py-4 px-6 text-left min-w-[150px] bg-white text-gray-400 text-[10px] font-bold uppercase tracking-widest sticky left-0 z-50 border-b border-gray-100">
                                                    TARİH
                                                </th>
                                                {products.map(p => (
                                                    <th key={p.id} className="py-4 px-2 min-w-[80px] bg-white border-b border-gray-100 text-gray-400 text-[10px] font-bold uppercase tracking-widest" title={p.name}>
                                                        {p.name}
                                                    </th>
                                                ))}
                                                <th className="py-4 px-4 bg-white border-b border-gray-100 min-w-[100px] text-gray-400 text-[10px] font-bold uppercase tracking-widest">TUTAR</th>
                                                <th className="py-4 px-4 bg-white border-b border-gray-100 min-w-[100px] text-gray-400 text-[10px] font-bold uppercase tracking-widest">ÖDENEN</th>
                                                <th className="py-4 px-4 bg-white border-b border-gray-100 min-w-[100px] text-gray-400 text-[10px] font-bold uppercase tracking-widest">KALAN</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50/50">
                                            {(() => {
                                                const year = parseInt(selectedHistoryMonth.split('-')[0]);
                                                const month = parseInt(selectedHistoryMonth.split('-')[1]);
                                                const daysInMonth = new Date(year, month, 0).getDate();
                                                const rows = [];
                                                
                                                // Aggregates for footer
                                                const colTotals: Record<string, number> = {};
                                                let totalAmount = 0;

                                                const now = new Date();
                                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                                                for (let d = 1; d <= daysInMonth; d++) {
                                                    const currentDate = new Date(year, month - 1, d);
                                                    const isFuture = currentDate > today;
                                                    const currentIso = `${selectedHistoryMonth}-${d.toString().padStart(2, '0')}`;
                                                    const dateStr = d + ' ' + currentDate.toLocaleString('tr-TR', {month: 'long'});
                                                    
                                                    const dayOrders = customerOrders.filter(o => 
                                                        o.createdAt.startsWith(currentIso) && 
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
                                                            id: dayOrders[0].id, 
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
                                                            className={`hover:bg-gray-50 transition-colors group ${dailyTotal > 0 ? 'cursor-pointer hover:bg-blue-50/10' : ''}`}
                                                        >
                                                            <td className="py-4 px-6 text-left text-sm font-medium text-gray-600 sticky left-0 z-30 bg-white group-hover:bg-gray-50 transition-colors flex items-center gap-3 border-r border-transparent group-hover:border-gray-100">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${dailyTotal > 0 ? 'bg-red-500' : 'bg-gray-200'}`}></span>
                                                                {dateStr}
                                                            </td>
                                                            {products.map(p => {
                                                                const count = productCounts[p.name];
                                                                const displayValue = count ? count : (isFuture ? '' : '0');
                                                                const styleClass = count 
                                                                    ? "font-bold text-gray-800" 
                                                                    : "font-medium text-gray-300";
                                                                    
                                                                return (
                                                                    <td key={p.id} className={`py-4 px-2 text-sm ${styleClass}`}>
                                                                        {displayValue}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="py-4 px-4 text-sm font-bold text-red-600 text-center">
                                                                {dailyTotal > 0 ? `${dailyTotal.toLocaleString('tr-TR')} ₺` : (isFuture ? '' : <span className="text-gray-200">0</span>)}
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
                                                        <tr className="bg-gray-50 border-t border-gray-100 sticky bottom-0 z-40 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.05)]">
                                                            <td className="py-6 px-6 text-left sticky left-0 bottom-0 z-50 bg-gray-50 text-gray-900 text-xs font-bold uppercase tracking-widest">
                                                                GENEL TOPLAM
                                                            </td>
                                                            {products.map(p => (
                                                                <td key={p.id} className="py-6 px-2 text-gray-900 font-bold text-lg bg-gray-50">
                                                                    {colTotals[p.name] || 0}
                                                                </td>
                                                            ))}
                                                            <td className="py-6 px-4 text-center font-bold text-red-600 text-lg bg-gray-50">
                                                                {totalAmount.toLocaleString('tr-TR')} ₺
                                                            </td>
                                                            <td className="py-6 px-4 text-center font-bold text-green-600 text-lg bg-gray-50">
                                                                0 ₺
                                                            </td>
                                                            <td className="py-6 px-4 text-center font-bold text-orange-600 text-lg bg-gray-50">
                                                                {totalAmount.toLocaleString('tr-TR')} ₺
                                                            </td>
                                                        </tr>
                                                    </>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })()}
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
                                <h3 className="text-lg font-bold text-gray-900">
                                    {new Date(selectedOrder.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} Özeti
                                </h3>
                                <p className="text-sm text-gray-500 font-bold">
                                    Günlük Toplam Sipariş Dökümü
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedOrder(null)}
                                className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all hover:cursor-pointer"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {/* Status Bar */}
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">FİRMA</p>
                                    <p className="font-bold text-gray-900 text-lg">{selectedOrder.shopName}</p>
                                    <p className="text-gray-500 text-xs mt-1 font-medium">{selectedOrder.customerName}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-center items-end text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">TOPLAM TUTAR</p>
                                    <p className="font-bold text-gray-900 text-2xl">{selectedOrder.totalPrice.toLocaleString('tr-TR')} ₺</p>
                                </div>
                            </div>

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
                        </div>

                    </div>
                </div>
            )}


            {activeTab === 'products_view' && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="bg-red-50 text-red-600 p-1.5 rounded-lg text-lg">📋</span> 
                            Ürün Fiyat Listesi
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Dükkanınız için sipariş verebileceğiniz tüm ürünlerin güncel fiyat listesi.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                             <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group">
                                {/* Image Section */}
                                <div className="h-40 bg-gray-50 relative overflow-hidden flex items-center justify-center border-b border-gray-50">
                                    <div className="text-5xl opacity-80 transition-transform duration-300 group-hover:scale-110">
                                        {product.name.toLowerCase().includes('su') ? '🥟' : 
                                         product.name.toLowerCase().includes('küt') ? '🥧' : 
                                         product.name.toLowerCase().includes('kol') ? '🥨' : '🥐'}
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
                                            <p className="text-lg font-bold text-red-600">{product.pricePortion ? `${product.pricePortion} ₺` : '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-red-200 transition-all active:scale-[0.98] hover:cursor-pointer"
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
