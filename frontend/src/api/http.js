// ================================
// 📌 HTTP Client (Axios Global)
// ================================
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://192.168.200.230:16000";

console.log("📡 Connecting API:", API_BASE_URL + "/api");

// ================================
// Create Axios instance
// ================================
const http = axios.create({
  baseURL: API_BASE_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ================================
// Attach Token automatically
// ================================
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ================================
// Auto handle Response Error
// ================================
http.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ AXIOS ERROR:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // network error
    if (!error.response) {
      alert("🌐 Cannot connect to server");
      return Promise.reject(error);
    }

    const status = error.response.status;
    const url = error.config?.url || ""; // ส่วนใหญ่จะได้เป็น "/auth/login", "/bookings", ฯลฯ

    const isAuthLogin = url.includes("/auth/login");
    const isForgot = url.includes("/auth/forgot-password");

    // ✅ เคส token หมดอายุ/ไม่ถูกต้อง เฉพาะ API อื่น ๆ ที่ไม่ใช่ login/forgot
    if (!isAuthLogin && !isForgot && (status === 401 || status === 422)) {
      console.warn("⚠ Token expired or invalid → Force logout");
      localStorage.removeItem("access_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    if (status === 403) {
      alert("🚫 Access denied");
    }

    // สำคัญ: ส่ง error ต่อไปให้ component เช่น LoginPage จัดการ message เอง
    return Promise.reject(error);
  }
);

export default http;