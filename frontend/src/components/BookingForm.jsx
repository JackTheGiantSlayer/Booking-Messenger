import React, { useEffect, useState } from "react";
import { Form, Input, Select, DatePicker, TimePicker, Button, Card, Space } from "antd";
import dayjs from "dayjs";
import http from "../api/http";

const { TextArea } = Input;

export default function BookingForm({ onSuccess }) {
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
        building: values.building,
        floor: values.floor,
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
      };
      await http.post("/bookings", payload);
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
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
        initialValues={{
          booking_date: dayjs(),
        }}
      >
        <Form.Item
          label="บริษัท"
          name="company_id"
          rules={[{ required: true, message: "กรุณาเลือกบริษัท" }]}
        >
          <Select
            placeholder="เลือกบริษัท"
            loading={loadingCompanies}
            options={companies.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <Space style={{ width: "100%" }} size="large">
          <Form.Item
            label="วันที่จอง"
            name="booking_date"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "กรุณาเลือกวันที่" }]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            label="เวลา"
            name="booking_time"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "กรุณาเลือกเวลา" }]}
          >
            <TimePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
        </Space>

        <Form.Item
          label="ชื่อผู้แจ้ง"
          name="requester_name"
          rules={[{ required: true, message: "กรุณากรอกชื่อผู้แจ้ง" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="ประเภทงาน"
          name="job_type"
          rules={[{ required: true, message: "กรุณากรอกประเภทงาน" }]}
        >
          <Input placeholder="เช่น ส่งเอกสาร, รับเอกสาร ฯลฯ" />
        </Form.Item>

        <Form.Item
          label="รายละเอียด"
          name="detail"
          rules={[{ required: true, message: "กรุณากรอกรายละเอียด" }]}
        >
          <TextArea rows={4} />
        </Form.Item>

        <Space style={{ width: "100%" }} size="large">
          <Form.Item
            label="หน่วยงาน"
            name="department"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "กรุณากรอกหน่วยงาน" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="อาคาร"
            name="building"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "กรุณากรอกอาคาร" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="ชั้น"
            name="floor"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "กรุณากรอกชั้น" }]}
          >
            <Input />
          </Form.Item>
        </Space>

        <Space style={{ width: "100%" }} size="large">
          <Form.Item
            label="ชื่อผู้ติดต่อ"
            name="contact_name"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "กรุณากรอกชื่อผู้ติดต่อ" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="เบอร์โทร"
            name="contact_phone"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "กรุณากรอกเบอร์โทร" }]}
          >
            <Input />
          </Form.Item>
        </Space>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            บันทึกการจอง
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
