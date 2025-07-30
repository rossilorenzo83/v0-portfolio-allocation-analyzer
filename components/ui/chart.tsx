"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Area,
  AreaChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  type LayoutType,
  type BarChartProps,
  type LineChartProps,
  type AreaChartProps,
  type RadialBarChartProps,
  type PieChartProps,
  type ScatterChartProps,
} from "recharts"
import { type ChartConfig, ChartContainer, ChartLegendContent, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

// Define types for common chart props
type CommonChartProps = {
  data: Record<string, any>[]
  config: ChartConfig
  className?: string
  children?: React.ReactNode
  layout?: LayoutType
}

// Define specific chart component props
type ChartComponentProps =
  | ({ type: "line" } & LineChartProps)
  | ({ type: "bar" } & BarChartProps)
  | ({ type: "area" } & AreaChartProps)
  | ({ type: "pie" } & PieChartProps)
  | ({ type: "radialbar" } & RadialBarChartProps)
  | ({ type: "scatter" } & ScatterChartProps)

type ChartProps = CommonChartProps & ChartComponentProps

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
  ({ data, config, className, children, type, layout = "horizontal", ...props }, ref) => {
    const chartProps = {
      data,
      layout,
      ...props,
    } as any // Use 'any' for now due to complex union types

    const renderChart = () => {
      switch (type) {
        case "line":
          return (
            <LineChart {...chartProps}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={Object.keys(config).find((key) => config[key].type === "category")}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}`} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend content={<ChartLegendContent />} />
              {Object.entries(config).map(([key, item]) =>
                item.type === "value" && item.component === "line" ? (
                  <Line key={key} dataKey={key} stroke={item.color} dot={false} activeDot={{ r: 6 }} />
                ) : null,
              )}
              {children}
            </LineChart>
          )
        case "bar":
          return (
            <BarChart {...chartProps}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={Object.keys(config).find((key) => config[key].type === "category")}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}`} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend content={<ChartLegendContent />} />
              {Object.entries(config).map(([key, item]) =>
                item.type === "value" && item.component === "bar" ? (
                  <Bar key={key} dataKey={key} fill={item.color} radius={[4, 4, 0, 0]} />
                ) : null,
              )}
              {children}
            </BarChart>
          )
        case "area":
          return (
            <AreaChart {...chartProps}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={Object.keys(config).find((key) => config[key].type === "category")}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${value}`} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend content={<ChartLegendContent />} />
              {Object.entries(config).map(([key, item]) =>
                item.type === "value" && item.component === "area" ? (
                  <Area key={key} dataKey={key} type="monotone" stroke={item.color} fill={item.color} />
                ) : null,
              )}
              {children}
            </AreaChart>
          )
        case "pie":
          return (
            <PieChart {...chartProps}>
              <Tooltip content={<ChartTooltipContent />} />
              <Legend content={<ChartLegendContent />} />
              {Object.entries(config).map(([key, item]) =>
                item.type === "value" && item.component === "pie" ? (
                  <Pie
                    key={key}
                    dataKey={key}
                    nameKey={Object.keys(config).find((k) => config[k].type === "category")}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill={item.color}
                    label
                  />
                ) : null,
              )}
              {children}
            </PieChart>
          )
        case "radialbar":
          return (
            <RadialBarChart {...chartProps} innerRadius="10%" outerRadius="80%" startAngle={90} endAngle={-270}>
              <RadialBar
                minAngle={15}
                label={{ position: "insideStart", fill: "#fff" }}
                background
                clockWise
                dataKey={Object.keys(config).find((key) => config[key].type === "value")}
              />
              <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
              <Tooltip content={<ChartTooltipContent />} />
              {children}
            </RadialBarChart>
          )
        case "scatter":
          return (
            <ScatterChart {...chartProps}>
              <CartesianGrid />
              <XAxis
                type="number"
                dataKey={Object.keys(config).find((key) => config[key].type === "category")}
                name="stdev"
              />
              <YAxis
                type="number"
                dataKey={Object.keys(config).find((key) => config[key].type === "value")}
                name="return"
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
              <Legend />
              {Object.entries(config).map(([key, item]) =>
                item.type === "value" && item.component === "scatter" ? (
                  <Scatter key={key} dataKey={key} fill={item.color} />
                ) : null,
              )}
              {children}
            </ScatterChart>
          )
        default:
          return null
      }
    }

    return (
      <ChartContainer ref={ref} config={config} className={cn("min-h-[200px] w-full", className)} {...props}>
        {renderChart()}
      </ChartContainer>
    )
  },
)

Chart.displayName = "Chart"

export { Chart }
