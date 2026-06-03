"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ConfiguracoesPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setEmail(data.session.user.email || "");
      setUserId(data.session.user.id || "");
      setCheckingAuth(false);
    }

    checkAuth();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Verificando acesso...
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Aguarde enquanto validamos sua sessão.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <Link
                href="/"
                className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white"
              >
                <ArrowLeft size={16} />
                Voltar para início
              </Link>

              <p className="mb-2 text-sm font-medium text-slate-300">
                DashPro Analytics
              </p>

              <h1 className="text-3xl font-bold">Configurações</h1>

              <p className="mt-2 max-w-3xl text-slate-300">
                Gerencie sua conta, plano, segurança e preferências do sistema.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
              <User size={28} />
            </div>

            <h2 className="text-xl font-bold text-slate-900">Minha conta</h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">E-mail</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                  {email}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  ID do usuário
                </p>
                <p className="mt-1 break-all text-xs text-slate-500">
                  {userId}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
              <CreditCard size={28} />
            </div>

            <h2 className="text-xl font-bold text-slate-900">Plano atual</h2>

            <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">Plano</p>
              <h3 className="mt-1 text-2xl font-bold">Free MVP</h3>
              <p className="mt-2 text-sm text-slate-300">
                Ideal para testes iniciais do SaaS.
              </p>
            </div>

            <button className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Ver planos
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
              <Shield size={28} />
            </div>

            <h2 className="text-xl font-bold text-slate-900">Segurança</h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              A autenticação está sendo feita pelo Supabase Auth. As bases Excel
              são salvas por usuário e protegidas por política RLS.
            </p>

            <div className="mt-5 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
              Sessão ativa e protegida.
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
              <Settings size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Preferências do sistema
              </h2>
              <p className="text-sm text-slate-500">
                Esses campos ficam preparados para as próximas versões.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nome do sistema
              </label>
              <input
                value="DashPro Analytics"
                disabled
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Moeda padrão
              </label>
              <input
                value="BRL - Real brasileiro"
                disabled
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}