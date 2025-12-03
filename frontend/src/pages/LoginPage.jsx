import React, { useState } from "react";
import { Form, Input, Button, Card, message } from "antd";
import http from "../api/http";

export default function LoginPage({ onLoginSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await http.post("/auth/login", {
        username: values.username,
        password: values.password,
      });

      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      message.success("เข้าสู่ระบบสำเร็จ");

      if (onLoginSuccess) {
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      console.error("login error", err);
      message.error(
        err?.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Booking Messenger System">
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: "กรุณากรอก Username" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "กรุณากรอก Password" }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Login
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}