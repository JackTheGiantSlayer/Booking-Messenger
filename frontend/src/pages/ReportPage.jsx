import React, { useEffect, useState } from "react";
import {
  Card,
  DatePicker,
  Select,
  Button,
  Table,
  Space,
  message,
} from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import http from "../api/http";

const { RangePicker } = DatePicker;

export default function ReportPage() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState([]);

  const [filters, setFilters] = useState({
    dateRange: [dayjs(), dayjs()],
    status: null,
  });

  // ---------------- Helper: Build request parameters ----------------
  const buildParams = (currentFilters) => {
    const params = {};
    const { dateRange, status } = currentFilters;

    if (dateRange && dateRange.length === 2) {
      params.start_date = dateRange[0].format("YYYY-MM-DD");
      params.end_date = dateRange[1].format("YYYY-MM-DD");
    }
    if (status) {
      params.status = status;
    }
    return params;
  };

  // ---------------- Convert time to AM/PM Label ----------------
  const renderTimeLabel = (timeStr) => {
    if (!timeStr) return "";

    const t = String(timeStr);
    if (t.startsWith("11:59")) return "Morning";
    if (t.startsWith("16:29")) return "Afternoon";
    if (t.startsWith("00:00")) return "Not Specific"

    return t.length >= 5 ? t.slice(0, 5) : t;
  };

  // ---------------- Fetch report data ----------------
  const fetchReport = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const params = buildParams(currentFilters);
      console.log(">>> /api/admin/report params =", params);

      const res = await http.get("/admin/report", { params });
      setData(res.data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  // Load on first enter
  useEffect(() => {
    fetchReport();
  }, []);

  // ---------------- Search ----------------
  const handleSearch = () => {
    fetchReport(filters);
  };

  // ---------------- Export PDF/Excel ----------------
  const handleExport = async (type) => {
    setExporting(true);
    try {
      const params = buildParams(filters);
      console.log(`>>> /api/admin/report/${type} params =`, params);

      const url = type === "pdf" ? "/admin/report/pdf" : "/admin/report/excel";

      const res = await http.get(url, {
        params,
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type:
          type === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `messenger_report_${dayjs().format("YYYY-MM-DD")}.${type}`;
      link.click();

      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
      message.error(`Export ${type.toUpperCase()} failed`);
    } finally {
      setExporting(false);
    }
  };

  // ---------------- Filters ----------------
  const companyFilters = Array.from(
    new Set((data || []).map((d) => d.company_name).filter((v) => v))
  ).map((v) => ({ text: v, value: v }));

  const statusFilters = [
    { text: "Pending", value: "PENDING" },
    { text: "Success", value: "SUCCESS" },
    { text: "Cancelled", value: "CANCEL" },
  ];

  // ---------------- Table Columns ----------------
  const columns = [
    {
      title: "Date",
      dataIndex: "booking_date",
      sorter: (a, b) => a.booking_date.localeCompare(b.booking_date),
    },
    {
      title: "Time",
      dataIndex: "booking_time",
      sorter: (a, b) =>
        String(a.booking_time || "").localeCompare(String(b.booking_time || "")),
      render: (time) => renderTimeLabel(time),
    },
    {
      title: "Company",
      dataIndex: "company_name",
      filters: companyFilters,
      onFilter: (value, record) => record.company_name === value,
    },
    {
      title: "Requester",
      dataIndex: "requester_name",
    },
    {
      title: "Job Type",
      dataIndex: "job_type",
    },
    {
      title: "Department",
      dataIndex: "department",
    },
    {
      title: "Details",
      dataIndex: "detail",
      render: (text) => <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>,
    },
    {
      title: "Contact Person",
      dataIndex: "contact_name",
    },
    {
      title: "Phone",
      dataIndex: "contact_phone",
    },
    {
      title: "Status",
      dataIndex: "status",
      filters: statusFilters,
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        if (status === "SUCCESS") return "Success";
        if (status === "PENDING") return "Pending";
        if (status === "CANCEL") return "Cancelled";
        return status;
      },
    },
  ];

  return (
    <Card
      title="Messenger Report"
      extra={
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport("pdf")}
            loading={exporting}
          >
            Export PDF
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport("excel")}
            loading={exporting}
          >
            Export Excel
          </Button>
        </Space>
      }
    >
      {/* Filter bar */}
      <Space style={{ marginBottom: 16 }} wrap>
        <span>Date Range:</span>
        <RangePicker
          value={filters.dateRange}
          onChange={(v) =>
            setFilters((prev) => ({ ...prev, dateRange: v }))
          }
        />

        <span>Status:</span>
        <Select
          style={{ width: 160 }}
          placeholder="Select status"
          allowClear
          value={filters.status}
          onChange={(v) =>
            setFilters((prev) => ({ ...prev, status: v }))
          }
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "SUCCESS", label: "Success" },
            { value: "CANCEL", label: "Cancelled" },
          ]}
        />

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleSearch}
          loading={loading}
        >
          Search
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
      />
    </Card>
  );
}