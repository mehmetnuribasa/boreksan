import React from 'react';

const CustomerDashboard = () => {
    const products = [
        { id: 1, name: "Su Böreği (Cheese)", desc: "Authentic water pastry with feta cheese.", price: "550 TL", unit: "/ Tray", tag: "Bestseller", image: "https://images.unsplash.com/photo-1599818469888-038237cb71be?q=80&w=600&auto=format&fit=crop" },
        { id: 2, name: "Kıymalı Börek", desc: "Savory minced meat filling with herbs.", price: "500 TL", unit: "/ Tray", image: "https://images.unsplash.com/photo-1626202158826-62aad3056073?q=80&w=600&auto=format&fit=crop" },
        { id: 3, name: "Patatesli Kol Böreği", desc: "Spiced potato filling in arm-shaped rolls.", price: "480 TL", unit: "/ Tray", image: "https://images.unsplash.com/photo-1606329438965-0b7d0473ce4f?q=80&w=600&auto=format&fit=crop" },
        { id: 4, name: "Simit Tray (20pcs)", desc: "Freshly baked sesame bagels.", price: "300 TL", unit: "/ Pack", image: "https://images.unsplash.com/photo-1623334757620-3b036dd8b92b?q=80&w=600&auto=format&fit=crop" },
        { id: 5, name: "Tahini Roll (Tahinli)", desc: "Sweet tahini and walnut swirl buns.", price: "420 TL", unit: "/ Tray", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop" },
        { id: 6, name: "Spinach & Feta Börek", desc: "Classic spinach filling with white cheese.", price: "520 TL", unit: "/ Tray", image: "https://images.unsplash.com/photo-1621285853634-713b8dd6b5fd?q=80&w=600&auto=format&fit=crop" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-500 text-white p-1 rounded font-bold text-xl">⚡</div>
                        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Boreksan</h1>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="bg-gray-100 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hidden sm:block">
                            Welcome, <span className="text-gray-900 font-bold">Golden Crumb Bakery</span>
                        </div>
                        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <span className="text-xl">🛒</span>
                            <span className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">2</span>
                        </button>
                        <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden border-2 border-orange-100">
                             <img src="https://ui-avatars.com/api/?name=Golden+Crumb&background=orange&color=fff" alt="Profile" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero Banner */}
                <div className="relative rounded-2xl overflow-hidden bg-gray-900 text-white shadow-2xl mb-12">
                    <div className="absolute inset-0">
                         <img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=2000&auto=format&fit=crop" className="w-full h-full object-cover opacity-50" alt="Banner" />
                    </div>
                    <div className="relative z-10 px-8 py-16 sm:px-16 text-center">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-orange-500 text-white text-xs font-bold uppercase tracking-wider mb-6 shadow-lg">
                            Action Required
                        </span>
                        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white drop-shadow-md">
                            Order deadline is 22:00
                        </h2>
                        <p className="text-lg sm:text-xl text-gray-200 max-w-2xl mx-auto mb-8 font-light">
                            Place your order now to guarantee fresh delivery for tomorrow morning.
                        </p>
                        <button className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition transform hover:scale-105 shadow-xl">
                            View Menu
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Fresh Pastries</h2>
                    <div className="flex flex-wrap gap-2">
                        {['All', 'Savory Börek', 'Sweet Pastries', 'Drinks'].map((cat, i) => (
                            <button key={cat} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                i === 0 
                                ? 'bg-gray-900 text-white shadow-md' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden group">
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
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.desc}</p>
                                
                                <div className="mt-auto pt-4 border-t border-gray-50">
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-xl font-bold text-orange-600">{product.price}</span>
                                        <span className="text-xs text-gray-400 font-medium">{product.unit}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                                            <button className="px-3 py-1 text-gray-600 hover:bg-gray-200 font-bold">-</button>
                                            <span className="text-sm font-medium w-4 text-center">1</span>
                                            <button className="px-3 py-1 text-gray-600 hover:bg-gray-200 font-bold">+</button>
                                        </div>
                                        <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                            <span>🛒</span> Add
                                        </button>
                                    </div>
                                </div>
                           </div>
                        </div>
                    ))}
                </div>
            </main>

             <footer className="mt-20 border-t border-gray-200 py-10 bg-white">
                <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
                    <p>&copy; 2024 Boreksan Wholesale. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default CustomerDashboard;
