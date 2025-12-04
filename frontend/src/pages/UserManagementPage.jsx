// src/pages/UserManagementPage.jsx

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
  const [formMode, setFormMode] = useState("create"); // 'create' | 'edit'
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const [pwdVisible, setPwdVisible] = useState(false);
  const [pwdForm] = Form.useForm();
  const [pwdUser, setPwdUser] = useState(null);

  // ---------- โหลด users ---------- //
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await http.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      message.error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ---------- เปิดฟอร์มเพิ่ม ---------- //
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

  // ---------- เปิดฟอร์มแก้ไข ---------- //
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

  // ---------- submit ฟอร์ม create / edit ---------- //
  const handleSubmitForm = async () => {
    try {
      const values = await form.validateFields();

      if (formMode === "create") {
        // create user: ต้องมี password
        if (!values.password) {
          message.error("กรุณากรอกรหัสผ่าน");
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
        message.success("สร้างผู้ใช้สำเร็จ");
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
        message.success("แก้ไขผู้ใช้สำเร็จ");
      }

      setFormVisible(false);
      fetchUsers();
    } catch (err) {
      if (err?.errorFields) {
        // validation error ของ antd form
        return;
      }
      console.error(err);
      message.error("บันทึกข้อมูลผู้ใช้ไม่สำเร็จ");
    }
  };

  // ---------- ลบผู้ใช้ ---------- //
  const handleDelete = async (record) => {
    try {
      await http.delete(`/admin/users/${record.id}`);
      message.success("ลบผู้ใช้สำเร็จ");
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error("ลบผู้ใช้ไม่สำเร็จ");
    }
  };

  // ---------- เปิด modal reset password ---------- //
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
      message.success("เปลี่ยนรหัสผ่านสำเร็จ");
      setPwdVisible(false);
    } catch (err) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("เปลี่ยนรหัสผ่านไม่สำเร็จ");
    }
  };

  const columns = [
    { title: "Username", dataIndex: "username" },
    { title: "ชื่อ-นามสกุล", dataIndex: "full_name" },
    { title: "Email", dataIndex: "email" },
    { title: "เบอร์โทร", dataIndex: "phone" },
    {
      title: "Role",
      dataIndex: "role",
      render: (role) =>
        role === "ADMIN" ? (
          <Tag color="red">ADMIN</Tag>
        ) : (
          <Tag color="blue">USER</Tag>
        ),
    },
    {
      title: "Approver",
      dataIndex: "is_approver",
      render: (v) =>
        v ? <Tag color="purple">YES</Tag> : <Tag color="default">NO</Tag>,
    },
    {
      title: "สถานะ",
      dataIndex: "is_active",
      render: (active) => (
        <Tag color={active ? "green" : "volcano"}>
          {active ? "ใช้งาน" : "ปิดการใช้งาน"}
        </Tag>
      ),
    },
    {
      title: "จัดการ",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            แก้ไข
          </Button>

          <Popconfirm
            title="ยืนยันลบผู้ใช้?"
            onConfirm={() => handleDelete(record)}
            okText="ลบ"
            cancelText="ยกเลิก"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              ลบ
            </Button>
          </Popconfirm>

          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => openResetPasswordModal(record)}
          >
            รีเซ็ตรหัสผ่าน
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="จัดการผู้ใช้"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          เพิ่มผู้ใช้
        </Button>
      }
    >
      <Table rowKey="id" dataSource={users} columns={columns} loading={loading} />

      {/* Modal เพิ่ม/แก้ไขผู้ใช้ */}
      <Modal
        open={formVisible}
        title={formMode === "create" ? "เพิ่มผู้ใช้" : "แก้ไขผู้ใช้"}
        onOk={handleSubmitForm}
        onCancel={() => setFormVisible(false)}
        okText="บันทึก"
        cancelText="ยกเลิก"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "กรุณากรอก username" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="ชื่อ-นามสกุล"
            name="full_name"
            rules={[{ required: true, message: "กรุณากรอกชื่อ-นามสกุล" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Email" name="email">
            <Input type="email" />
          </Form.Item>

          <Form.Item label="เบอร์โทร" name="phone">
            <Input />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: "กรุณาเลือก role" }]}
          >
            <Select>
              <Option value="ADMIN">ADMIN</Option>
              <Option value="USER">USER</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Approver"
            name="is_approver"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="สถานะการใช้งาน"
            name="is_active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {formMode === "create" && (
            <Form.Item
              label="รหัสผ่านเริ่มต้น"
              name="password"
              rules={[{ required: true, message: "กรุณากรอกรหัสผ่าน" }]}
            >
              <Input.Password />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal reset password */}
      <Modal
        open={pwdVisible}
        title={
          pwdUser
            ? `เปลี่ยนรหัสผ่าน: ${pwdUser.username}`
            : "เปลี่ยนรหัสผ่าน"
        }
        onOk={handleResetPassword}
        onCancel={() => setPwdVisible(false)}
        okText="บันทึก"
        cancelText="ยกเลิก"
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item
            label="รหัสผ่านใหม่"
            name="password"
            rules={[{ required: true, message: "กรุณากรอกรหัสผ่านใหม่" }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}