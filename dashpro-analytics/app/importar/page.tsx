"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import {
  Upload,
  FileSpreadsheet,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Table,
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

type ImportedRow = Record<string, string | number | boolean | null>;
type ChartType = "bar" | "line" | "pie";

type Dashboard = {
  id: string;
  name: string;
};

export default function ImportarPage() {
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [error, setError] = useState("");

  const [xAxisColumn, setXAxisColumn] = useState("");
  const [yAxisColumn, setYAxisColumn] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");

  // ---------------------------
  // Estados para dashboards
  // ---------------------------
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");

  // ---------------------------
  // Buscar dashboards do usuário
  // ---------------------------
 useEffect(() => {
  async function fetchDashboards() {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      console.log("Usuário não autenticado.");
      return;
    }

    const userId = userData.user.id;

    const { data: dashboardsData, error: dashboardsError } = await supabase
      .from("dashboards")
      .select("*")
      .eq("user_id", userId);

    if (dashboardsError) {
      console.log("Erro ao buscar dashboards:", dashboardsError.message);
      return;
    }

    setDashboards(dashboardsData || []);

    if (dashboardsData && dashboardsData.length > 0) {
      setSelectedDashboard(dashboardsData[0].id);
    }
  }

  fetchDashboards();
}, []);

  // ---------------------------
  // Importação CSV/Excel
  // ---------------------------
  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);
    setColumns([]);
    setRows([]);
    setXAxisColumn("");
    setYAxisColumn("");

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") readCsv(file);
    else if (extension === "xlsx" || extension === "xls") readExcel(file);
    else setError("Formato inválido. Envie CSV, XLSX ou XLS.");
  }

  function readCsv(file: File) {
    Papa.parse<ImportedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => applyImportedData(result.data),
      error: () => setError("Erro ao ler CSV."),
    });
  }

  function readExcel(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer) return;

        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<ImportedRow>(sheet, {
          defval: null,
        });
        applyImportedData(jsonData);
      } catch {
        setError("Erro ao ler Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function applyImportedData(data: ImportedRow[]) {
    if (!data.length) return setError("Arquivo vazio.");
    const detectedColumns = Object.keys(data[0]);
    setColumns(detectedColumns);
    setRows(data);
    setXAxisColumn(detectedColumns[0] || "");
    setYAxisColumn(detectedColumns[1] || "");
  }

  function parseNumber(value: unknown) {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const normalized = value.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
      const number = Number(normalized);
      return Number.isNaN(number) ? 0 : number;
    }
    return 0;
  }

  // ---------------------------
  // Gerar dados do gráfico
  // ---------------------------
  const chartData = useMemo(() => {
    if (!xAxisColumn || !yAxisColumn) return [];
    return rows.map((row) => ({
      name: String(row[xAxisColumn] ?? ""),
      value: parseNumber(row[yAxisColumn]),
    }));
  }, [rows, xAxisColumn, yAxisColumn]);

  const canRenderChart = rows.length > 0 && xAxisColumn && yAxisColumn && chartData.length > 0;

  // ---------------------------
  // Função de salvar gráfico no Supabase
  // ---------------------------
 async function saveChartToSupabase() {
  if (!canRenderChart || !selectedDashboard) {
    alert("Gere o gráfico e selecione um dashboard!");
    return;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    alert("Usuário não autenticado.");
    return;
  }

  const { error } = await supabase.from("charts").insert({
    dashboard_id: selectedDashboard,
    title: `${yAxisColumn} por ${xAxisColumn}`,
    chart_type: chartType,
    x_axis_column: xAxisColumn,
    y_axis_column: yAxisColumn,
    data: chartData,
  });

  if (error) {
    alert("Erro ao salvar gráfico: " + error.message);
    return;
  }

  alert("Gráfico salvo com sucesso!");
}

  const previewRows = rows.slice(0, 10);

  return (
    <main className="min-h-screen bg-gray-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Importar dados</h1>

        {/* Upload */}
        <div className="mb-6 flex gap-2 items-center">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800">
            <Upload size={18} />
            Selecionar arquivo
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </label>
          {fileName && <span>{fileName}</span>}
        </div>

        {columns.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
            {/* Dropdown para dashboard */}
            <div className="mb-4">
              <label className="block mb-1 font-medium text-gray-700">Escolha o dashboard</label>
              <select
                className="rounded-xl border border-gray-300 px-4 py-2"
                value={selectedDashboard}
                onChange={(e) => setSelectedDashboard(e.target.value)}
              >
                {dashboards.map((dash) => (
                  <option key={dash.id} value={dash.id}>{dash.name}</option>
                ))}
              </select>
            </div>

            {/* Escolha X/Y e tipo */}
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Eixo X</label>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={xAxisColumn}
                  onChange={(e) => setXAxisColumn(e.target.value)}
                >
                  {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Eixo Y</label>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={yAxisColumn}
                  onChange={(e) => setYAxisColumn(e.target.value)}
                >
                  {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Tipo de gráfico</label>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                >
                  <option value="bar">Barras</option>
                  <option value="line">Linha</option>
                  <option value="pie">Pizza</option>
                </select>
              </div>
            </div>

            {/* Botão salvar */}
            <button
              onClick={saveChartToSupabase}
              className="rounded-xl bg-gray-900 px-5 py-2 text-white hover:bg-gray-800"
            >
              Salvar gráfico
            </button>
          </div>
        )}

        {/* Prévia do gráfico */}
        {canRenderChart && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">{yAxisColumn} por {xAxisColumn}</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" radius={[8,8,0,0]} /></BarChart>
                ) : chartType === "line" ? (
                  <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" strokeWidth={3} /></LineChart>
                ) : (
                  <PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>{chartData.map((_,i)=><Cell key={i} />)}</Pie><Tooltip /></PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}