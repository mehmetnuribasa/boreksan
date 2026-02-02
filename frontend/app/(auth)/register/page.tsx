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

    // Validasyonlar (Backend zaten yapıyor ama UI için de iyi olur)
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

    // Telefon numarası doğrulama (05 ile başlayan 11 haneli numara)
    const phoneRegex = /^05\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("Geçerli bir telefon numarası giriniz (Örn: 05551234567).");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/register", formData);
      const { accessToken } = response.data;

      // Access Token'ı sakla
      localStorage.setItem("accessToken", accessToken);

      // Başarılı kayıt sonrası yönlendir
      alert("Kayıt başarılı!");
      router.push("/");
    } catch (err: any) {
      if (err.response && err.response.data) {
        // Validation hatası varsa detayları göster
        if (err.response.data.validation_errors) {
            // Örn: İlk validation hatasını mesajın sonuna ekleyelim
            const firstErrorKey = Object.keys(err.response.data.validation_errors)[0];
            const firstErrorMessage = err.response.data.validation_errors[firstErrorKey];
            setError(`${err.response.data.message}\n${firstErrorMessage}`);
        } else if (err.response.data.message) {
            // Standart hata mesajı
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
    <div>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          Yeni Hesap Oluştur
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Zaten hesabın var mı?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Giriş yap
          </Link>
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-md shadow-sm">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Kullanıcı Adı
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
              value={formData.username}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
              Dükkan Adı
            </label>
            <input
              id="shopName"
              name="shopName"
              type="text"
              required
              className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
              value={formData.shopName}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Telefon Numarası
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="05551234567"
              className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Adres
            </label>
            <textarea
              id="address"
              name="address"
              required
              rows={3}
              className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
              value={formData.address}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Şifre (En az 8 karakter, Büyük, Küçük, Rakam, Sembol)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </div>
      </form>
    </div>
  );
}
