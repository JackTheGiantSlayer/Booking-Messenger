import React, { createContext, useState, useEffect } from "react";
import http from "../api/http";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      http.get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          setUser(null);
          localStorage.removeItem("access_token");
        });
    }
  }, []);

  const login = async (username, password) => {
    const res = await http.post("/auth/login", { username, password });
    localStorage.setItem("access_token", res.data.access_token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  const value = { user, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
