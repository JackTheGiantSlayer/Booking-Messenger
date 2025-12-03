import React from "react";
import { Layout, Menu } from "antd";
import BookingForm from "../components/BookingForm";
import MyBookingsPage from "./UserMyBookingsPage";
import { useState } from "react";

const { Header, Content, Sider } = Layout;

export default function UserBookingPage() {
  const [selectedKey, setSelectedKey] = useState("form");

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible>
        <div style={{ height: 32, margin: 16, color: "white" }}>Messenger</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(e) => setSelectedKey(e.key)}
          items={[
            { key: "form", label: "จอง Messenger" },
            { key: "my", label: "รายการจองของฉัน" },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", paddingLeft: 16 }}>
          ระบบจอง Messenger
        </Header>
        <Content style={{ margin: 16 }}>
          {selectedKey === "form" && (
            <BookingForm onSuccess={() => setSelectedKey("my")} />
          )}
          {selectedKey === "my" && <MyBookingsPage />}
        </Content>
      </Layout>
    </Layout>
  );
}
