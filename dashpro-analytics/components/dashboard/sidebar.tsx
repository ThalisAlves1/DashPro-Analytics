import {
  BarChart3,
  Database,
  FileText,
  Home,
  Settings,
  Upload,
} from "lucide-react";

const menuItems = [
  {
    label: "Início",
    icon: Home,
  },
  {
    label: "Dashboards",
    icon: BarChart3,
  },
  {
    label: "Fontes de dados",
    icon: Database,
  },
  {
    label: "Importar dados",
    icon: Upload,
  },
  {
    label: "Relatórios",
    icon: FileText,
  },
  {
    label: "Configurações",
    icon: Settings,
  },
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-gray-200 bg-white p-5 lg:block">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">DashPro</h1>
        <p className="text-sm text-gray-400">Analytics SaaS</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}