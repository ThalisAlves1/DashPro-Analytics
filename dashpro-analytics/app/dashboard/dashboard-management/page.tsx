"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus } from "lucide-react";

type Dashboard = {
  id: string;
  name: string;
};

export default function DashboardManagement() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchDashboards();
  }, []);

  async function fetchDashboards() {
    const user = supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("dashboards")
      .select("*")
      .eq("user_id", (await user).data.user?.id);

    setDashboards(data || []);
  }

  async function createDashboard() {
    const user = supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("dashboards").insert({
      user_id: (await user).data.user?.id,
      name: newName,
    });

    if (data) {
      setNewName("");
      fetchDashboards();
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="mb-4 text-3xl font-bold">Gerenciar Dashboards</h1>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Nome do novo dashboard"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="rounded border px-4 py-2"
        />
        <button
          onClick={createDashboard}
          className="flex items-center gap-2 rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
        >
          <Plus size={18} /> Criar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboards.map((dash) => (
          <div
            key={dash.id}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{dash.name}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}