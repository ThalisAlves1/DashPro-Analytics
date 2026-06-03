"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  FileSpreadsheet,
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

import { supabase } from "@/lib/supabase";

type SavedChartData = {
  name: string;
  value: number;
};

type SavedChart = {
  id: string;
  dashboard_id: string;
  title: string;
  chartType: "bar" | "line" | "pie";
  xAxisColumn: string;
  yAxisColumn: string;
  data: SavedChartData[];
  createdAt: string;
};

type Dashboard = {
  id: string;
  name: string;
};

export default function DashboardPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboardId, setActiveDashboardId] = useState<string>("");
  const [charts, setCharts] = useState<SavedChart[]>([]);

  useEffect(() => {
    async function fetchDashboards() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
if (userError || !userData.user) return;
const userId = userData.user.id;
      if (!userId) return;

      const { data: dashboardsData } = await supabase
        .from("dashboards")
        .select("*")
        .eq("user_id", userId);

      setDashboards(dashboardsData || []);
      if (dashboardsData && dashboardsData.length > 0) {
        setActiveDashboardId(dashboardsData[0].id);
      }
    }

    fetchDashboards();
  }, []);

  useEffect(() => {
    async function fetchCharts() {
      if (!activeDashboardId) return;

      const { data: chartsData } = await supabase
        .from("charts")
        .select("*")
        .eq("dashboard_id", activeDashboardId);

      setCharts(chartsData || []);
    }

    fetchCharts();
  }, [activeDashboardId]);

  const totalCharts = charts.length;
  const totalDataPoints = charts.reduce((sum, chart) => sum + chart.data.length, 0);
  const lastChart = charts[charts.length - 1];

  return (
    <main className="flex min-h-screen bg-gray-100 p-6 lg:p-8">
      {/* Sidebar */}
      <aside className="hidden min-h-screen w-64 border-r border-gray-200 bg-white p-5 lg:block">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">DashPro</h1>
        <p className="mb-6 text-sm text-gray-400">Analytics SaaS</p>
<a
  href="/analise-excel"
  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
>
  <FileSpreadsheet size={18} />
  Análise Excel
</a>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Dashboard</label>
          <select
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            value={activeDashboardId}
            onChange={(e) => setActiveDashboardId(e.target.value)}
          >
            {dashboards.map((dash) => (
              <option key={dash.id} value={dash.id}>{dash.name}</option>
            ))}
          </select>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard: {dashboards.find(d=>d.id===activeDashboardId)?.name || "Nenhum"}</h1>
            <p className="text-gray-500">Visualize seus gráficos salvos por dashboard.</p>
          </div>
        </div>

        {/* Cards de resumo */}
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Gráficos criados</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">{totalCharts}</h2>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pontos de dados</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">{totalDataPoints}</h2>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Último gráfico</p>
            <h2 className="mt-2 truncate text-xl font-bold text-gray-900">
              {lastChart?.title || "Nenhum ainda"}
            </h2>
          </div>
        </section>

        {/* Gráficos */}
        {charts.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-gray-900">Nenhum gráfico neste dashboard</h2>
            <p className="mt-2 text-gray-500">
              Crie gráficos no menu de importação para visualizar aqui.
            </p>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-2">
            {charts.map((chart) => (
              <div key={chart.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  {chart.chartType === "bar" && <BarChart3 size={20} />}
                  {chart.chartType === "line" && <LineChartIcon size={20} />}
                  {chart.chartType === "pie" && <PieChartIcon size={20} />}
                  <h2 className="text-lg font-semibold text-gray-900">{chart.title}</h2>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.chartType === "bar" ? (
                      <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" radius={[8,8,0,0]} />
                      </BarChart>
                    ) : chart.chartType === "line" ? (
                      <LineChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" strokeWidth={3} />
                      </LineChart>
                    ) : (
                      <PieChart>
                        <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                          {chart.data.map((_,i)=><Cell key={i}/>)}
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