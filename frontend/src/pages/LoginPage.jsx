import React, { useState } from "react";
import { Form, Input, Button, Card, message, Modal, Typography } from "antd";
import http from "../api/http";

const { Link } = Typography;

export default function LoginPage({ onLoginSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Forgot password modal
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotForm] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await http.post("/auth/login", {
        username: values.username,
        password: values.password,
      });

      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      message.success("Login successful");

      if (onLoginSuccess) onLoginSuccess(res.data.user);

    } catch (err) {
      console.error("login error", err);
      message.error(
        err?.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Open forgot password modal
  const openForgotModal = () => {
    forgotForm.resetFields();
    setForgotVisible(true);
  };

  // Submit forgot password request
  const handleForgotPassword = async () => {
    try {
      const values = await forgotForm.validateFields();
      setForgotLoading(true);

      await http.post("/auth/forgot-password", {
        username: values.username,
        email: values.email,
      });

      message.success(
        "If the information is correct, a password reset email has been sent."
      );
      setForgotVisible(false);

    } catch (err) {
      if (err?.errorFields) return;
      console.error("forgot password error", err);
      message.error(
        err?.response?.data?.message ||
        "Unable to send reset email. Please try again."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <Card title="Booking Messenger System" style={{ maxWidth: 400, margin: "0 auto" }}>
        <Form layout="vertical" form={form} onFinish={onFinish}>

          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Please enter username" }]}
          >
            <Input autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter password" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ marginBottom: 8 }}
            >
              Login
            </Button>
            <div style={{ textAlign: "right" }}>
              <Link onClick={openForgotModal}>Forgot password?</Link>
            </div>
          </Form.Item>

        </Form>
      </Card>

      {/* Forgot Password Modal */}
      <Modal
        open={forgotVisible}
        title="Forgot Password"
        onOk={handleForgotPassword}
        onCancel={() => setForgotVisible(false)}
        okText="Send Reset Email"
        cancelText="Cancel"
        confirmLoading={forgotLoading}
        destroyOnClose
      >
        <Form form={forgotForm} layout="vertical">

          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Please enter username" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Registered Email"
            name="email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Invalid email format" },
            ]}
          >
            <Input />
          </Form.Item>

          <p style={{ fontSize: 12, color: "#888" }}>
            The system will verify the account and send password reset details
            to your email if the information is correct.
          </p>

        </Form>
      </Modal>
    </>
  );
}