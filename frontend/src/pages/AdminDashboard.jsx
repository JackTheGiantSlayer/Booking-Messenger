import React from "react";
import { Card, Row, Col, Statistic } from "antd";

export default function AdminDashboard() {
  // ตรงนี้อนาคตดึงข้อมูล summary จาก backend เช่น /api/admin/summary
  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="จำนวนการจองวันนี้" value={0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="จำนวนการจองทั้งหมด" value={0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="จำนวนผู้ใช้งานระบบ" value={0} />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="ภาพรวมการใช้งาน Messenger">
            <p>ส่วนนี้สามารถทำกราฟ / ตารางภาพรวมการจอง แยกตามวัน / เวลา / บริษัท ได้</p>
          </Card>
        </Col>
      </Row>
    </>
  );
}