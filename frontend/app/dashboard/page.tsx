"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import CustomerDashboard from "@/components/dashboard/CustomerDashboard";
import api from "@/lib/axios";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'ADMIN' | 'CUSTOMER'>('CUSTOMER');

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole"); // "ADMIN" or "CUSTOMER"

    if (!token) {
        router.push("/login"); // Redirect to login if not authenticated
    } else {
        if (role === 'ADMIN') {
            setUserRole('ADMIN');
        } else {
            setUserRole('CUSTOMER');
        }
        setLoading(false);
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout"); 
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-500">Yükleniyor...</h1>
      </div>
    );
  }

  return (
    <div className="relative">
        {/* Dashboard Rendering based on Role */}
        {userRole === 'ADMIN' ? (
            <AdminDashboard />
        ) : (
            <CustomerDashboard />
        )}
    </div>
  );
}
