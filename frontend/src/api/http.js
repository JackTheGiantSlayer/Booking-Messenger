import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:16000";

const http = axios.create({
  baseURL: API_BASE_URL + "/api",
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ⭐ ดัก token expired, token invalid แล้ว redirect ไป login
http.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response) {
      const status = error.response.status;

      // JWT expired
      if (status === 401) {
        console.log(">>> Token expired or unauthorized");
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }

      // Invalid token
      if (status === 422) {
        console.log(">>> Invalid token");
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default http;