// ================================
// 📌 HTTP Client (Axios Global)
// ================================
import axios from "axios";

// 🔥 รองรับ .env ถ้าไม่ตั้ง จะใช้ URL นี้แทน
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://192.168.200.230:16000";

console.log("📡 Connecting API:", API_BASE_URL + "/api"); // Debug time!

// ================================
// Create Axios instance
// ================================
const http = axios.create({
  baseURL: API_BASE_URL + "/api", // ทุก request จะมี /api ต่อท้ายอัตโนมัติ
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // กัน connection hang
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

    if (error.response) {
      const status = error.response.status;

      // Unauthorized → Token หมดอายุหรือไม่ถูกต้อง
      if (status === 401 || status === 422) {
        console.warn("⚠ Token expired or invalid → Force logout");
        localStorage.removeItem("access_token");

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }

      // Forbidden (แอดมิน only)
      if (status === 403) {
        alert("🚫 Access denied");
      }
    } else {
      alert("🌐 Cannot connect to server");
    }

    return Promise.reject(error);
  }
);

export default http;