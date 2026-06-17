"use client";

import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

export function EChartsPanel({
  height = 260,
  option,
}: {
  height?: number;
  option: EChartsOption;
}) {
  return (
    <ReactECharts
      notMerge
      option={option}
      style={{ height, width: "100%" }}
      theme={undefined}
    />
  );
}
