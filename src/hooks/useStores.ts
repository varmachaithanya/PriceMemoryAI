import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Store, StoreStats } from '@/types/database';

export function useStores(userId: string | undefined) {
  return useQuery({
    queryKey: ['stores', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', userId)
        .order('store_name');
      if (error) throw error;
      return data as Store[];
    },
    enabled: !!userId,
  });
}

export function useStoreStats(userId: string | undefined, storeId: string | undefined) {
  return useQuery({
    queryKey: ['storeStats', userId, storeId],
    queryFn: async () => {
      if (!userId || !storeId) return null;
      const { data, error } = await supabase
        .rpc('get_store_stats', { uid: userId, sid: storeId })
        .single();
      if (error) throw error;
      return data as StoreStats;
    },
    enabled: !!userId && !!storeId,
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (store: Omit<Store, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('stores')
        .insert(store)
        .select()
        .single();
      if (error) throw error;
      return data as Store;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stores', variables.user_id] });
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Store> & { id: string }) => {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Store;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}
