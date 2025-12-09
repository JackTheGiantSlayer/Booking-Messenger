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

      message.success("Login successful ✔");
      onLoginSuccess?.(res.data.user);

    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        "❌ Username or password incorrect";
      message.error(msg);
      console.error("LOGIN ERROR →", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card title="Messenger Booking System" style={{ width:350,margin:"70px auto" }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="Username" rules={[{ required:true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required:true }]}>
            <Input.Password />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            Login
          </Button>

          <div style={{textAlign:"right", marginTop:8}}>
            <Link onClick={()=>setForgotVisible(true)}>Forgot password?</Link>
          </div>
        </Form>
      </Card>

      {/* Forgot Password */}
      <Modal
        open={forgotVisible}
        title="Forgot Password"
        confirmLoading={forgotLoading}
        onCancel={()=>setForgotVisible(false)}
        onOk={async ()=>{
          try{
            const values = await forgotForm.validateFields();
            setForgotLoading(true);
            await http.post("/auth/forgot-password", values);
            message.success("Reset mail sent if account is valid.");
            setForgotVisible(false);
          }catch(err){ message.error("Failed sending reset mail."); }
          finally{ setForgotLoading(false); }
        }}
      >
        <Form form={forgotForm} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{required:true}]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Registered Email" rules={[{ required:true,type:"email"}]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}