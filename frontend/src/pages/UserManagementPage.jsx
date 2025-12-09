import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import http from "../api/http";

const { Option } = Select;

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState("create"); // create | edit
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const [pwdVisible, setPwdVisible] = useState(false);
  const [pwdForm] = Form.useForm();
  const [pwdUser, setPwdUser] = useState(null);

  // -------- Fetch Users -------- //
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await http.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // -------- Create user modal -------- //
  const openCreateModal = () => {
    setFormMode("create");
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      role: "USER",
      is_active: true,
      is_approver: false,
    });
    setFormVisible(true);
  };

  // -------- Edit user modal -------- //
  const openEditModal = (record) => {
    setFormMode("edit");
    setEditingUser(record);
    form.resetFields();
    form.setFieldsValue({
      username: record.username,
      full_name: record.full_name,
      role: record.role,
      is_active: record.is_active,
      is_approver: record.is_approver,
      email: record.email,
      phone: record.phone,
    });
    setFormVisible(true);
  };

  // -------- Submit Create/Edit -------- //
  const handleSubmitForm = async () => {
    try {
      const values = await form.validateFields();

      if (formMode === "create") {
        if (!values.password) {
          message.error("Password is required");
          return;
        }
        await http.post("/admin/users", {
          username: values.username,
          full_name: values.full_name,
          role: values.role,
          is_active: values.is_active,
          is_approver: values.is_approver,
          password: values.password,
          email: values.email || null,
          phone: values.phone || null,
        });
        message.success("User created successfully");

      } else if (formMode === "edit" && editingUser) {
        await http.put(`/admin/users/${editingUser.id}`, {
          username: values.username,
          full_name: values.full_name,
          role: values.role,
          is_active: values.is_active,
          is_approver: values.is_approver,
          email: values.email || null,
          phone: values.phone || null,
        });
        message.success("User updated successfully");
      }

      setFormVisible(false);
      fetchUsers();

    } catch (err) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("Failed to save user");
    }
  };

  // -------- Delete user -------- //
  const handleDelete = async (record) => {
    try {
      await http.delete(`/admin/users/${record.id}`);
      message.success("User deleted successfully");
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error("Failed to delete user");
    }
  };

  // -------- Reset password modal -------- //
  const openResetPasswordModal = (record) => {
    setPwdUser(record);
    pwdForm.resetFields();
    setPwdVisible(true);
  };

  const handleResetPassword = async () => {
    try {
      const values = await pwdForm.validateFields();
      await http.post(`/admin/users/${pwdUser.id}/reset_password`, {
        password: values.password,
      });
      message.success("Password updated successfully");
      setPwdVisible(false);
    } catch (err) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("Failed to update password");
    }
  };

  const columns = [
    { title: "Username", dataIndex: "username" },
    { title: "Full Name", dataIndex: "full_name" },
    { title: "Email", dataIndex: "email" },
    { title: "Phone", dataIndex: "phone" },
    {
      title: "Role",
      dataIndex: "role",
      render: (role) =>
        role === "ADMIN" ? <Tag color="red">ADMIN</Tag> : <Tag color="blue">USER</Tag>,
    },
    {
      title: "Approver",
      dataIndex: "is_approver",
      render: (v) => (v ? <Tag color="purple">YES</Tag> : <Tag>NO</Tag>),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      render: (active) => (
        <Tag color={active ? "green" : "volcano"}>
          {active ? "Active" : "Disabled"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Edit
          </Button>

          <Popconfirm
            title="Confirm delete this user?"
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>

          <Button size="small" icon={<KeyOutlined />} onClick={() => openResetPasswordModal(record)}>
            Reset Password
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="User Management"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Add User
        </Button>
      }
    >
      <Table rowKey="id" dataSource={users} columns={columns} loading={loading} />

      {/* Create/Edit User Modal */}
      <Modal
        open={formVisible}
        title={formMode === "create" ? "Create User" : "Edit User"}
        onOk={handleSubmitForm}
        onCancel={() => setFormVisible(false)}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Username" name="username" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Full Name" name="full_name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Email" name="email"><Input type="email" /></Form.Item>
          <Form.Item label="Phone" name="phone"><Input /></Form.Item>

          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select>
              <Option value="ADMIN">ADMIN</Option>
              <Option value="USER">USER</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Approver" name="is_approver" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Active Status" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>

          {formMode === "create" && (
            <Form.Item label="Initial Password" name="password" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={pwdVisible}
        title={pwdUser ? `Reset Password: ${pwdUser.username}` : "Reset Password"}
        onOk={handleResetPassword}
        onCancel={() => setPwdVisible(false)}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item label="New Password" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}