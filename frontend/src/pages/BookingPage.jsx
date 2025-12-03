import React from "react";
import { Layout, Menu } from "antd";
import BookingForm from "../components/BookingForm";

const { Header, Content } = Layout;

export default function BookingPage() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center" }}>
        <div style={{ color: "#fff", fontSize: 18, marginRight: 24 }}>
          Booking Messenger System
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          style={{ flex: 1 }}
          items={[
            {
              key: "booking",
              label: `จอง Messenger ${user ? `(${user.username})` : ""}`,
            },
          ]}
        />
      </Header>
      <Content style={{ padding: 24 }}>
        {/* ฟอร์มจองที่คุณมีอยู่แล้ว */}
        <BookingForm />
      </Content>
    </Layout>
  );
}