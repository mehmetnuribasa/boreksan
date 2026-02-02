"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        setIsAuthenticated(true);
        router.push("/dashboard");
    }
    setLoading(false);
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      localStorage.removeItem("accessToken");
      setIsAuthenticated(false);
      // router.push("/login"); // Stay on home or go to login
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-500">Yükleniyor...</h1>
      </div>
    );
  }

  // If authenticated, we are redirecting, so maybe show loading or nothing
  if (isAuthenticated) {
      return null; 
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-white">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex border-b pb-6 mb-6">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 text-black">
          Böreksan Sipariş Sistemi
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white lg:static lg:h-auto lg:w-auto lg:bg-none">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              Çıkış Yap
            </button>
          ) : (
            <div className="space-x-4">
              <Link
                href="/login"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                Kayıt Ol <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Taze ve Lezzetli Börekler
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Sipariş vermek için hemen giriş yapın veya kayıt olun.
        </p>
        
        {isAuthenticated && (
           <div className="mt-10 flex items-center justify-center gap-x-6">
             <Link
               href="/dashboard" 
               className="rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
             >
               Panele Git
             </Link>
           </div>
        )}
      </div>
    </main>
  );
}