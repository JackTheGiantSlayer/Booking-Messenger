import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Card,
  Space,
  message,
} from "antd";
import dayjs from "dayjs";
import http from "../api/http";

const { TextArea } = Input;
const { Option } = Select;

export default function BookingForm() {
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    async function fetchCompanies() {
      setLoadingCompanies(true);
      try {
        const res = await http.get("/bookings/companies");
        setCompanies(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCompanies(false);
      }
    }
    fetchCompanies();
  }, []);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        company_id: values.company_id,
        booking_date: values.booking_date.format("YYYY-MM-DD"),
        booking_time: values.booking_time.format("HH:mm"),
        requester_name: values.requester_name,
        job_type: values.job_type,
        detail: values.detail,
        department: values.department,
        building: values.building || "",  // ✅ ว่างได้
        floor: values.floor || "",        // ✅ ว่างได้
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
      };

      const res = await http.post("/bookings", payload);
      const bookingId = res.data.booking_id;
      if (!bookingId) {
        message.error("ไม่พบ booking_id จาก backend");
        return;
      }

      message.success("บันทึกสำเร็จ! กำลังดาวน์โหลดใบจอง...");

      const pdfRes = await http.get(`/bookings/${bookingId}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([pdfRes.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `booking_${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      form.resetFields();
    } catch (err) {
      console.error(err);
      message.error("บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="ฟอร์มจอง Messenger">
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        initialValues={{ booking_date: dayjs() }}
      >
        <Form.Item
          label="Company"
          name="company_id"
          rules={[{ required: true, message: "Please choose company" }]}
        >
          <Select
            placeholder="Choose company"
            loading={loadingCompanies}
            options={companies.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <Space style={{ width: "100%" }} size="large">
          <Form.Item
            label="Booking date"
            name="booking_date"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "Please choose date" }]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            label="Booking time"
            name="booking_time"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "Please choose time" }]}
          >
            <TimePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
        </Space>

        <Form.Item
          label="Request name"
          name="requester_name"
          rules={[{ required: true, message: "Please input Request name" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Job type"
          name="job_type"
          rules={[{ required: true, message: "Please select job type" }]}
        >
          <Select placeholder="Select job type">
            <Option value="send">send</Option>
            <Option value="receive">receive</Option>
            <Option value="send+receive">send+receive</Option>
            <Option value="buy">buy</Option>
            <Option value="sell">sell</Option>
            <Option value="deposit">deposit</Option>
            <Option value="other">other</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Description"
          name="detail"
          rules={[{ required: true, message: "Please input your description" }]}
        >
          <TextArea rows={4} />
        </Form.Item>

        <Space style={{ width: "100%" }} size="large">
          <Form.Item
            label="Customer name"
            name="department"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "Please input customer name" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Building"
            name="building"
            style={{ flex: 1 }}
            rules={[]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Floor"
            name="floor"
            style={{ flex: 1 }}
            rules={[]}
          >
            <Input />
          </Form.Item>
        </Space>

        <Space style={{ width: "100%" }} size="large">
          <Form.Item
            label="Contact name"
            name="contact_name"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "Please input contact name" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Telephone"
            name="contact_phone"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "Please input telephone" }]}
          >
            <Input />
          </Form.Item>
        </Space>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Submit & Print
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}