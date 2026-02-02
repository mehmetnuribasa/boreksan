import axios from 'axios';

// 1. Temel Axios Örneği Oluştur
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Cookie (Refresh Token) gönderimi için ŞART!
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. İstek Atmadan Önce Araya Gir (Request Interceptor)
api.interceptors.request.use(
  (config) => {
    // Tarayıcı hafızasından Access Token'ı al (birazdan oraya kaydedeceğiz)
    const token = localStorage.getItem('accessToken');
    
    // Eğer token varsa, her isteğin başlığına "Bearer <token>" ekle
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Cevap Geldikten Sonra Araya Gir (Response Interceptor)
api.interceptors.response.use(
  (response) => response, // Cevap başarılıysa aynen devam et
  async (error) => {
    const originalRequest = error.config;

    // Login veya Register isteklerinde 401 alırsak refresh denemeyelim
    // Çünkü kullanıcı zaten token almaya çalışıyor.
    if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/register')) {
        return Promise.reject(error);
    }

    // Eğer hata 401 (Yetkisiz) ise ve daha önce denemediysek
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Sonsuz döngüye girmesin diye işaretle

      try {
        // Backend'e "Refresh Token" isteği at (Cookie otomatik gider)
        // Backend'deki endpoint: /api/auth/refresh
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {}, 
          { withCredentials: true } // Cookie gitmesi için şart
        );

        // Yeni gelen Access Token'ı kaydet
        localStorage.setItem('accessToken', data.accessToken);

        // İlk isteği yeni token ile tekrarla
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Eğer Refresh Token da patladıysa (süresi dolduysa)
        localStorage.removeItem('accessToken');
        window.location.href = '/login'; // Kullanıcıyı girişe at
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;