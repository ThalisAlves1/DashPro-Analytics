type KpiCardProps = {
  title: string;
  value: string;
  description: string;
};

export function KpiCard({ title, value, description }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h2 className="mt-2 text-3xl font-bold text-gray-900">{value}</h2>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </div>
  );
}