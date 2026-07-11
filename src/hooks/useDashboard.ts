import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { DashboardStats, PriceTrend, SpendingTrend, InflationData, ProductPriceStats } from '@/types/database';

export function useDashboardStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'stats', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { uid: userId })
        .single();
      if (error) throw error;
      return data as DashboardStats;
    },
    enabled: !!userId,
  });
}

export function usePriceTrend(userId: string | undefined, productId: string | undefined, period: string = 'monthly') {
  return useQuery({
    queryKey: ['priceTrend', userId, productId, period],
    queryFn: async () => {
      if (!userId || !productId) return [];
      const { data, error } = await supabase
        .rpc('get_price_trend', { uid: userId, pid: productId, period });
      if (error) throw error;
      return data as PriceTrend[];
    },
    enabled: !!userId && !!productId,
  });
}

export function useSpendingTrend(userId: string | undefined) {
  return useQuery({
    queryKey: ['spendingTrend', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .rpc('get_spending_trend', { uid: userId });
      if (error) throw error;
      return data as SpendingTrend[];
    },
    enabled: !!userId,
  });
}

export function usePersonalInflation(userId: string | undefined) {
  return useQuery({
    queryKey: ['personalInflation', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .rpc('get_personal_inflation', { uid: userId });
      if (error) throw error;
      return data as InflationData[];
    },
    enabled: !!userId,
  });
}

export function useProductPriceStats(userId: string | undefined, productId: string | undefined) {
  return useQuery({
    queryKey: ['productPriceStats', userId, productId],
    queryFn: async () => {
      if (!userId || !productId) return null;
      const { data, error } = await supabase
        .rpc('get_product_price_stats', { uid: userId, pid: productId })
        .single();
      if (error) throw error;
      return data as ProductPriceStats;
    },
    enabled: !!userId && !!productId,
  });
}
