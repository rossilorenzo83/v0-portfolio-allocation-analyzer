"use client"

import * as React from "react"
import {
  Tooltip as RechartsTooltip,
  type TooltipProps,
  Legend as RechartsLegend,
  type LegendProps as RechartsLegendProps, // Declaring the variable here
} from "recharts"
import {
  type ChartConfig,
  ChartContainer as BaseChartContainer,
  ChartTooltipContent as BaseChartTooltipContent,
} from "@/components/ui/chart" // Assuming these are the correct imports from shadcn/ui

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

// Re-exporting the components from shadcn/ui/chart
export {
  ChartContainer as BaseChartContainer,
  ChartTooltip as BaseChartTooltip,
  ChartTooltipContent as BaseChartTooltipContent,
} from "@/components/ui/chart"

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

type ChartContextProps = {
  config: ChartConfig
}

// Custom ChartContainer to ensure it's exported
const ChartContainer = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof BaseChartContainer>>(
  ({ className, ...props }, ref) => (
    <BaseChartContainer ref={ref} className={cn("h-[200px] w-full", className)} {...props} />
  ),
)
ChartContainer.displayName = "ChartContainer"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  )
}

// Custom ChartTooltip to ensure it's exported
const ChartTooltip = ({ ...props }: TooltipProps<any, any>) => {
  return (
    <RechartsTooltip
      cursor={{ strokeDasharray: "8 8" }}
      content={<BaseChartTooltipContent indicator="dashed" className="z-50" {...props} />}
      {...props}
    />
  )
}

ChartTooltip.displayName = "ChartTooltip"

// Custom ChartTooltipContent to ensure it's exported
const ChartTooltipContent = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof BaseChartTooltipContent>>(
  ({ className, ...props }, ref) => <BaseChartTooltipContent ref={ref} className={cn("z-50", className)} {...props} />,
)
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = RechartsLegend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsLegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)

        return (
          <div
            key={item.value}
            className={cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground")}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegend"

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config]
}

const Chart = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof BaseChartContainer> & {
    config: ChartConfig
  }
>(({ className, children, config, ...props }, ref) => (
  <BaseChartContainer ref={ref} className={cn("flex aspect-video w-full", className)} config={config} {...props}>
    {children}
    <ChartTooltip cursor={false} content={<BaseChartTooltipContent hideLabel />} />
  </BaseChartContainer>
))
Chart.displayName = "Chart"

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle, Chart }
