"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

const chartData = [
  { month: "Jan", masuk: 1, keluar: 0 },
  { month: "Feb", masuk: 2, keluar: 1 },
  { month: "Mar", masuk: 1, keluar: 0 },
  { month: "Apr", masuk: 3, keluar: 2 },
  { month: "May", masuk: 0, keluar: 1 },
  { month: "Jun", masuk: 2, keluar: 0 },
  { month: "Jul", masuk: 1, keluar: 1 },
  { month: "Aug", masuk: 4, keluar: 2 },
  { month: "Sep", masuk: 2, keluar: 1 },
  { month: "Oct", masuk: 1, keluar: 0 },
  { month: "Nov", masuk: 0, keluar: 1 },
  { month: "Dec", masuk: 1, keluar: 2 },
]

const chartConfig = {
  masuk: {
    label: "Pegawai Masuk",
    color: "hsl(var(--chart-1))",
  },
  keluar: {
    label: "Pegawai Keluar",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function TurnoverChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            allowDecimals={false}
          />
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="masuk" fill="var(--color-masuk)" radius={4} />
          <Bar dataKey="keluar" fill="var(--color-keluar)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
