import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useReceipt, useSaveExtractedItems, useUpdateExtractedItems } from '@/hooks/useReceipts';
import { useProducts } from '@/hooks/useProducts';
import { useStores } from '@/hooks/useStores';
import type { ExtractedItem } from '@/types/database';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';

const unitTypes = ['kg', 'gram', 'liter', 'ml', 'piece', 'packet'] as const;

export default function ReceiptReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const { data: receipt, isLoading } = useReceipt(id);
  const { data: products } = useProducts(user?.id);
  const { data: stores } = useStores(user?.id);
  const saveItems = useSaveExtractedItems();
  const updateItems = useUpdateExtractedItems();
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [showOcr, setShowOcr] = useState(false);

  useEffect(() => {
    if (receipt?.extracted_items) {
      const parsed = typeof receipt.extracted_items === 'string'
        ? JSON.parse(receipt.extracted_items)
        : receipt.extracted_items;
      setItems(parsed || []);
    }
  }, [receipt]);

  if (isLoading) return <Spinner className="py-12" />;
  if (!receipt) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Receipt not found.</p>
        <button onClick={() => navigate('/receipts')} className="btn-primary mt-4">
          Back to Receipts
        </button>
      </div>
    );
  }

  const isDone = receipt.processing_status === 'done';
  const noOcr = !receipt.raw_ocr_text;

  const updateItem = (index: number, field: keyof ExtractedItem, value: string | number | null) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { name: '', product_id: null, quantity: 1, unit: 'piece', total_price: 0, store_id: null },
    ]);
  };

  const handleSave = async () => {
    if (!receipt) return;
    await saveItems.mutateAsync({ receipt, items });
    navigate('/receipts');
  };

  const handleSaveProgress = async () => {
    if (!receipt) return;
    await updateItems.mutateAsync({ receiptId: receipt.id, items });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/receipts')}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isDone ? 'Receipt Details' : 'Review Extracted Items'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {noOcr
              ? 'No OCR provider configured — enter items manually'
              : items.length > 0
                ? `${items.length} item${items.length !== 1 ? 's' : ''} extracted — review and save`
                : 'No items could be read — add them manually'}
          </p>
        </div>
      </div>

      {/* Receipt image */}
      <div className="card mb-6">
        <div className="aspect-[16/9] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <img
            src={receipt.image_url}
            alt="Receipt"
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="%239ca3af"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>';
            }}
          />
        </div>
        {receipt.raw_ocr_text && (
          <div className="mt-3">
            <button
              onClick={() => setShowOcr(!showOcr)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {showOcr ? 'Hide' : 'Show'} raw OCR text
            </button>
            {showOcr && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400 whitespace-pre-wrap">
                {receipt.raw_ocr_text}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isDone ? 'Saved Items' : 'Extracted Items'}
          </h2>
          {!isDone && (
            <button onClick={addItem} className="btn-primary text-xs px-3 py-1.5">
              + Add Item
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="No items found"
            description={noOcr
              ? "Couldn't read this receipt. Add items manually below."
              : "OCR couldn't extract clear items. Add them manually."}
            action={
              !isDone ? (
                <button onClick={addItem} className="btn-primary">
                  Add First Item
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:flex-row sm:items-center"
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">Name</label>
                    {isDone ? (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                    ) : (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        placeholder="Item name"
                        className="input-field text-sm py-1.5"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Qty</label>
                    {isDone ? (
                      <p className="text-sm text-gray-900 dark:text-gray-100">{item.quantity}</p>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                        className="input-field text-sm py-1.5"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Price (₹)</label>
                    {isDone ? (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{item.total_price}</p>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        value={item.total_price || ''}
                        onChange={(e) => updateItem(idx, 'total_price', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="input-field text-sm py-1.5"
                      />
                    )}
                  </div>
                </div>
                {!isDone && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="self-start rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {items.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total ({items.length} items)</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                ₹{items.reduce((sum, i) => sum + (i.total_price || 0), 0).toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        {!isDone && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate('/receipts')}
              className="btn-secondary flex-1"
            >
              Discard
            </button>
            {items.length > 0 && (
              <button
                onClick={handleSaveProgress}
                disabled={updateItems.isPending}
                className="btn-secondary flex-1"
              >
                {updateItems.isPending ? 'Saving...' : 'Save Progress'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saveItems.isPending}
              className="btn-primary flex-1"
            >
              {saveItems.isPending ? 'Saving...' : 'Save & Create Purchases'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
