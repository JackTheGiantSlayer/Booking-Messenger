import React, { useEffect, useState } from "react";
import { Layout, Menu, Button } from "antd";
import {
  LoginOutlined,
  FileAddOutlined,
  UserOutlined,
  TableOutlined,
  DashboardOutlined,
  LogoutOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

import LoginPage from "./pages/LoginPage";
import BookingForm from "./components/BookingForm";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagementPage from "./pages/UserManagementPage";
import MessengerSchedulePage from "./pages/MessengerSchedulePage";
import ReportPage from "./pages/ReportPage";
import UserDashboardPage from "./pages/UserDashboardPage"; // ⭐ ใหม่ ต้องมีไฟล์นี้

const { Header, Content } = Layout;

function App() {
  const [user, setUser] = useState(null);
  const [menuKey, setMenuKey] = useState("login");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("user");
    if (token && userStr && userStr !== "null" && userStr !== "undefined") {
      try {
        const u = JSON.parse(userStr);
        setUser(u);
        setMenuKey(u.role === "ADMIN" ? "dashboard" : "user-dashboard"); // ⭐ ผู้ใช้ธรรมดาไปหน้า Dashboard ก่อน
      } catch (e) {
        console.error(e);
      }
    } else {
      setMenuKey("login");
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setMenuKey(userData.role === "ADMIN" ? "dashboard" : "user-dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    setMenuKey("login");
  };

  // ----- เปลี่ยนหน้าตามเมนู ----- //
  let contentNode;
  if (!user) {
    contentNode = (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f5f5f5",
        }}
      >
        <div style={{ width: 400 }}>
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  } else {
    switch (menuKey) {
      case "dashboard":
        contentNode = <div style={{ padding: 24 }}><AdminDashboard /></div>;
        break;
      case "user-dashboard":
        contentNode = <div style={{ padding: 24 }}><UserDashboardPage /></div>;
        break;
      case "users":
        contentNode = <div style={{ padding: 24 }}><UserManagementPage /></div>;
        break;
      case "schedule":
        contentNode = <div style={{ padding: 24 }}><MessengerSchedulePage /></div>;
        break;
      case "report":
        contentNode = <div style={{ padding: 24 }}><ReportPage /></div>;
        break;
      case "booking":
      default:
        contentNode = <div style={{ padding: 24 }}><BookingForm /></div>;
    }
  }

  // ----- สร้างเมนูตาม Role ----- //
  const menuItems = [];
  if (!user) {
    menuItems.push({ key: "login", icon: <LoginOutlined />, label: "Login" });
  } else {
    if (user.role === "ADMIN") {
      menuItems.push(
        { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
        { key: "booking", icon: <FileAddOutlined />, label: "Booking Messenger" },
        { key: "users", icon: <UserOutlined />, label: "User Management" },
        { key: "schedule", icon: <TableOutlined />, label: "Messenger Queue" },
        { key: "report", icon: <BarChartOutlined />, label: "Report" },
      );
    } else {
      menuItems.push(
        { key: "user-dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
        { key: "booking", icon: <FileAddOutlined />, label: "ฟอร์มจอง Messenger" },
      );
    }
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center", padding: "0 24px" }}>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 600, marginRight: 32 }}>
          Booking Messenger System
        </div>

        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[menuKey]}
          onClick={(e) => setMenuKey(e.key)}
          style={{ flex: 1 }}
          items={menuItems}
        />

        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#fff" }}>
              {user.full_name || user.username} {user.role === "ADMIN" ? "(Admin)" : ""}
            </span>
            <Button icon={<LogoutOutlined />} size="small" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        )}
      </Header>

      <Content>{contentNode}</Content>
    </Layout>
  );
}

export default App;