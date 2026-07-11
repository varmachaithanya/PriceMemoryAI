import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Purchase } from '@/types/database';

export function usePurchases(userId: string | undefined) {
  return useQuery({
    queryKey: ['purchases', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('purchases')
        .select('*, store:stores(*), product:products(*)')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      return data as Purchase[];
    },
    enabled: !!userId,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (purchase: Omit<Purchase, 'id' | 'created_at' | 'store' | 'product'>) => {
      const unitPrice = purchase.total_price / purchase.quantity;
      const { data, error } = await supabase
        .from('purchases')
        .insert({ ...purchase, unit_price: unitPrice })
        .select('*, store:stores(*), product:products(*)')
        .single();
      if (error) throw error;
      return data as Purchase;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchases', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Purchase> & { id: string }) => {
      if (updates.total_price && updates.quantity) {
        (updates as Record<string, unknown>).unit_price = updates.total_price / updates.quantity;
      }
      const { data, error } = await supabase
        .from('purchases')
        .update(updates)
        .eq('id', id)
        .select('*, store:stores(*), product:products(*)')
        .single();
      if (error) throw error;
      return data as Purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (purchaseId: string) => {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
