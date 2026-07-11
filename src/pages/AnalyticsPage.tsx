import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { usePriceTrend, useSpendingTrend, usePersonalInflation } from '@/hooks/useDashboard';
import Spinner from '@/components/ui/Spinner';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const periods = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: products } = useProducts(userId);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [period, setPeriod] = useState('monthly');

  const { data: priceTrend, isLoading: trendLoading } = usePriceTrend(userId, selectedProduct || undefined, period);
  const { data: spendingTrend, isLoading: spendingLoading } = useSpendingTrend(userId);
  const { data: inflation, isLoading: inflationLoading } = usePersonalInflation(userId);

  const priceTrendData = (priceTrend || []).map((t) => ({
    name: t.date_label,
    price: Number(t.avg_price),
    purchases: t.purchase_count,
  }));

  const spendingData = (spendingTrend || []).slice().reverse().map((s) => ({
    name: s.month_label,
    spend: Number(s.total_spend),
    count: s.purchase_count,
  }));

  const inflationData = (inflation || []).map((i) => ({
    name: i.product_name,
    change: Number(i.inflation_pct),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visualize your spending patterns and price trends</p>
      </div>

      {/* Price Trend */}
      <div className="card mb-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Price Trend</h2>
          <div className="flex gap-3">
            <select
              className="input-field"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">Select a product</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>{p.canonical_name}</option>
              ))}
            </select>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === p.value
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {trendLoading ? (
          <Spinner className="py-8" />
        ) : priceTrendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={priceTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="price" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Avg Price (₹)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">
            {selectedProduct ? 'No price data for this product yet.' : 'Select a product to view its price trend.'}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending Trend */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Monthly Spending</h2>
          {spendingLoading ? (
            <Spinner className="py-8" />
          ) : spendingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="spend" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Spend (₹)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">No spending data yet.</p>
          )}
        </div>

        {/* Inflation */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Price Changes</h2>
          {inflationLoading ? (
            <Spinner className="py-8" />
          ) : inflationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inflationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="change" fill="#10b981" name="Change %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">Track products over time to see price changes.</p>
          )}
        </div>
      </div>
    </div>
  );
}
