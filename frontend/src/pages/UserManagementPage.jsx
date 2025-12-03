import React, { useEffect, useState } from "react";
import { Card, Table, Button, Space, Tag } from "antd";
// import http from "../api/http"; // ไว้ใช้ตอนต่อ backend จริง

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // TODO: ดึงจาก /api/admin/users
    // ตัวอย่าง dummy
    setUsers([
      { id: 1, username: "admin", full_name: "Administrator", role: "ADMIN", is_active: true },
    ]);
  }, []);

  const columns = [
    { title: "Username", dataIndex: "username" },
    { title: "ชื่อ-นามสกุล", dataIndex: "full_name" },
    {
      title: "Role",
      dataIndex: "role",
      render: (role) =>
        role === "ADMIN" ? <Tag color="red">ADMIN</Tag> : <Tag color="blue">USER</Tag>,
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
          <Button size="small">แก้ไข</Button>
          <Button size="small" danger>
            ลบ
          </Button>
          <Button size="small">รีเซ็ตรหัสผ่าน</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="จัดการผู้ใช้"
      extra={<Button type="primary">เพิ่มผู้ใช้</Button>}
    >
      <Table rowKey="id" dataSource={users} columns={columns} />
    </Card>
  );
}