// src/pages/MessengerSchedulePage.jsx

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
import { SearchOutlined, FilePdfOutlined } from "@ant-design/icons";
import http from "../api/http";

export default function MessengerSchedulePage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);

  // Messenger name per booking id (local state for editing)
  const [messengerMap, setMessengerMap] = useState({});

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await http.get("/admin/bookings");
      setBookings(res.data);

      const m = {};
      res.data.forEach((b) => {
        m[b.id] = b.messenger_name || "ขวัญเมือง";
      });
      setMessengerMap(m);
    } catch (err) {
      console.error(err);
      message.error("Failed to load booking data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // ✅ helper แปลงเวลาเป็น label
  const renderBookingTime = (timeStr) => {
    if (!timeStr) return "";
    const t = String(timeStr); // เผื่อ backend ส่งมาเป็น "11:59", "11:59:59"

    if (t.startsWith("11:59")) return "ช่วงเช้า";
    if (t.startsWith("16:29")) return "ช่วงบ่าย";
    if (t.startsWith("00:00")) return "ไม่ระบุเวลา";

    // เวลาอื่น แสดงเป็น HH:MM ปกติ
    return t.length >= 5 ? t.slice(0, 5) : t;
  };

  const updateStatus = async (bookingId, status) => {
    setUpdatingId(bookingId);
    try {
      const payload = { status };

      if (status === "SUCCESS") {
        payload.messenger_name =
          messengerMap[bookingId] && messengerMap[bookingId].trim()
            ? messengerMap[bookingId].trim()
            : "ขวัญเมือง";
      }

      await http.patch(`/admin/bookings/${bookingId}/status`, payload);

      if (status === "SUCCESS") {
        message.success("Status updated to Completed");
      } else if (status === "CANCEL") {
        message.success("Status updated to Cancelled");
      } else {
        message.success("Status updated");
      }

      fetchBookings();
    } catch (err) {
      console.error(err);
      message.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

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
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${placeholderLabel || ""}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
          >
            Search
          </Button>
          <Button
            size="small"
            onClick={() => {
              clearFilters && handleReset(clearFilters);
              confirm({ closeDropdown: false });
              setSearchedColumn(dataIndex);
            }}
          >
            Reset
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

  const columns = [
    {
      title: "Date",
      dataIndex: "booking_date",
      width: 140,
      align: "center",
      ...getColumnSearchProps("booking_date", "date"),
    },
    {
      title: "Time",
      dataIndex: "booking_time",
      ...getColumnSearchProps("booking_time", "time"),
      render: (time) => renderBookingTime(time), // ✅ ใช้ helper
    },
    {
      title: "Company",
      dataIndex: "company_name",
      ...getColumnSearchProps("company_name", "company"),
    },
    {
      title: "Requester",
      dataIndex: "requester_name",
      ...getColumnSearchProps("requester_name", "requester"),
    },
    {
      title: "Job Type",
      dataIndex: "job_type",
      ...getColumnSearchProps("job_type", "job type"),
    },
    {
      title: "Department",
      dataIndex: "department",
      ...getColumnSearchProps("department", "department"),
    },
    {
      title: "Detail",
      dataIndex: "detail",
      ...getColumnSearchProps("detail", "detail"),
      render: (text) => <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>,
    },
    {
      title: "Contact Name",
      dataIndex: "contact_name",
      ...getColumnSearchProps("contact_name", "contact name"),
    },
    {
      title: "Phone",
      dataIndex: "contact_phone",
      ...getColumnSearchProps("contact_phone", "phone"),
    },
    {
      title: "Messenger",
      dataIndex: "messenger_name",
      render: (_, record) => {
        if (record.status === "PENDING") {
          return (
            <Input
              value={messengerMap[record.id] ?? "ขวัญเมือง"}
              onChange={(e) =>
                setMessengerMap((prev) => ({
                  ...prev,
                  [record.id]: e.target.value,
                }))
              }
              placeholder="Messenger name"
              style={{ width: 80 }}
              size="small"
            />
          );
        }
        return <span>{record.messenger_name || "-"}</span>;
      },
    },
    // ... (ส่วน Status + Actions เหมือนเดิม)
  ];

  return (
    <Card title="Messenger Schedule Overview">
      <Table
        rowKey="id"
        dataSource={bookings}
        columns={columns}
        loading={loading}
      />
    </Card>
  );
}