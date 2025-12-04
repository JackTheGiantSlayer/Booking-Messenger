import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  message,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Statistic,
  Row,
  Col,
  Descriptions,
} from "antd";
import {
  ReloadOutlined,
  FilePdfOutlined,
  LockOutlined,
  EditOutlined,
} from "@ant-design/icons";
import http from "../api/http";

export default function UserDashboardPage({ onLogout, onProfileChange }) {
  const [bookings, setBookings] = useState([]);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm] = Form.useForm();

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdForm] = Form.useForm();

  // ---------- Load my bookings ---------- //
  const loadBookings = async () => {
    try {
      const res = await http.get("/bookings/my");
      setBookings(res.data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load bookings");
    }
  };

  // ---------- Load profile from /auth/me ---------- //
  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await http.get("/auth/me");
      setProfile(res.data);
      profileForm.setFieldsValue({
        full_name: res.data.full_name,
        email: res.data.email || "",
        phone: res.data.phone || "",
      });
    } catch (err) {
      console.error(err);
      message.error("Failed to load user profile");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    loadProfile();
  }, []);

  // ---------- Save Profile (full_name, email, phone) ---------- //
  const handleSaveProfile = async (values) => {
    setProfileSaving(true);
    try {
      const res = await http.put("/auth/me", {
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
      });

      message.success("Profile updated successfully");

      setProfile(res.data);
      setProfileEditing(false);

      // Update localStorage for header display
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          u.full_name = res.data.full_name;
          localStorage.setItem("user", JSON.stringify(u));
        } catch (e) {
          console.error(e);
        }
      }

      // Notify parent (App.js) to update user in state
      if (onProfileChange) {
        onProfileChange({
          full_name: res.data.full_name,
          email: res.data.email,
          phone: res.data.phone,
        });
      }
    } catch (err) {
      console.error(err);
      message.error(
        err?.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setProfileSaving(false);
    }
  };

  // ---------- Change Password ---------- //
  const handleChangePassword = async (values) => {
    setChangingPwd(true);
    try {
      await http.post("/auth/change-password", values);
      message.success("Password changed successfully. Please login again.");

      setShowPwdModal(false);
      pwdForm.resetFields();

      // Force logout
      localStorage.clear();
      if (onLogout) {
        onLogout();
      }
    } catch (err) {
      console.error(err);
      message.error(
        err?.response?.data?.message || "Failed to change password"
      );
    } finally {
      setChangingPwd(false);
    }
  };

  // ---------- Table Columns ---------- //
  const columns = [
    { title: "Date", dataIndex: "booking_date" },
    { title: "Time", dataIndex: "booking_time" },
    { title: "Job Type", dataIndex: "job_type" },
    { title: "Building", dataIndex: "building" },
    { title: "Floor", dataIndex: "floor" },
    {
      title: "Status",
      dataIndex: "status",
      render: (s) => {
        const map = {
          PENDING: "Pending",
          SUCCESS: "Success",
          CANCEL: "Cancelled",
        };
        const color =
          s === "SUCCESS" ? "green" : s === "CANCEL" ? "red" : "gold";
        return <Tag color={color}>{map[s] || s}</Tag>;
      },
    },
    {
      title: "",
      render: (_, r) => (
        <Button
          size="small"
          icon={<FilePdfOutlined />}
          onClick={async () => {
            try {
              const res = await http.get(`/bookings/${r.id}/pdf`, {
                responseType: "blob",
              });
              const blob = new Blob([res.data], { type: "application/pdf" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `booking_${r.id}.pdf`;
              link.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              console.error(err);
              message.error("Failed to download PDF");
            }
          }}
        >
          PDF
        </Button>
      ),
    },
  ];

  const total = bookings.length;
  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const success = bookings.filter((b) => b.status === "SUCCESS").length;
  const cancel = bookings.filter((b) => b.status === "CANCEL").length;

  return (
    // Main container (centered + max width)
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* ---------- User Profile Card ---------- */}
      <Card
        title="User Profile"
        loading={profileLoading}
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Button
              size="small"
              icon={<LockOutlined />}
              onClick={() => setShowPwdModal(true)}
            >
              Change Password
            </Button>
            <Button
              size="small"
              type={profileEditing ? "default" : "primary"}
              icon={<EditOutlined />}
              onClick={() => setProfileEditing((prev) => !prev)}
            >
              {profileEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </Space>
        }
      >
        {profile && !profileEditing && (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Username">
              {profile.username}
            </Descriptions.Item>
            <Descriptions.Item label="Full Name">
              {profile.full_name}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {profile.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {profile.phone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Role">
              {profile.role}
            </Descriptions.Item>
            <Descriptions.Item label="Approver">
              {profile.is_approver ? "Yes" : "No"}
            </Descriptions.Item>
          </Descriptions>
        )}

        {profile && profileEditing && (
          <Form
            layout="vertical"
            form={profileForm}
            initialValues={{
              full_name: profile.full_name,
              email: profile.email || "",
              phone: profile.phone || "",
            }}
            onFinish={handleSaveProfile}
          >
            <Form.Item label="Username">
              <Input value={profile.username} disabled />
            </Form.Item>

            <Form.Item
              label="Full Name"
              name="full_name"
              rules={[{ required: true, message: "Please enter full name" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: "email", message: "Invalid email format" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="Phone" name="phone">
              <Input />
            </Form.Item>

            <Space>
              <Button onClick={() => setProfileEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={profileSaving}>
                Save
              </Button>
            </Space>
          </Form>
        )}
      </Card>

      {/* ---------- Dashboard & Table ---------- */}
      <Card
        title="📌 Dashboard — My Bookings"
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadBookings} size="small">
            Refresh
          </Button>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Statistic title="Total" value={total} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="Pending" value={pending} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="Success" value={success} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="Cancelled" value={cancel} />
          </Col>
        </Row>

        <Table
          rowKey="id"
          dataSource={bookings}
          columns={columns}
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
        />
      </Card>

      {/* ---------- Change Password Modal ---------- */}
      <Modal
        title="Change Password"
        open={showPwdModal}
        okText="Save & Logout"
        confirmLoading={changingPwd}
        onCancel={() => setShowPwdModal(false)}
        onOk={() => pwdForm.submit()}
      >
        <Form layout="vertical" form={pwdForm} onFinish={handleChangePassword}>
          <Form.Item
            label="Current Password"
            name="old_password"
            rules={[{ required: true, message: "Please enter current password" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            label="New Password"
            name="new_password"
            rules={[
              { required: true, message: "Please enter new password" },
              { min: 6, message: "At least 6 characters" },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            label="Confirm New Password"
            name="confirm_password"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "Please confirm new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value === getFieldValue("new_password")) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("New passwords do not match")
                  );
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}