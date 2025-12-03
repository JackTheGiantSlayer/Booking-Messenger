import React, { useEffect, useState } from "react";
import { Table, Tag, Card } from "antd";
import http from "../api/http";

export default function MyBookingsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await http.get("/bookings/my");
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const columns = [
    {
      title: "วันที่",
      dataIndex: "booking_date",
      key: "booking_date",
    },
    {
      title: "เวลา",
      dataIndex: "booking_time",
      key: "booking_time",
    },
    {
      title: "บริษัท",
      dataIndex: ["company", "name"],
      key: "company",
    },
    {
      title: "ประเภทงาน",
      dataIndex: "job_type",
      key: "job_type",
    },
    {
      title: "หน่วยงาน",
      dataIndex: "department",
      key: "department",
    },
    {
      title: "ผู้ติดต่อ",
      dataIndex: "contact_name",
      key: "contact_name",
    },
    {
      title: "เบอร์โทร",
      dataIndex: "contact_phone",
      key: "contact_phone",
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = "default";
        if (status === "PENDING") color = "gold";
        else if (status === "APPROVED") color = "green";
        else if (status === "REJECTED") color = "red";
        else if (status === "DONE") color = "blue";
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  return (
    <Card title="รายการจองของฉัน">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
      />
    </Card>
  );
}
