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

const { Header, Content } = Layout;

function App() {
  const [user, setUser] = useState(null);
  const [menuKey, setMenuKey] = useState("login");

  // โหลด user จาก localStorage ตอนเปิดหน้า
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("user");
    if (token && userStr && userStr !== "null" && userStr !== "undefined") {
      try {
        const u = JSON.parse(userStr);
        setUser(u);
        // ถ้าเป็น admin → default dashboard, ถ้าไม่ใช่ → booking
        if (u.role === "ADMIN") {
          setMenuKey("dashboard");
        } else {
          setMenuKey("booking");
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setMenuKey("login");
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    if (userData.role === "ADMIN") {
      setMenuKey("dashboard");
    } else {
      setMenuKey("booking");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    setMenuKey("login");
  };

  // ---------- เลือก content ตาม user + menuKey ---------- //
  let contentNode = null;

  if (!user) {
    // ยังไม่ login → โชว์หน้า login ใน Content
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
    // login แล้ว → สลับหน้าตาม menuKey
    switch (menuKey) {
      case "dashboard":
        contentNode = (
          <div style={{ padding: 24 }}>
            <AdminDashboard />
          </div>
        );
        break;
      case "users":
        contentNode = (
          <div style={{ padding: 24 }}>
            <UserManagementPage />
          </div>
        );
        break;
      case "schedule":
        contentNode = (
          <div style={{ padding: 24 }}>
            <MessengerSchedulePage />
          </div>
        );
        break;
      case "report": // ⭐ เมนูรายงาน
        contentNode = (
          <div style={{ padding: 24 }}>
            <ReportPage />
          </div>
        );
        break;
      case "booking":
      default:
        contentNode = (
          <div style={{ padding: 24 }}>
            <BookingForm />
          </div>
        );
        break;
    }
  }

  // ---------- สร้างเมนูตาม role ---------- //
  const menuItems = [];

  if (!user) {
    menuItems.push({
      key: "login",
      icon: <LoginOutlined />,
      label: "Login",
    });
  } else {
    // สำหรับ admin
    if (user.role === "ADMIN") {
      menuItems.push(
        {
          key: "dashboard",
          icon: <DashboardOutlined />,
          label: "Dashboard",
        },
        {
          key: "booking",
          icon: <FileAddOutlined />,
          label: "Booking Messenger",
        },
        {
          key: "users",
          icon: <UserOutlined />,
          label: "User Management",
        },
        {
          key: "schedule",
          icon: <TableOutlined />,
          label: "Messenger Queue",
        },
        {
          key: "report",              // ⭐ เมนูใหม่
          icon: <BarChartOutlined />, // หรือ TableOutlined ก็ได้
          label: "Report",
        }
      );
    } else {
      // user ทั่วไป
      menuItems.push({
        key: "booking",
        icon: <FileAddOutlined />,
        label: "ฟอร์มจอง Messenger",
      });
      // อนาคตจะเพิ่ม "รายการจองของฉัน" ก็ใส่เพิ่มที่นี่
    }
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
        }}
      >
        {/* โลโก้ / ชื่อระบบ */}
        <div
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: 600,
            marginRight: 32,
          }}
        >
          Booking Messenger System
        </div>

        {/* เมนูหลัก */}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[menuKey]}
          onClick={(e) => setMenuKey(e.key)}
          style={{ flex: 1 }}
          items={menuItems}
        />

        {/* มุมขวา: ชื่อ user + logout */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#fff" }}>
              {user.full_name || user.username}{" "}
              {user.role === "ADMIN" ? "(Admin)" : ""}
            </span>
            <Button
              icon={<LogoutOutlined />}
              size="small"
              onClick={handleLogout}
            >
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