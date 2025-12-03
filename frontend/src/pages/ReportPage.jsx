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
    // default เป็นวันนี้ทั้งสองฝั่ง
    dateRange: [dayjs(), dayjs()],
    status: null,
  });

  // ---------------- Helper for parameters ----------------
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

  // ---------------- Fetch data from backend ----------------
  const fetchReport = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const params = buildParams(currentFilters);
      console.log(">>> /api/admin/report params =", params);

      const res = await http.get("/admin/report", { params });
      setData(res.data);
    } catch (err) {
      console.error(err);
      message.error("โหลดรายงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลทันทีเมื่อเข้าหน้านี้
  useEffect(() => {
    fetchReport();
  }, []); // ไม่มี eslint-disable แล้ว

  // ---------------- When clicking Search ----------------
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
      const fileNameBase = `messenger_report_${dayjs().format("YYYY-MM-DD")}`;

      link.href = window.URL.createObjectURL(blob);
      link.download =
        type === "pdf" ? `${fileNameBase}.pdf` : `${fileNameBase}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
      message.error(`ส่งออก ${type.toUpperCase()} ไม่สำเร็จ`);
    } finally {
      setExporting(false);
    }
  };

  // ---------------- สร้าง filter options จาก data (สำหรับ column filter) ----------------
  const companyFilters = Array.from(
    new Set(
      (data || [])
        .map((d) => d.company_name)
        .filter((v) => v && v.trim() !== "")
    )
  ).map((v) => ({ text: v, value: v }));

  const statusFilters = [
    { text: "รอดำเนินการ", value: "PENDING" },
    { text: "สำเร็จ", value: "SUCCESS" },
    { text: "ยกเลิก", value: "CANCEL" },
  ];

  // ---------------- Table Columns ----------------
  const columns = [
    {
      title: "วันที่",
      dataIndex: "booking_date",
      sorter: (a, b) => a.booking_date.localeCompare(b.booking_date),
    },
    {
      title: "เวลา",
      dataIndex: "booking_time",
      sorter: (a, b) => a.booking_time.localeCompare(b.booking_time),
    },
    {
      title: "บริษัท",
      dataIndex: "company_name",
      filters: companyFilters,
      onFilter: (value, record) => record.company_name === value,
    },
    {
      title: "ผู้แจ้ง",
      dataIndex: "requester_name",
    },
    {
      title: "ประเภทงาน",
      dataIndex: "job_type",
    },
    {
      title: "หน่วยงาน",
      dataIndex: "department",
    },
    {
      title: "รายละเอียด",
      dataIndex: "detail",
      render: (text) => <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>,
    },
    {
      title: "ผู้ติดต่อ",
      dataIndex: "contact_name",
    },
    {
      title: "เบอร์โทร",
      dataIndex: "contact_phone",
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      filters: statusFilters,
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        if (status === "SUCCESS") return "สำเร็จ";
        if (status === "PENDING") return "รอดำเนินการ";
        if (status === "CANCEL") return "ยกเลิก";
        return status;
      },
    },
  ];

  return (
    <Card
      title="รายงานการใช้งาน Messenger"
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
      {/* Filter Bar (ยิงไป backend) */}
      <Space style={{ marginBottom: 16 }} wrap>
        <span>ช่วงวันที่:</span>
        <RangePicker
          value={filters.dateRange}
          onChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              dateRange: v,
            }))
          }
        />

        <span>สถานะ:</span>
        <Select
          style={{ width: 160 }}
          placeholder="เลือกสถานะ"
          allowClear
          value={filters.status}
          onChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              status: v,
            }))
          }
          options={[
            { value: "PENDING", label: "รอดำเนินการ" },
            { value: "SUCCESS", label: "สำเร็จ" },
            { value: "CANCEL", label: "ยกเลิก" },
          ]}
        />

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleSearch}
          loading={loading}
        >
          ค้นหา
        </Button>
      </Space>

      {/* Table (มี column filter ที่บริษัท + สถานะ) */}
      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
      />
    </Card>
  );
}