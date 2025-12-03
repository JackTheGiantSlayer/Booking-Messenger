import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  Table,
  Tag,
  message,
  Button,
  Space,
  Popconfirm,
  Input,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import http from "../api/http";

export default function MessengerSchedulePage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // สำหรับ filter ของแต่ละ column
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await http.get("/admin/bookings");
      setBookings(res.data);
    } catch (err) {
      console.error(err);
      message.error("ไม่สามารถโหลดข้อมูลการจองได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (bookingId, status) => {
    setUpdatingId(bookingId);
    try {
      await http.patch(`/admin/bookings/${bookingId}/status`, { status });
      message.success("อัปเดตสถานะสำเร็จ");
      fetchBookings();
    } catch (err) {
      console.error(err);
      message.error("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setUpdatingId(null);
    }
  };

  // ---------------- helper สำหรับ column search ----------------
  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0] || "");
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex, placeholderLabel) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`ค้นหา${placeholderLabel || ""}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() =>
            handleSearch(selectedKeys, confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
          >
            ค้นหา
          </Button>
          <Button
            size="small"
            onClick={() => {
              clearFilters && handleReset(clearFilters);
              confirm({ closeDropdown: false });
              setSearchedColumn(dataIndex);
            }}
          >
            รีเซ็ต
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
    ),
    onFilter: (value, record) => {
      const v = record[dataIndex];
      if (v === undefined || v === null) return false;
      return String(v).toLowerCase().includes(String(value).toLowerCase());
    },
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
  });

  // ---------------- columns ----------------
  const columns = [
    {
      title: "วันที่",
      dataIndex: "booking_date",
      ...getColumnSearchProps("booking_date", "วันที่"),
    },
    {
      title: "เวลา",
      dataIndex: "booking_time",
      ...getColumnSearchProps("booking_time", "เวลา"),
    },
    {
      title: "บริษัท",
      dataIndex: "company_name",
      ...getColumnSearchProps("company_name", "บริษัท"),
    },
    {
      title: "ผู้แจ้ง",
      dataIndex: "requester_name",
      ...getColumnSearchProps("requester_name", "ผู้แจ้ง"),
    },
    {
      title: "ประเภทงาน",
      dataIndex: "job_type",
      ...getColumnSearchProps("job_type", "ประเภทงาน"),
    },
    {
      title: "หน่วยงาน",
      dataIndex: "department",
      ...getColumnSearchProps("department", "หน่วยงาน"),
    },
    {
      title: "รายละเอียด",
      dataIndex: "detail",
      ...getColumnSearchProps("detail", "รายละเอียด"),
      render: (text) => <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>,
    },
    {
      title: "ผู้ติดต่อ",
      dataIndex: "contact_name",
      ...getColumnSearchProps("contact_name", "ผู้ติดต่อ"),
    },
    {
      title: "เบอร์โทร",
      dataIndex: "contact_phone",
      ...getColumnSearchProps("contact_phone", "เบอร์โทร"),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      filters: [
        { text: "รอดำเนินการ", value: "PENDING" },
        { text: "สำเร็จ", value: "SUCCESS" },
        { text: "ยกเลิก", value: "CANCEL" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        let color = "default";
        let label = status;

        if (status === "PENDING") {
          color = "gold";
          label = "รอดำเนินการ";
        } else if (status === "SUCCESS") {
          color = "green";
          label = "สำเร็จ";
        } else if (status === "CANCEL") {
          color = "volcano";
          label = "ยกเลิก";
        }

        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "จัดการ",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            disabled={record.status === "SUCCESS"}
            loading={
              updatingId === record.id && record.status !== "SUCCESS"
            }
            onClick={() => updateStatus(record.id, "SUCCESS")}
          >
            Success
          </Button>

          <Popconfirm
            title="ต้องการยกเลิกงานนี้หรือไม่?"
            onConfirm={() => updateStatus(record.id, "CANCEL")}
            okText="ใช่"
            cancelText="ไม่"
          >
            <Button
              danger
              size="small"
              disabled={record.status === "CANCEL"}
              loading={
                updatingId === record.id && record.status !== "CANCEL"
              }
            >
              Cancel
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="ภาพรวมตาราง Messenger">
      <Table
        rowKey="id"
        dataSource={bookings}
        columns={columns}
        loading={loading}
      />
    </Card>
  );
}