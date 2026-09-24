import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type ChartMode = "value" | "growth";

export type ChartShape =
  | "smooth"
  | "straight"
  | "step"
  | "area"
  | "bar";

type Measurement = {
  value: number;
  measuredAt: string;
};

type DailyGrowthPoint = {
  date: string;
  value: number;
  change: number | null;
};

type Props = {
  mode: ChartMode;
  shape: ChartShape;
  measurements: Measurement[];
  dailyGrowth: DailyGrowthPoint[];
};

export function MetricChart({
  mode,
  shape,
  measurements,
  dailyGrowth
}: Props) {
  const data =
    mode === "value"
      ? measurements.map((measurement) => ({
          x: measurement.measuredAt,
          y: measurement.value
        }))
      : dailyGrowth.map((point) => ({
          x: point.date,
          y: point.change
        }));

  const lineType =
    shape === "straight"
      ? "linear"
      : shape === "step"
        ? "stepAfter"
        : "monotone";

  function formatXAxis(value: string) {
    if (mode === "growth") {
      return new Date(
        `${value}T00:00:00Z`
      ).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit"
      });
    }

    return new Date(value).toLocaleString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }

  function formatTooltipLabel(value: unknown) {
    const raw = String(value);

    if (mode === "growth") {
      return new Date(
        `${raw}T00:00:00Z`
      ).toLocaleDateString("fr-FR");
    }

    return new Date(raw).toLocaleString(
      "fr-FR"
    );
  }

  return (
    <div className="chart">
      <ResponsiveContainer
        width="100%"
        height={380}
      >
        <ComposedChart data={data}>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="#263143"
            vertical={false}
          />

          <XAxis
            dataKey="x"
            tickFormatter={formatXAxis}
            stroke="#64748b"
            tick={{
              fill: "#94a3b8",
              fontSize: 12
            }}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            stroke="#64748b"
            tick={{
              fill: "#94a3b8",
              fontSize: 12
            }}
            tickLine={false}
            axisLine={false}
            domain={
              mode === "value"
                ? ["dataMin - 1", "dataMax + 1"]
                : undefined
            }
          />

          <Tooltip
            labelFormatter={
              formatTooltipLabel
            }
            formatter={(value) => [
              value,
              mode === "value"
                ? "Valeur"
                : "Croissance"
            ]}
            contentStyle={{
              background: "#121820",
              border: "1px solid #2a3545",
              borderRadius: "10px",
              color: "#f8fafc"
            }}
          />

          {shape === "area" && (
            <Area
              type="monotone"
              dataKey="y"
              stroke="currentColor"
              fill="currentColor"
              fillOpacity={0.16}
              strokeWidth={2.5}
              connectNulls
            />
          )}

          {shape === "bar" && (
            <Bar
              dataKey="y"
              fill="currentColor"
              radius={[5, 5, 0, 0]}
            />
          )}

          {shape !== "area" &&
            shape !== "bar" && (
              <Line
                type={lineType}
                dataKey="y"
                stroke="currentColor"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5
                }}
                connectNulls
              />
            )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
