"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Filter,
  TrendingUp,
  TrendingDown,
  Building2,
  Table,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type RawRow = Record<string, unknown>;

type NormalizedRow = {
  id: string;
  sheet: string;
  empresa: string;
  data: Date | null;
  dataKey: string;
  mes: number | null;
  ano: number | null;
  mesAno: string;
  categoria: string;
  regiao: string;
  indicador: string;
  valor: number;
  original: RawRow;
};

type SheetInfo = {
  name: string;
  rows: number;
  columns: string[];
};

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
];

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findColumn(columns: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeText);

  return (
    columns.find((column) => {
      const normalizedColumn = normalizeText(column);

      return normalizedAliases.some(
        (alias) =>
          normalizedColumn === alias || normalizedColumn.includes(alias)
      );
    }) || ""
  );
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;

  const raw = String(value ?? "")
    .replace("R$", "")
    .replace("%", "")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!raw) return 0;

  let normalized = raw;

  if (raw.includes(",") && raw.includes(".")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  }

  const number = Number(normalized);
  return Number.isNaN(number) ? 0 : number;
}

function parseDate(value: unknown) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && value > 20000 && value < 60000) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = String(value).trim();

  if (!text) return null;

  const brMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]) - 1;
    let year = Number(brMatch[3]);

    if (year < 100) year += 2000;

    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoDate = new Date(text);
  return Number.isNaN(isoDate.getTime()) ? null : isoDate;
}

function formatDateKey(date: Date | null) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMonthKey(date: Date | null) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

function sumValues(rows: NormalizedRow[]) {
  return rows.reduce((total, row) => total + row.valor, 0);
}

function uniqueValues(values: Array<string | number | null>) {
  return Array.from(
    new Set(
      values
        .filter((value) => value !== null && value !== "")
        .map((value) => String(value))
    )
  ).sort();
}

function groupSum(rows: NormalizedRow[], keyGetter: (row: NormalizedRow) => string) {
  const result: Record<string, number> = {};

  rows.forEach((row) => {
    const key = keyGetter(row) || "Não informado";
    result[key] = (result[key] || 0) + row.valor;
  });

  return result;
}

function diffDays(start: Date, end: Date) {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / oneDay) + 1;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function pearson(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);

  if (n < 2) return 0;

  const x = xs.slice(0, n);
  const y = ys.slice(0, n);

  const meanX = x.reduce((sum, value) => sum + value, 0) / n;
  const meanY = y.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;

    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }

  const denominator = Math.sqrt(denominatorX * denominatorY);

  if (denominator === 0) return 0;

  return numerator / denominator;
}

function buildPivot(
  rows: NormalizedRow[],
  rowKey: (row: NormalizedRow) => string,
  columnKey: (row: NormalizedRow) => string
) {
  const rowLabels = uniqueValues(rows.map(rowKey));
  const columnLabels = uniqueValues(rows.map(columnKey));

  const matrix = rowLabels.map((rowLabel) => {
    const item: Record<string, string | number> = {
      item: rowLabel,
    };

    columnLabels.forEach((columnLabel) => {
      const total = rows
        .filter(
          (row) => rowKey(row) === rowLabel && columnKey(row) === columnLabel
        )
        .reduce((sum, row) => sum + row.valor, 0);

      item[columnLabel] = total;
    });

    item.Total = columnLabels.reduce(
      (sum, columnLabel) => sum + Number(item[columnLabel] || 0),
      0
    );

    return item;
  });

  return {
    rows: matrix,
    columns: columnLabels,
  };
}

export default function AnaliseExcelPage() {
  const [fileName, setFileName] = useState("");
  const [sheetInfos, setSheetInfos] = useState<SheetInfo[]>([]);
  const [allRows, setAllRows] = useState<NormalizedRow[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [selectedRegioes, setSelectedRegioes] = useState<string[]>([]);
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [mesFiltro, setMesFiltro] = useState("");
  const [anoFiltro, setAnoFiltro] = useState("");
  const [drillYear, setDrillYear] = useState("");
  const [drillMonth, setDrillMonth] = useState("");
  const [error, setError] = useState("");

  function resetFilters() {
    setSelectedEmpresas([]);
    setSelectedCategorias([]);
    setSelectedRegioes([]);
    setDataInicial("");
    setDataFinal("");
    setMesFiltro("");
    setAnoFiltro("");
    setDrillYear("");
    setDrillMonth("");
  }

  async function handleExcelUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setFileName(file.name);
    setSheetInfos([]);
    setAllRows([]);
    setSelectedSheets([]);
    resetFilters();

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "xlsx" && extension !== "xls") {
      setError("Envie um arquivo Excel nos formatos .xlsx ou .xls.");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: true,
      });

      const collectedRows: NormalizedRow[] = [];
      const collectedSheets: SheetInfo[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json<RawRow>(worksheet, {
          defval: "",
          raw: false,
        });

        if (!rawRows.length) {
          collectedSheets.push({
            name: sheetName,
            rows: 0,
            columns: [],
          });
          return;
        }

        const columns = Object.keys(rawRows[0]);

        const empresaColumn = findColumn(columns, [
          "empresa",
          "companhia",
          "cliente",
          "loja",
          "filial",
          "unidade",
        ]);

        const dataColumn = findColumn(columns, [
          "data",
          "dia",
          "date",
          "dt",
          "periodo",
          "período",
        ]);

        const categoriaColumn = findColumn(columns, [
          "categoria",
          "tipo",
          "classe",
          "grupo",
          "segmento",
        ]);

        const regiaoColumn = findColumn(columns, [
          "regiao",
          "região",
          "regional",
          "cidade",
          "estado",
          "local",
          "unidade",
        ]);

        const indicadorColumn = findColumn(columns, [
          "indicador",
          "metrica",
          "métrica",
          "metric",
        ]);

        let valorColumn = findColumn(columns, [
          "valor",
          "total",
          "receita",
          "vendas",
          "quantidade",
          "qtd",
          "resultado",
          "amount",
          "value",
        ]);

        if (!valorColumn) {
          valorColumn =
            columns.find((column) =>
              rawRows.some((row) => parseNumber(row[column]) !== 0)
            ) || "";
        }

        rawRows.forEach((row, index) => {
          const date = parseDate(dataColumn ? row[dataColumn] : null);
          const empresa = empresaColumn
            ? String(row[empresaColumn] || "Não informado")
            : sheetName;

          const normalizedRow: NormalizedRow = {
            id: `${sheetName}-${index}`,
            sheet: sheetName,
            empresa,
            data: date,
            dataKey: formatDateKey(date),
            mes: date ? date.getMonth() + 1 : null,
            ano: date ? date.getFullYear() : null,
            mesAno: formatMonthKey(date),
            categoria: categoriaColumn
              ? String(row[categoriaColumn] || "Não informado")
              : "Não informado",
            regiao: regiaoColumn
              ? String(row[regiaoColumn] || "Não informado")
              : "Não informado",
            indicador: indicadorColumn
              ? String(row[indicadorColumn] || "Principal")
              : "Principal",
            valor: valorColumn ? parseNumber(row[valorColumn]) : 0,
            original: row,
          };

          collectedRows.push(normalizedRow);
        });

        collectedSheets.push({
          name: sheetName,
          rows: rawRows.length,
          columns,
        });
      });

      setSheetInfos(collectedSheets);
      setAllRows(collectedRows);
      setSelectedSheets(collectedSheets.map((sheet) => sheet.name));
    } catch {
      setError("Erro ao ler o arquivo Excel.");
    }
  }

  function handleMultiSelect(
    event: React.ChangeEvent<HTMLSelectElement>,
    setter: (values: string[]) => void
  ) {
    const values = Array.from(event.target.selectedOptions).map(
      (option) => option.value
    );

    setter(values);
  }

  const empresaOptions = useMemo(
    () => uniqueValues(allRows.map((row) => row.empresa)),
    [allRows]
  );

  const categoriaOptions = useMemo(
    () =>
      uniqueValues(allRows.map((row) => row.categoria)).filter(
        (item) => item !== "Não informado"
      ),
    [allRows]
  );

  const regiaoOptions = useMemo(
    () =>
      uniqueValues(allRows.map((row) => row.regiao)).filter(
        (item) => item !== "Não informado"
      ),
    [allRows]
  );

  const anoOptions = useMemo(
    () => uniqueValues(allRows.map((row) => row.ano)),
    [allRows]
  );

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (selectedSheets.length > 0 && !selectedSheets.includes(row.sheet)) {
        return false;
      }

      if (
        selectedEmpresas.length > 0 &&
        !selectedEmpresas.includes(row.empresa)
      ) {
        return false;
      }

      if (
        selectedCategorias.length > 0 &&
        !selectedCategorias.includes(row.categoria)
      ) {
        return false;
      }

      if (selectedRegioes.length > 0 && !selectedRegioes.includes(row.regiao)) {
        return false;
      }

      if (dataInicial && row.dataKey < dataInicial) return false;
      if (dataFinal && row.dataKey > dataFinal) return false;

      if (mesFiltro && row.mes !== Number(mesFiltro)) return false;
      if (anoFiltro && row.ano !== Number(anoFiltro)) return false;

      return true;
    });
  }, [
    allRows,
    selectedSheets,
    selectedEmpresas,
    selectedCategorias,
    selectedRegioes,
    dataInicial,
    dataFinal,
    mesFiltro,
    anoFiltro,
  ]);

  function applyNonDateFilters(row: NormalizedRow) {
    if (selectedSheets.length > 0 && !selectedSheets.includes(row.sheet)) {
      return false;
    }

    if (selectedEmpresas.length > 0 && !selectedEmpresas.includes(row.empresa)) {
      return false;
    }

    if (
      selectedCategorias.length > 0 &&
      !selectedCategorias.includes(row.categoria)
    ) {
      return false;
    }

    if (selectedRegioes.length > 0 && !selectedRegioes.includes(row.regiao)) {
      return false;
    }

    return true;
  }

  const totalGeral = useMemo(() => sumValues(filteredRows), [filteredRows]);

  const companyTotals = useMemo(() => {
    const grouped = groupSum(filteredRows, (row) => row.empresa);

    return Object.entries(grouped)
      .map(([empresa, total]) => ({
        empresa,
        total,
        participacao: totalGeral > 0 ? (total / totalGeral) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRows, totalGeral]);

  const chartCompanies = useMemo(
    () => companyTotals.slice(0, 8).map((item) => item.empresa),
    [companyTotals]
  );

  const dailyData = useMemo(() => {
    const dates = uniqueValues(filteredRows.map((row) => row.dataKey)).filter(
      Boolean
    );

    return dates.map((date) => {
      const item: Record<string, string | number> = {
        data: date,
      };

      chartCompanies.forEach((empresa) => {
        item[empresa] = filteredRows
          .filter((row) => row.dataKey === date && row.empresa === empresa)
          .reduce((sum, row) => sum + row.valor, 0);
      });

      item.Total = filteredRows
        .filter((row) => row.dataKey === date)
        .reduce((sum, row) => sum + row.valor, 0);

      return item;
    });
  }, [filteredRows, chartCompanies]);

  const monthlyData = useMemo(() => {
    const months = uniqueValues(filteredRows.map((row) => row.mesAno)).filter(
      Boolean
    );

    return months.map((month) => {
      const item: Record<string, string | number> = {
        mes: month,
      };

      chartCompanies.forEach((empresa) => {
        item[empresa] = filteredRows
          .filter((row) => row.mesAno === month && row.empresa === empresa)
          .reduce((sum, row) => sum + row.valor, 0);
      });

      item.Total = filteredRows
        .filter((row) => row.mesAno === month)
        .reduce((sum, row) => sum + row.valor, 0);

      return item;
    });
  }, [filteredRows, chartCompanies]);

  const periodComparison = useMemo(() => {
    const datedRows = filteredRows.filter((row) => row.data);

    if (!datedRows.length) {
      return {
        previousTotal: 0,
        growth: null as number | null,
        chartData: [
          { periodo: "Anterior", total: 0 },
          { periodo: "Atual", total: totalGeral },
        ],
      };
    }

    const dates = datedRows.map((row) => row.data as Date);
    const start = new Date(Math.min(...dates.map((date) => date.getTime())));
    const end = new Date(Math.max(...dates.map((date) => date.getTime())));
    const rangeDays = diffDays(start, end);

    const previousStart = addDays(start, -rangeDays);
    const previousEnd = addDays(start, -1);

    const previousRows = allRows.filter((row) => {
      if (!row.data) return false;
      if (!applyNonDateFilters(row)) return false;

      return row.data >= previousStart && row.data <= previousEnd;
    });

    const previousTotal = sumValues(previousRows);

    const growth =
      previousTotal > 0 ? ((totalGeral - previousTotal) / previousTotal) * 100 : null;

    return {
      previousTotal,
      growth,
      chartData: [
        { periodo: "Anterior", total: previousTotal },
        { periodo: "Atual", total: totalGeral },
      ],
    };
  }, [filteredRows, allRows, totalGeral]);

  const mediaDiaria = useMemo(() => {
    const days = uniqueValues(filteredRows.map((row) => row.dataKey)).filter(
      Boolean
    );

    return days.length > 0 ? totalGeral / days.length : 0;
  }, [filteredRows, totalGeral]);

  const mediaMensal = useMemo(() => {
    const months = uniqueValues(filteredRows.map((row) => row.mesAno)).filter(
      Boolean
    );

    return months.length > 0 ? totalGeral / months.length : 0;
  }, [filteredRows, totalGeral]);

  const pivotEmpresaMes = useMemo(
    () =>
      buildPivot(
        filteredRows,
        (row) => row.empresa,
        (row) => row.mesAno || "Sem data"
      ),
    [filteredRows]
  );

  const pivotEmpresaCategoria = useMemo(
    () =>
      buildPivot(
        filteredRows,
        (row) => row.empresa,
        (row) => row.categoria || "Não informado"
      ),
    [filteredRows]
  );

  const pivotEmpresaRegiao = useMemo(
    () =>
      buildPivot(
        filteredRows,
        (row) => row.empresa,
        (row) => row.regiao || "Não informado"
      ),
    [filteredRows]
  );

  const numericColumns = useMemo(() => {
    if (!filteredRows.length) return [];

    const columns = Object.keys(filteredRows[0].original);

    return columns
      .filter((column) =>
        filteredRows.some((row) => parseNumber(row.original[column]) !== 0)
      )
      .slice(0, 6);
  }, [filteredRows]);

  const correlationMatrix = useMemo(() => {
    return numericColumns.map((colA) => {
      const row: Record<string, string | number> = {
        indicador: colA,
      };

      numericColumns.forEach((colB) => {
        const xs = filteredRows.map((item) => parseNumber(item.original[colA]));
        const ys = filteredRows.map((item) => parseNumber(item.original[colB]));

        row[colB] = Number(pearson(xs, ys).toFixed(2));
      });

      return row;
    });
  }, [numericColumns, filteredRows]);

  const drilledRows = useMemo(() => {
    return filteredRows.filter((row) => {
      if (drillYear && row.ano !== Number(drillYear)) return false;
      if (drillMonth && row.mes !== Number(drillMonth)) return false;

      return true;
    });
  }, [filteredRows, drillYear, drillMonth]);

  const maxCompany = companyTotals[0];
  const minCompany = companyTotals[companyTotals.length - 1];

  return (
    <main className="min-h-screen bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-300">
                DashPro Analytics
              </p>
              <h1 className="text-3xl font-bold">
                Análise avançada de Excel
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Carregue um arquivo Excel com várias abas, selecione as
                planilhas desejadas e acompanhe KPIs, comparativos, cruzamentos
                e tabela detalhada em tempo real.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
              <Upload size={18} />
              Carregar Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>
          </div>

          {fileName && (
            <div className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-slate-200">
              Arquivo carregado: <strong>{fileName}</strong>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl bg-red-500/20 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
        </section>

        {allRows.length > 0 && (
          <>
            <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <Filter className="text-slate-800" size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Filtros dinâmicos
                  </h2>
                  <p className="text-sm text-slate-500">
                    Todos os filtros atualizam automaticamente os indicadores e
                    gráficos.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Planilhas
                </label>

                <div className="flex flex-wrap gap-2">
                  {sheetInfos.map((sheet) => {
                    const active = selectedSheets.includes(sheet.name);

                    return (
                      <button
                        key={sheet.name}
                        onClick={() => {
                          setSelectedSheets((current) =>
                            active
                              ? current.filter((item) => item !== sheet.name)
                              : [...current, sheet.name]
                          );
                        }}
                        className={`rounded-2xl border px-4 py-2 text-sm font-medium ${
                          active
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {sheet.name} ({sheet.rows})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Empresa
                  </label>
                  <select
                    multiple
                    value={selectedEmpresas}
                    onChange={(event) =>
                      handleMultiSelect(event, setSelectedEmpresas)
                    }
                    className="h-28 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {empresaOptions.map((empresa) => (
                      <option key={empresa} value={empresa}>
                        {empresa}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-400">
                    Vazio = todas.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Data inicial
                  </label>
                  <input
                    type="date"
                    value={dataInicial}
                    onChange={(event) => setDataInicial(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  />

                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Data final
                  </label>
                  <input
                    type="date"
                    value={dataFinal}
                    onChange={(event) => setDataFinal(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Mês
                  </label>
                  <select
                    value={mesFiltro}
                    onChange={(event) => setMesFiltro(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Todos</option>
                    {Array.from({ length: 12 }).map((_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>

                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Ano
                  </label>
                  <select
                    value={anoFiltro}
                    onChange={(event) => setAnoFiltro(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Todos</option>
                    {anoOptions.map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  {categoriaOptions.length > 0 && (
                    <>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Categoria
                      </label>
                      <select
                        multiple
                        value={selectedCategorias}
                        onChange={(event) =>
                          handleMultiSelect(event, setSelectedCategorias)
                        }
                        className="h-24 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        {categoriaOptions.map((categoria) => (
                          <option key={categoria} value={categoria}>
                            {categoria}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {regiaoOptions.length > 0 && (
                    <>
                      <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                        Região / unidade
                      </label>
                      <select
                        multiple
                        value={selectedRegioes}
                        onChange={(event) =>
                          handleMultiSelect(event, setSelectedRegioes)
                        }
                        className="h-24 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        {regiaoOptions.map((regiao) => (
                          <option key={regiao} value={regiao}>
                            {regiao}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Total geral consolidado"
                value={formatCurrency(totalGeral)}
                subtitle={`${filteredRows.length} registros filtrados`}
                icon={<BarChart3 size={22} />}
              />

              <KpiCard
                title="Média diária"
                value={formatCurrency(mediaDiaria)}
                subtitle="Com base nos dias filtrados"
                icon={<TrendingUp size={22} />}
              />

              <KpiCard
                title="Média mensal"
                value={formatCurrency(mediaMensal)}
                subtitle="Com base nos meses filtrados"
                icon={<FileSpreadsheet size={22} />}
              />

              <KpiCard
                title="Crescimento"
                value={
                  periodComparison.growth === null
                    ? "Sem base"
                    : `${periodComparison.growth.toFixed(2)}%`
                }
                subtitle="Comparado ao período anterior"
                icon={
                  periodComparison.growth !== null &&
                  periodComparison.growth < 0 ? (
                    <TrendingDown size={22} />
                  ) : (
                    <TrendingUp size={22} />
                  )
                }
                alert={
                  periodComparison.growth !== null &&
                  Math.abs(periodComparison.growth) >= 10
                }
              />
            </section>

            <section className="mb-8 grid gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <h2 className="mb-4 text-xl font-semibold text-slate-900">
                  Ranking das empresas
                </h2>

                <div className="space-y-3">
                  {companyTotals.map((company, index) => (
                    <div
                      key={company.empresa}
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {company.empresa}
                            </p>
                            <p className="text-xs text-slate-500">
                              Participação: {company.participacao.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        <strong>{formatCurrency(company.total)}</strong>
                      </div>

                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-slate-950"
                          style={{ width: `${company.participacao}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-slate-900">
                  Destaques automáticos
                </h2>

                {maxCompany && (
                  <div className="mb-4 rounded-2xl bg-green-50 p-4 text-green-800">
                    <p className="text-sm font-medium">Maior resultado</p>
                    <p className="mt-1 font-bold">{maxCompany.empresa}</p>
                    <p>{formatCurrency(maxCompany.total)}</p>
                  </div>
                )}

                {minCompany && maxCompany?.empresa !== minCompany.empresa && (
                  <div className="rounded-2xl bg-orange-50 p-4 text-orange-800">
                    <p className="text-sm font-medium">Menor resultado</p>
                    <p className="mt-1 font-bold">{minCompany.empresa}</p>
                    <p>{formatCurrency(minCompany.total)}</p>
                  </div>
                )}

                {periodComparison.growth !== null &&
                  Math.abs(periodComparison.growth) >= 10 && (
                    <div className="mt-4 flex gap-3 rounded-2xl bg-yellow-50 p-4 text-yellow-800">
                      <AlertTriangle size={22} />
                      <p className="text-sm">
                        Variação significativa detectada no período:
                        <strong> {periodComparison.growth.toFixed(2)}%</strong>
                      </p>
                    </div>
                  )}
              </div>
            </section>

            <section className="mb-8 grid gap-6 xl:grid-cols-2">
              <ChartCard title="Análise diária — empresas por dia">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {chartCompanies.map((empresa, index) => (
                    <Line
                      key={empresa}
                      type="monotone"
                      dataKey={empresa}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={3}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ChartCard>

              <ChartCard title="Participação diária — barras empilhadas">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {chartCompanies.map((empresa, index) => (
                    <Bar
                      key={empresa}
                      dataKey={empresa}
                      stackId="total"
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ChartCard>

              <ChartCard title="Análise mensal — empresas por mês">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {chartCompanies.map((empresa, index) => (
                    <Bar
                      key={empresa}
                      dataKey={empresa}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ChartCard>

              <ChartCard title="Evolução mensal consolidada">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Total"
                    stroke="#0f172a"
                    strokeWidth={4}
                  />
                </LineChart>
              </ChartCard>

              <ChartCard title="Período atual × período anterior">
                <BarChart data={periodComparison.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#0f172a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartCard>
            </section>

            <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">
                Drill-down: Ano → Mês → Dia
              </h2>

              <div className="mb-5 grid gap-4 md:grid-cols-2">
                <select
                  value={drillYear}
                  onChange={(event) => setDrillYear(event.target.value)}
                  className="rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Todos os anos</option>
                  {anoOptions.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>

                <select
                  value={drillMonth}
                  onChange={(event) => setDrillMonth(event.target.value)}
                  className="rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Todos os meses</option>
                  {Array.from({ length: 12 }).map((_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </div>

              <DetailedTable rows={drilledRows.slice(0, 50)} />
            </section>

            <section className="mb-8 grid gap-6">
              <PivotTable
                title="Tabela dinâmica — Empresa × Mês"
                data={pivotEmpresaMes.rows}
                columns={pivotEmpresaMes.columns}
              />

              {categoriaOptions.length > 0 && (
                <PivotTable
                  title="Tabela dinâmica — Empresa × Categoria"
                  data={pivotEmpresaCategoria.rows}
                  columns={pivotEmpresaCategoria.columns}
                />
              )}

              {regiaoOptions.length > 0 && (
                <PivotTable
                  title="Tabela dinâmica — Empresa × Região"
                  data={pivotEmpresaRegiao.rows}
                  columns={pivotEmpresaRegiao.columns}
                />
              )}

              {numericColumns.length > 1 && (
                <PivotTable
                  title="Matriz de correlação entre indicadores"
                  data={correlationMatrix}
                  columns={numericColumns}
                  firstColumnLabel="Indicador"
                />
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <Table size={22} className="text-slate-800" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Tabela detalhada
                  </h2>
                  <p className="text-sm text-slate-500">
                    Drill-through dos registros filtrados. Exibindo até 100
                    linhas.
                  </p>
                </div>
              </div>

              <DetailedTable rows={filteredRows.slice(0, 100)} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  alert,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border bg-white p-6 shadow-sm ${
        alert ? "border-yellow-300" : "border-slate-200"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-800">
          {icon}
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-900">{value}</h2>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{title}</h2>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <p className="mb-2 font-semibold text-slate-900">{label}</p>

      {payload.map((item: any) => (
        <p key={item.dataKey} className="text-sm text-slate-600">
          {item.dataKey}: <strong>{formatCurrency(Number(item.value))}</strong>
        </p>
      ))}
    </div>
  );
}

function PivotTable({
  title,
  data,
  columns,
  firstColumnLabel = "Empresa",
}: {
  title: string;
  data: Record<string, string | number>[];
  columns: string[];
  firstColumnLabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{title}</h2>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700">
                {firstColumnLabel}
              </th>

              {columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700"
                >
                  {column}
                </th>
              ))}

              <th className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="whitespace-nowrap border-b px-4 py-3 font-medium text-slate-800">
                  {String(row.item || row.indicador || "")}
                </td>

                {columns.map((column) => (
                  <td
                    key={column}
                    className="whitespace-nowrap border-b px-4 py-3 text-slate-600"
                  >
                    {typeof row[column] === "number"
                      ? formatNumber(Number(row[column]))
                      : String(row[column] || "")}
                  </td>
                ))}

                <td className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-900">
                  {typeof row.Total === "number"
                    ? formatNumber(Number(row.Total))
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailedTable({ rows }: { rows: NormalizedRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700">
              Planilha
            </th>
            <th className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700">
              Empresa
            </th>
            <th className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700">
              Data
            </th>
            <th className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700">
              Categoria
            </th>
            <th className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700">
              Região / unidade
            </th>
            <th className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700">
              Indicador
            </th>
            <th className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-700">
              Valor
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap border-b px-4 py-3 text-slate-600">
                {row.sheet}
              </td>
              <td className="whitespace-nowrap border-b px-4 py-3 text-slate-600">
                {row.empresa}
              </td>
              <td className="whitespace-nowrap border-b px-4 py-3 text-slate-600">
                {row.dataKey || "-"}
              </td>
              <td className="whitespace-nowrap border-b px-4 py-3 text-slate-600">
                {row.categoria}
              </td>
              <td className="whitespace-nowrap border-b px-4 py-3 text-slate-600">
                {row.regiao}
              </td>
              <td className="whitespace-nowrap border-b px-4 py-3 text-slate-600">
                {row.indicador}
              </td>
              <td className="whitespace-nowrap border-b px-4 py-3 font-semibold text-slate-900">
                {formatCurrency(row.valor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}