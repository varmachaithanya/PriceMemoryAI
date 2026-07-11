import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorker } from 'tesseract.js';
import { supabase } from '@/services/supabase';
import type { Receipt, ExtractedItem } from '@/types/database';

interface OcrResult {
  text: string;
  confidence: number;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function preprocessImage(url: string): Promise<Blob> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const value = gray > 140 ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

async function runOcrOnImage(imageUrl: string): Promise<OcrResult> {
  const blob = await preprocessImage(imageUrl);
  const objectUrl = URL.createObjectURL(blob);

  const worker = await createWorker('eng', undefined, {
    logger: () => {},
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '6',
      tessedit_char_whitelist:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,-/+()*&@#$%: ',
    });

    const { data } = await worker.recognize(objectUrl);
    return { text: data.text, confidence: data.confidence };
  } finally {
    URL.revokeObjectURL(objectUrl);
    await worker.terminate();
  }
}

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
    refetchInterval: (query) => {
      const receipts = query.state.data as Receipt[] | undefined;
      if (!receipts) return false;
      const hasProcessing = receipts.some(
        (r) => r.processing_status === 'pending' || r.processing_status === 'processing'
      );
      return hasProcessing ? 3000 : false;
    },
  });
}

export function useReceipt(receiptId: string | undefined) {
  return useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: async () => {
      if (!receiptId) return null;
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single();
      if (error) throw error;
      return data as Receipt;
    },
    enabled: !!receiptId,
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
          processing_status: 'processing',
        })
        .select()
        .single();

      if (error) throw error;

      let ocrText = '';
      try {
        const result = await runOcrOnImage(urlData.publicUrl);
        ocrText = result.text;
      } catch (ocrErr) {
        console.error('Client-side OCR failed:', ocrErr);
        await supabase
          .from('receipts')
          .update({ processing_status: 'failed' })
          .eq('id', data.id);
        throw new Error(`OCR failed: ${ocrErr}`);
      }

      supabase.functions.invoke('process-receipt', {
        body: {
          receipt_id: data.id,
          user_id: userId,
          image_url: urlData.publicUrl,
          raw_ocr_text: ocrText,
        },
      }).catch((err) => console.error('Failed to invoke process-receipt:', err));

      return data as Receipt;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['receipts', variables.userId] });
    },
  });
}

export function useRetryReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receipt: Receipt) => {
      await supabase
        .from('receipts')
        .update({ processing_status: 'processing' })
        .eq('id', receipt.id);

      let ocrText = '';
      try {
        const result = await runOcrOnImage(receipt.image_url);
        ocrText = result.text;
      } catch (ocrErr) {
        console.error('Client-side OCR failed on retry:', ocrErr);
        await supabase
          .from('receipts')
          .update({ processing_status: 'failed' })
          .eq('id', receipt.id);
        throw new Error(`OCR failed: ${ocrErr}`);
      }

      const { error } = await supabase.functions.invoke('process-receipt', {
        body: {
          receipt_id: receipt.id,
          user_id: receipt.user_id,
          image_url: receipt.image_url,
          raw_ocr_text: ocrText,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}

export function useUpdateExtractedItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ receiptId, items }: { receiptId: string; items: ExtractedItem[] }) => {
      const { error } = await supabase
        .from('receipts')
        .update({ extracted_items: items as unknown as Record<string, unknown>[] })
        .eq('id', receiptId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt', variables.receiptId] });
    },
  });
}

export function useSaveExtractedItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ receipt, items }: { receipt: Receipt; items: ExtractedItem[] }) => {
      const validItems = items.filter((item) => item.total_price > 0);

      for (const item of validItems) {
        let productId = item.product_id;
        if (!productId && item.name) {
          // Create product inline if not matched
          const { data: newProduct, error: prodErr } = await supabase
            .from('products')
            .insert({
              user_id: receipt.user_id,
              canonical_name: item.name,
              unit_type: (item.unit as 'kg' | 'gram' | 'liter' | 'ml' | 'piece' | 'packet') || 'piece',
              category: null,
              brand: null,
            })
            .select()
            .single();
          if (prodErr) throw prodErr;
          productId = newProduct.id;
        }

        if (productId) {
          const unitPrice = item.total_price / item.quantity;
          const { error: purchaseErr } = await supabase.from('purchases').insert({
            user_id: receipt.user_id,
            store_id: item.store_id || null,
            product_id: productId,
            quantity: item.quantity,
            unit: (item.unit as 'kg' | 'gram' | 'liter' | 'ml' | 'piece' | 'packet') || 'piece',
            total_price: item.total_price,
            unit_price: unitPrice,
            purchase_date: receipt.receipt_date || new Date().toISOString().split('T')[0],
            notes: 'Extracted from receipt',
          });
          if (purchaseErr) throw purchaseErr;
        }
      }

      const { error } = await supabase
        .from('receipts')
        .update({
          processing_status: 'done',
          extracted_items: items as unknown as Record<string, unknown>[],
        })
        .eq('id', receipt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
