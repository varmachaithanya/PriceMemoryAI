import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, useSpendingTrend, usePersonalInflation } from '@/hooks/useDashboard';
import { useAlerts, useGenerateAlerts } from '@/hooks/useAlerts';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { useTheme } from '@/contexts/ThemeContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ label, value, icon, change }: { label: string; value: string | number; icon: React.ReactNode; change?: number }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {change !== undefined && (
            <p className={`mt-1 text-xs font-medium ${change >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {change >= 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const userId = user?.id;

  const { data: stats, isLoading: statsLoading } = useDashboardStats(userId);
  const { data: spendingTrend, isLoading: spendingLoading } = useSpendingTrend(userId);
  const { data: inflation, isLoading: inflationLoading } = usePersonalInflation(userId);
  const { data: alerts } = useAlerts(userId);
  const generateAlerts = useGenerateAlerts();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const chartTextColor = isDark ? '#9ca3af' : '#6b7280';
  const chartGridColor = isDark ? '#374151' : '#e5e7eb';
  const chartTooltipBg = isDark ? '#1f2937' : '#ffffff';
  const chartTooltipBorder = isDark ? '#374151' : '#e5e7eb';

  const unreadAlerts = alerts?.filter((a) => !a.read) || [];

  const spendingData = (spendingTrend || [])
    .slice()
    .reverse()
    .map((s) => ({
      name: s.month_label,
      spend: Number(s.total_spend),
    }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here's your spending overview
        </p>
      </div>

      {statsLoading ? (
        <Spinner className="py-12" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              label="Products Tracked"
              value={stats?.total_products || 0}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />
            <StatCard
              label="Stores"
              value={stats?.total_stores || 0}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <StatCard
              label="Purchases This Month"
              value={stats?.purchases_this_month || 0}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              }
            />
            <StatCard
              label="Avg Monthly Spend"
              value={`₹${Number(stats?.avg_monthly_spend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              change={stats?.inflation_percentage}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M12 19V6" />
                </svg>
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3 mb-8">
            {/* Spending Chart */}
            <div className="card lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Spending Trend</h2>
              {spendingLoading ? (
                <Spinner className="py-8" />
              ) : spendingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={spendingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: chartTextColor }} />
                    <YAxis tick={{ fontSize: 12, fill: chartTextColor }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartTooltipBg,
                        border: `1px solid ${chartTooltipBorder}`,
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="spend" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">No spending data yet. Add your first purchase!</p>
              )}
            </div>

            {/* Recent Alerts */}
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Alerts</h2>
                <button
                  onClick={() => userId && generateAlerts.mutate(userId)}
                  disabled={generateAlerts.isPending}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-500 disabled:opacity-50"
                >
                  {generateAlerts.isPending ? 'Checking...' : 'Check for alerts now'}
                </button>
              </div>
              {unreadAlerts.length > 0 ? (
                <div className="space-y-3">
                  {unreadAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                      <div className="flex items-start gap-2">
                        <Badge variant={alert.alert_type === 'price_spike' ? 'danger' : alert.alert_type === 'inflation' ? 'warning' : 'info'}>
                          {alert.alert_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-gray-500">No alerts. All good!</p>
              )}
            </div>
          </div>

          {/* Inflation Table */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Personal Inflation Tracker</h2>
            {inflationLoading ? (
              <Spinner className="py-8" />
            ) : inflation && inflation.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">3-6 Mo. Ago</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Recent</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {inflation.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.product_name}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">₹{Number(item.old_avg_price).toFixed(0)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">₹{Number(item.new_avg_price).toFixed(0)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${Number(item.inflation_pct) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {Number(item.inflation_pct) > 0 ? '+' : ''}{Number(item.inflation_pct).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">Track products over time to see inflation data.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
