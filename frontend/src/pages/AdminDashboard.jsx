import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, message, Spin } from "antd";
import http from "../api/http";

import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";

export default function AdminDashboard() {
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  const [summary, setSummary] = useState({
    today_bookings: 0,
    total_bookings: 0,
    total_users: 0,
  });

  const [dailyData, setDailyData] = useState([]); // line
  const [companyData, setCompanyData] = useState([]); // bar
  const [statusData, setStatusData] = useState([]); // pie

  // ---------------- Load summary ----------------
  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await http.get("/admin/summary");
      setSummary(res.data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load dashboard summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  // ---------------- Load chart data ----------------
  const loadCharts = async () => {
    setLoadingCharts(true);
    try {
      const [dailyRes, companyRes, statusRes] = await Promise.all([
        http.get("/admin/stats/daily-bookings", { params: { days: 30 } }),
        http.get("/admin/stats/bookings-by-company", {
          params: { limit: 10 },
        }),
        http.get("/admin/stats/bookings-by-status"),
      ]);

      setDailyData(dailyRes.data || []);
      setCompanyData(companyRes.data || []);
      setStatusData(statusRes.data || []);
    } catch (err) {
      console.error(err);
      message.error("Failed to load chart data");
    } finally {
      setLoadingCharts(false);
    }
  };

  useEffect(() => {
    loadSummary();
    loadCharts();
  }, []);

  // ---------------- Nivo data transform ----------------

  const lineData = [
    {
      id: "Bookings",
      data: (dailyData || []).map((item) => ({
        x: item.date, // e.g. "2025-12-04"
        y: item.count,
      })),
    },
  ];

  const barData = (companyData || []).map((item) => ({
    company: item.company,
    count: item.count,
  }));

  // แปลง SUCCESS -> Completed ฯลฯ สำหรับ Pie
  const pieData = (statusData || []).map((item) => {
    const rawId = item.id || item.status || item.label;

    let friendly = rawId;
    if (rawId === "SUCCESS") friendly = "Completed";
    else if (rawId === "PENDING") friendly = "Pending";
    else if (rawId === "CANCEL") friendly = "Cancelled";

    return {
      ...item,
      id: friendly,
      label: friendly,
    };
  });

  return (
    <>
      {/* --------- Top summary cards --------- */}
      <Spin spinning={loadingSummary}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title="Bookings Today" value={summary.today_bookings} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title="Total Bookings" value={summary.total_bookings} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic title="Total Users" value={summary.total_users} />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* --------- Charts row 1 --------- */}
      <Spin spinning={loadingCharts}>
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          {/* Line chart: bookings by day */}
          <Col xs={24} md={14}>
            <Card title="Bookings in Last 30 Days">
              <div style={{ height: 320 }}>
                <ResponsiveLine
                  data={lineData}
                  margin={{ top: 30, right: 30, bottom: 50, left: 60 }}
                  xScale={{ type: "point" }}
                  yScale={{
                    type: "linear",
                    min: 0,
                    max: "auto",
                    stacked: false,
                  }}
                  axisBottom={{
                    orient: "bottom",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Date",
                    legendOffset: 40,
                    legendPosition: "middle",
                  }}
                  axisLeft={{
                    orient: "left",
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Bookings",
                    legendOffset: 0,
                    legendPosition: "middle",
                  }}
                  pointSize={6}
                  useMesh={true}
                  enableArea={true}
                  areaOpacity={0.1}
                  lineWidth={2}
                />
              </div>
            </Card>
          </Col>

          {/* Pie chart: by status */}
          <Col xs={24} md={10}>
            <Card title="Bookings by Status">
              <div style={{ height: 320 }}>
                <ResponsivePie
                  data={pieData}
                  margin={{ top: 30, right: 30, bottom: 40, left: 30 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  borderWidth={1}
                  borderColor={{
                    from: "color",
                    modifiers: [["darker", 0.2]],
                  }}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#333333"
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: "color" }}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor={{
                    from: "color",
                    modifiers: [["darker", 2]],
                  }}
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* --------- Charts row 2 --------- */}
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          {/* Bar chart: bookings by company */}
          <Col span={24}>
            <Card title="Top Companies by Bookings">
              <div style={{ height: 360 }}>
                <ResponsiveBar
                  data={barData}
                  keys={["count"]}
                  indexBy="company"
                  margin={{ top: 30, right: 30, bottom: 80, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: "linear" }}
                  indexScale={{ type: "band", round: true }}
                  borderWidth={1}
                  borderColor={{
                    from: "color",
                    modifiers: [["darker", 1.6]],
                  }}
                  axisBottom={{
                    tickRotation: 0,
                    legend: "Company",
                    legendPosition: "middle",
                    legendOffset: 60,
                  }}
                  axisLeft={{
                    legend: "Bookings",
                    legendPosition: "middle",
                    legendOffset: -45,
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{
                    from: "color",
                    modifiers: [["darker", 1.6]],
                  }}
                  animate={true}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </>
  );
}