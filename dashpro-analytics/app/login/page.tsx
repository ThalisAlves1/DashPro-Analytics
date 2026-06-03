"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BarChart3 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("Erro ao entrar: " + error.message);
      return;
    }

    router.push("/");
  }

  async function handleRegister() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("Erro ao criar conta: " + error.message);
      return;
    }

    setMessage("Conta criada! Agora faça login.");
    setMode("login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white">
            <BarChart3 size={32} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            DashPro Analytics
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Entre para acessar seus dashboards.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => setMode("login")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              mode === "login"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500"
            }`}
          >
            Entrar
          </button>

          <button
            onClick={() => setMode("register")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              mode === "register"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500"
            }`}
          >
            Criar conta
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              placeholder="seuemail@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-950"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-950"
            />
          </div>

          {message && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {message}
            </div>
          )}

          {mode === "login" ? (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          ) : (
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Criando..." : "Criar conta"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}