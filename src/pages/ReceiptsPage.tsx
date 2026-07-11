import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useReceipts, useUploadReceipt, useDeleteReceipt, useRetryReceipt } from '@/hooks/useReceipts';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

const statusVariant: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  processing: 'info',
  needs_review: 'warning',
  done: 'success',
  failed: 'danger',
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  needs_review: 'Needs Review',
  done: 'Done',
  failed: 'Failed',
};

function isTimedOut(receipt: { processing_status: string; created_at: string }) {
  if (receipt.processing_status !== 'processing' && receipt.processing_status !== 'pending') return false;
  const elapsed = Date.now() - new Date(receipt.created_at).getTime();
  return elapsed > 2 * 60 * 1000;
}

export default function ReceiptsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const { data: receipts, isLoading } = useReceipts(userId);
  const uploadReceipt = useUploadReceipt();
  const deleteReceipt = useDeleteReceipt();
  const retryReceipt = useRetryReceipt();
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (file: File) => {
    if (!userId) return;
    await uploadReceipt.mutateAsync({ file, userId });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleUpload(file);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Receipts</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload receipts for automatic price extraction</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mb-6 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
            : 'border-gray-300 hover:border-emerald-300 dark:border-gray-700'
        }`}
      >
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Drag and drop a receipt image, or{' '}
          <label className="cursor-pointer font-medium text-emerald-600 hover:text-emerald-500">
            browse
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </p>
        <p className="mt-1 text-xs text-gray-400">PNG, JPG, PDF up to 10MB</p>
        {uploadReceipt.isPending && <Spinner size="sm" className="mt-4" />}
      </div>

      {isLoading ? (
        <Spinner className="py-12" />
      ) : !receipts || receipts.length === 0 ? (
        <EmptyState
          title="No receipts uploaded"
          description="Upload a receipt and we'll extract items and prices for you."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {receipts.map((receipt) => {
            const timedOut = isTimedOut(receipt);
            const effectiveStatus = timedOut ? 'failed' : receipt.processing_status;
            const itemCount = Array.isArray(receipt.extracted_items) ? receipt.extracted_items.length : 0;
            return (
              <div key={receipt.id} className="card group">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 mb-3">
                  <img
                    src={receipt.image_url}
                    alt="Receipt"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="%239ca3af"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>';
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {receipt.receipt_date || 'No date'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(receipt.created_at).toLocaleDateString()}
                      {itemCount > 0 && ` · ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[effectiveStatus] || 'default'}>
                      {statusLabel[effectiveStatus] || effectiveStatus}
                    </Badge>
                    {effectiveStatus === 'needs_review' && (
                      <button
                        onClick={() => navigate(`/receipts/${receipt.id}/review`)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-500"
                      >
                        Review
                      </button>
                    )}
                    {effectiveStatus === 'done' && (
                      <button
                        onClick={() => navigate(`/receipts/${receipt.id}/review`)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        View
                      </button>
                    )}
                    {effectiveStatus === 'failed' && (
                      <button
                        onClick={() => retryReceipt.mutate(receipt)}
                        disabled={retryReceipt.isPending}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-500 disabled:opacity-50"
                      >
                        {retryReceipt.isPending ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteReceipt.mutate(receipt)}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
