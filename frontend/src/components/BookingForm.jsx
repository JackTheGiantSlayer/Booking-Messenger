import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Radio,
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
  const [timeMode, setTimeMode] = useState("morning"); // morning | afternoon | custom
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Load Companies
  useEffect(() => {
    async function loadCompanies() {
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
    loadCompanies();
  }, []);

  // Submit Booking
  const onFinish = async (values) => {
    setSubmitting(true);

    try {
      // ---- map time mode -> string HH:mm ----
      let booking_time = "11:59:59"; // default — morning

      if (timeMode === "afternoon") {
        booking_time = "16:29:59";
      } else if (timeMode === "custom" && values.booking_time) {
        booking_time = values.booking_time.format("HH:mm");
      }

      const payload = {
        company_id: values.company_id,
        booking_date: values.booking_date.format("YYYY-MM-DD"),
        booking_time, // 👉 ส่งเป็น HH:mm
        requester_name: values.requester_name,
        job_type: values.job_type,
        detail: values.detail,
        department: values.department,
        building: values.building || "",
        floor: values.floor || "",
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
      };

      const res = await http.post("/bookings", payload);
      const bookingId = res.data.booking_id;

      // Download PDF
      const pdfRes = await http.get(`/bookings/${bookingId}/pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(
        new Blob([pdfRes.data], { type: "application/pdf" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking_${bookingId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      form.resetFields();
      setTimeMode("morning");
      message.success("Booking saved successfully ✔");
    } catch (err) {
      console.error(err);
      message.error("Failed to save booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Messenger Booking Form">
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        initialValues={{ booking_date: dayjs() }}
      >
        {/* Company */}
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

        {/* Date + Time Mode */}
        <Space style={{ width: "100%" }} size="large">
          <Form.Item
            label="Booking Date"
            name="booking_date"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "Please choose date" }]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Time Type" style={{ flex: 1 }}>
            <Radio.Group
              value={timeMode}
              onChange={(e) => setTimeMode(e.target.value)}
            >
              <Radio value="morning">เช้า</Radio>
              <Radio value="afternoon">บ่าย</Radio>
              <Radio value="custom">ระบุเวลา</Radio>
            </Radio.Group>
          </Form.Item>

          {/* TimePicker แสดงเฉพาะตอนเลือก custom */}
          {timeMode === "custom" && (
            <Form.Item
              label="Select time"
              name="booking_time"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Please select time" }]}
            >
              <TimePicker
                format="HH:mm"          // ✅ ไม่มีวินาทีแล้ว
                style={{ width: "100%" }}
              />
            </Form.Item>
          )}
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
          rules={[
            { required: true, message: "Please input your description" },
          ]}
        >
          <TextArea rows={4} />
        </Form.Item>

        <Space style={{ width: "100%" }} size="large">
          <Form.Item
            label="Customer name"
            name="department"
            style={{ flex: 1 }}
            rules={[
              { required: true, message: "Please input customer name" },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Building" name="building" style={{ flex: 1 }}>
            <Input />
          </Form.Item>

          <Form.Item label="Floor" name="floor" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </Space>

        <Space style={{ width: "100%" }} size="large">
          <Form.Item
            label="Contact name"
            name="contact_name"
            style={{ flex: 1 }}
            rules={[
              { required: true, message: "Please input contact name" },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Telephone"
            name="contact_phone"
            style={{ flex: 1 }}
            rules={[
              { required: true, message: "Please input telephone" },
            ]}
          >
            <Input />
          </Form.Item>
        </Space>

        <Button type="primary" htmlType="submit" loading={submitting} block>
          Submit & Print
        </Button>
      </Form>
    </Card>
  );
}