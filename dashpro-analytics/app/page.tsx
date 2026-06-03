"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  FileSpreadsheet,
  Upload,
  LayoutDashboard,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const cards = [
  {
    title: "Análise Excel",
    description:
      "Carregue uma base Excel com várias abas e gere análises automáticas.",
    href: "/analise-excel",
    icon: FileSpreadsheet,
  },
  {
    title: "Dashboard Geral",
    description:
      "Visualize os gráficos salvos e acompanhe seus principais indicadores.",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Importar dados",
    description:
      "Importe CSV ou Excel e crie gráficos personalizados para seus dashboards.",
    href: "/importar",
    icon: Upload,
  },
  {
    title: "Meus dashboards",
    description:
      "Crie, organize e gerencie dashboards por setor, empresa ou projeto.",
    href: "/dashboards",
    icon: LayoutDashboard,
  },
];

export default function HomePage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setEmail(data.session.user.email || "");
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
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-300">
                DashPro Analytics
              </p>

              <h1 className="text-3xl font-bold">
                Central de controle do SaaS
              </h1>

              <p className="mt-2 max-w-3xl text-slate-300">
                Acesse suas análises, dashboards, importações e configurações em
                um só lugar.
              </p>

              {email && (
                <p className="mt-4 text-sm text-slate-400">
                  Logado como: <strong>{email}</strong>
                </p>
              )}
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

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-950 group-hover:text-white">
                  <Icon size={28} />
                </div>

                <h2 className="text-xl font-bold text-slate-900">
                  {card.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {card.description}
                </p>

                <div className="mt-5 text-sm font-semibold text-slate-900">
                  Acessar →
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <BarChart3 className="text-slate-900" size={24} />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Status do sistema
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Sistema pronto para importar bases, salvar dados no Supabase e
              gerar análises visuais.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <FileSpreadsheet className="text-slate-900" size={24} />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Base oficial Excel
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              A área de Análise Excel já substitui e salva a última base oficial
              do usuário.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Settings className="text-slate-900" size={24} />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Próximos módulos
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Podemos adicionar planos, exportação em PDF, permissões, usuários
              por empresa e compartilhamento de dashboards.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}