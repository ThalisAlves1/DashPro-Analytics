"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Trash2,
} from "lucide-react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type SavedChartData = {
  name: string;
  value: number;
};

type SavedChart = {
  id: string;
  title: string;
  chartType: "bar" | "line" | "pie";
  xAxisColumn: string;
  yAxisColumn: string;
  data: SavedChartData[];
  createdAt: string;
};

export default function GraficosSalvosPage() {
  const [charts, setCharts] = useState<SavedChart[]>([]);

  useEffect(() => {
    const savedCharts = JSON.parse(
      localStorage.getItem("dashpro_charts") || "[]"
    );

    setCharts(savedCharts);
  }, []);

  function deleteChart(chartId: string) {
    const updatedCharts = charts.filter((chart) => chart.id !== chartId);

    setCharts(updatedCharts);
    localStorage.setItem("dashpro_charts", JSON.stringify(updatedCharts));
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gráficos salvos
          </h1>
          <p className="mt-1 text-gray-500">
            Visualize os gráficos que foram salvos no dashboard.
          </p>
        </div>

        {charts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Nenhum gráfico salvo ainda
            </h2>
            <p className="mt-2 text-gray-500">
              Importe uma planilha, gere um gráfico e clique em salvar.
            </p>
          </div>
        ) : (
          <section className="grid gap-6 xl:grid-cols-2">
            {charts.map((chart) => (
              <div
                key={chart.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      {chart.chartType === "bar" && <BarChart3 size={20} />}
                      {chart.chartType === "line" && (
                        <LineChartIcon size={20} />
                      )}
                      {chart.chartType === "pie" && <PieChartIcon size={20} />}

                      <h2 className="text-lg font-semibold text-gray-900">
                        {chart.title}
                      </h2>
                    </div>

                    <p className="text-sm text-gray-500">
                      Criado em{" "}
                      {new Date(chart.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteChart(chart.id)}
                    className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                    title="Excluir gráfico"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.chartType === "bar" ? (
                      <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    ) : chart.chartType === "line" ? (
                      <LineChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          strokeWidth={3}
                        />
                      </LineChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={chart.data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          label
                        >
                          {chart.data.map((_, index) => (
                            <Cell key={`cell-${index}`} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}