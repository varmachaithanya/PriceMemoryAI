import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Receipt } from '@/types/database';

export function useReceipts(userId: string | undefined) {
  return useQuery({
    queryKey: ['receipts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Receipt[];
    },
    enabled: !!userId,
  });
}

export function useUploadReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, userId }: { file: File; userId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('receipts')
        .insert({
          user_id: userId,
          image_url: urlData.publicUrl,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Receipt;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['receipts', variables.userId] });
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receipt: Receipt) => {
      const filePath = receipt.image_url.split('/receipts/')[1];
      if (filePath) {
        await supabase.storage.from('receipts').remove([filePath]);
      }
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receipt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}
