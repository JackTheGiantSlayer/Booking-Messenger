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

      // default messenger = messenger_name (from DB) or "ขวัญเมือง"
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

  const updateStatus = async (bookingId, status) => {
    setUpdatingId(bookingId);
    try {
      const payload = { status };

      // send messenger_name only when mark as SUCCESS
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

  // 🔹 แปลงเวลาเป็นข้อความ "ช่วงเช้า / ช่วงบ่าย" หรือ HH:MM
  const renderTimeLabel = (timeStr) => {
    if (!timeStr) return "";

    const t = String(timeStr); // กันไว้เผื่อเป็น object/Date

    // ใน DB เป็น 11:59:59 / 16:29:59 แต่อาจ serialize ออกมาเป็น 11:59
    if (t.startsWith("11:59")) return "ช่วงเช้า";
    if (t.startsWith("16:29")) return "ช่วงบ่าย";

    // นอกเหนือจากสองเวลานี้ แสดงเป็น HH:MM ปกติ
    return t.length >= 5 ? t.slice(0, 5) : t;
  };

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
      render: (time) => renderTimeLabel(time),
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

    // 🔹 Messenger column
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
        // Completed / Cancelled → show name from DB
        return <span>{record.messenger_name || "-"}</span>;
      },
    },

    {
      title: "Status",
      dataIndex: "status",
      filters: [
        { text: "Pending", value: "PENDING" },
        { text: "Completed", value: "SUCCESS" },
        { text: "Cancelled", value: "CANCEL" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        let color = "default";
        let label = status;

        if (status === "PENDING") {
          color = "gold";
          label = "Pending";
        } else if (status === "SUCCESS") {
          color = "green";
          label = "Completed";
        } else if (status === "CANCEL") {
          color = "volcano";
          label = "Cancelled";
        }

        return <Tag color={color}>{label}</Tag>;
      },
    },

    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {/* Completed button */}
          <Button
            type="primary"
            size="small"
            disabled={record.status === "SUCCESS"}
            loading={updatingId === record.id && record.status !== "SUCCESS"}
            onClick={() => updateStatus(record.id, "SUCCESS")}
          >
            Completed
          </Button>

          {/* Cancel button – hide when status is SUCCESS */}
          {record.status !== "SUCCESS" && (
            <Popconfirm
              title="Are you sure to cancel this job?"
              onConfirm={() => updateStatus(record.id, "CANCEL")}
              okText="Yes"
              cancelText="No"
            >
              <Button
                danger
                size="small"
                disabled={record.status === "CANCEL"}
                loading={updatingId === record.id && record.status !== "CANCEL"}
              >
                Cancel
              </Button>
            </Popconfirm>
          )}

          {/* Download PDF */}
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            onClick={async () => {
              try {
                const res = await http.get(`/bookings/${record.id}/pdf`, {
                  responseType: "blob",
                });
                const blob = new Blob([res.data], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `booking_${record.id}.pdf`;
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
        </Space>
      ),
    },
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