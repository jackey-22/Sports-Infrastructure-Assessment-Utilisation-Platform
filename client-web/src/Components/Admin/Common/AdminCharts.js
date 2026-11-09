import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Card, SectionHeader } from "./AdminUI";

const AXIS_COLOR = "#64748b";
const GRID_COLOR = "#e2e8f0";
const reducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ChartCard({ title, description, action, children, className = "" }) {
  return (
    <Card className={className}>
      <SectionHeader title={title} description={description} action={action} />
      <div className="px-1 pb-2 pt-3 sm:px-2">{children}</div>
    </Card>
  );
}

function baseOptions({ categories, colors, formatValue }) {
  return {
    chart: {
      toolbar: { show: false },
      background: "transparent",
      foreColor: AXIS_COLOR,
      fontFamily: "inherit",
      parentHeightOffset: 0,
      animations: { enabled: !reducedMotion, speed: 350 },
    },
    theme: { mode: "light" },
    colors,
    dataLabels: { enabled: false },
    grid: {
      borderColor: GRID_COLOR,
      strokeDashArray: 3,
      padding: { left: 8, right: 8, top: 0, bottom: 0 },
    },
    legend: {
      labels: { colors: "#334155" },
      fontSize: "12px",
      markers: { radius: 4 },
      itemMargin: { horizontal: 8, vertical: 2 },
    },
    tooltip: {
      theme: "light",
      // ApexCharts reads tooltip.y.formatter even when y is omitted from a merge.
      // An undefined y crashes the insights page before any chart paints.
      y: {
        formatter: (value) => (formatValue ? formatValue(value) : value),
      },
    },
    xaxis: {
      categories,
      labels: { style: { colors: AXIS_COLOR, fontSize: "11px" } },
      axisBorder: { color: "#cbd5e1" },
      axisTicks: { color: "#cbd5e1" },
    },
    yaxis: {
      labels: {
        style: { colors: AXIS_COLOR, fontSize: "11px" },
        formatter: formatValue,
      },
    },
    noData: { text: "No data for this filter", style: { color: "#64748b", fontSize: "12px" } },
  };
}

export function TrendChart({
  series,
  categories,
  colors = ["#10b981"],
  height = 260,
  area = false,
  formatValue,
}) {
  const options = useMemo(() => {
    const base = baseOptions({ categories, colors, formatValue });
    return {
      ...base,
      stroke: { curve: "smooth", width: 2.5 },
      fill: area
        ? {
            type: "gradient",
            gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 95] },
          }
        : { opacity: 1 },
      markers: { size: 0, hover: { size: 4 } },
    };
  }, [categories, colors, area, formatValue]);

  return (
    <ReactApexChart
      type={area ? "area" : "line"}
      options={options}
      series={series}
      height={height}
      width="100%"
    />
  );
}

export function BarChart({
  series,
  categories,
  colors = ["#10b981"],
  height = 280,
  horizontal = false,
  stacked = false,
  distributed = false,
  formatValue,
}) {
  const options = useMemo(() => {
    const base = baseOptions({ categories, colors, formatValue });
    return {
      ...base,
      chart: { ...base.chart, type: "bar" },
      plotOptions: {
        bar: {
          horizontal,
          distributed: distributed && !stacked,
          borderRadius: 4,
          borderRadiusApplication: "end",
          columnWidth: "55%",
          barHeight: "60%",
        },
      },
      stroke: { show: stacked, width: stacked ? 1 : 0, colors: ["#ffffff"] },
      xaxis: {
        ...base.xaxis,
        labels: {
          ...base.xaxis.labels,
          rotate: horizontal ? 0 : -25,
          trim: true,
          // In a horizontal bar the x-axis is the value axis.
          formatter: horizontal ? formatValue : undefined,
        },
      },
      yaxis: {
        ...base.yaxis,
        labels: {
          ...base.yaxis.labels,
          // In a horizontal bar the y-axis holds category names, which must not
          // be run through the number formatter (that rendered them as "0").
          formatter: horizontal ? undefined : formatValue,
          maxWidth: horizontal ? 140 : undefined,
        },
      },
      fill: { opacity: 1 },
      legend: distributed ? { show: false } : base.legend,
    };
  }, [categories, colors, horizontal, stacked, distributed, formatValue]);

  return (
    <ReactApexChart
      type="bar"
      options={options}
      series={series}
      height={height}
      width="100%"
    />
  );
}

export function DonutChart({
  series,
  labels,
  colors = ["#f59e0b", "#10b981"],
  height = 260,
  formatValue,
}) {
  const options = useMemo(
    () => ({
      chart: {
        type: "donut",
        background: "transparent",
        foreColor: AXIS_COLOR,
        fontFamily: "inherit",
        animations: { enabled: !reducedMotion, speed: 350 },
      },
      theme: { mode: "light" },
      labels,
      colors,
      dataLabels: { enabled: false },
      legend: {
        position: "bottom",
        labels: { colors: "#334155" },
        fontSize: "12px",
        markers: { radius: 4 },
      },
      stroke: { colors: ["#ffffff"], width: 2 },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              name: { color: "#64748b", fontSize: "12px" },
              value: {
                color: "#0B3D2E",
                fontSize: "22px",
                fontWeight: 800,
                formatter: formatValue,
              },
              total: {
                show: true,
                label: "Total",
                color: "#64748b",
                fontSize: "11px",
                formatter: formatValue
                  ? (chart) =>
                      formatValue(
                        chart.globals.seriesTotals.reduce((a, b) => a + b, 0)
                      )
                  : undefined,
              },
            },
          },
        },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (value) => (formatValue ? formatValue(value) : value),
        },
      },
      noData: { text: "No data for this filter", style: { color: "#64748b", fontSize: "12px" } },
    }),
    [labels, colors, formatValue]
  );

  return <ReactApexChart type="donut" options={options} series={series} height={height} width="100%" />;
}
