import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { AdminStats } from '@/types/database';
import Spinner from '@/components/ui/Spinner';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_stats').single();
      if (error) throw error;
      return data as AdminStats;
    },
  });

  if (isLoading) return <Spinner className="py-12" />;

  const statCards = [
    { label: 'Total Users', value: stats?.total_users || 0, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
    { label: 'Total Products', value: stats?.total_products || 0, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
    { label: 'Total Stores', value: stats?.total_stores || 0, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
    { label: 'Total Purchases', value: stats?.total_purchases || 0, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
    { label: 'Active Users (30d)', value: stats?.active_users || 0, color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Platform overview and statistics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{Number(stat.value).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
