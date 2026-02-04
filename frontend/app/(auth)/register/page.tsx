"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    shopName: "",
    phone: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validations
    if (formData.username.trim() === "") {
      setError("Kullanıcı adı boş olamaz.");
      setLoading(false);
      return;
    }

    //Password validations
    if (formData.password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      setLoading(false);
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError("Şifre en az bir büyük harf içermelidir.");
      setLoading(false);
      return;
    }
    if (!/[a-z]/.test(formData.password)) {
      setError("Şifre en az bir küçük harf içermelidir.");
      setLoading(false);
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError("Şifre en az bir rakam içermelidir.");
      setLoading(false);
      return;
    }
    if (!/[!@#$%^&*.,<>?\/\\|:;'"(){}\[\]_+=~`-]/.test(formData.password)) {
      setError("Şifre en az bir özel karakter (sembol) içermelidir.");
      setLoading(false);
      return;
    }

    // Phone number validation (Turkish format)
    const phoneRegex = /^05\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("Geçerli bir telefon numarası giriniz (Örn: 05551234567).");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/register", formData);
      const { accessToken, role, username } = response.data;

      // Store Access Token and user info in localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userRole", role);
      localStorage.setItem("username", username);

      // Redirect to dashboard after successful registration
      alert("Kayıt başarılı!");
      router.push("/dashboard");
    } catch (err: any) {
      if (err.response && err.response.data) {
        // Display validation errors from backend if available
        if (err.response.data.validation_errors) {
            const firstErrorKey = Object.keys(err.response.data.validation_errors)[0];
            const firstErrorMessage = err.response.data.validation_errors[firstErrorKey];
            setError(`${err.response.data.message}\n${firstErrorMessage}`);
        } else if (err.response.data.message) {
            // General error message
            setError(err.response.data.message);
        } else if (err.response.data.error) {
           setError(err.response.data.error);
        } else {
           setError("Kayıt işlemi başarısız. Lütfen tekrar deneyin.");
        }
      } else {
        setError("Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-20 w-20 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-red-100 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
        </div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-gray-900">
          Böreksan <span className="text-red-600">Ailesine Katılın</span>
        </h2>
        <p className="mt-3 text-center text-sm text-gray-500">
          Siparişlerinizi yönetmek için yeni bir hesap oluşturun
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-900">
                Kullanıcı Adı
              </label>
              <div className="mt-2">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all duration-200"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="shopName" className="block text-sm font-medium leading-6 text-gray-900">
                Dükkan Adı
              </label>
              <div className="mt-2">
                <input
                  id="shopName"
                  name="shopName"
                  type="text"
                  required
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all duration-200"
                  value={formData.shopName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-900">
                Telefon Numarası
              </label>
              <div className="mt-2">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="05551234567"
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all duration-200"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium leading-6 text-gray-900">
                Adres
              </label>
              <div className="mt-2">
                <textarea
                  id="address"
                  name="address"
                  required
                  rows={3}
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all duration-200"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                Şifre <span className="text-xs text-gray-500 font-normal">(En az 8 karakter, Büyük, Küçük, Rakam, Sembol)</span>
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all duration-200"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Kayıt Hatası</h3>
                    <div className="mt-2 text-sm text-red-700 whitespace-pre-line">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`flex w-full justify-center rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-3 py-3 text-sm font-bold leading-6 text-white shadow-lg hover:to-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-all duration-200 transform hover:scale-[1.02] ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Kaydediliyor..." : "Kayıt Ol"}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Zaten hesabın var mı?{" "}
            <Link
              href="/login"
              className="font-semibold leading-6 text-red-600 hover:text-red-500 transition-colors"
            >
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
