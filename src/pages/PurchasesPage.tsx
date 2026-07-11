import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { useStores } from '@/hooks/useStores';
import { usePurchases, useCreatePurchase, useDeletePurchase } from '@/hooks/usePurchases';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseSchema, type PurchaseFormData } from '@/lib/validations';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';

const unitTypes = ['kg', 'gram', 'liter', 'ml', 'piece', 'packet'] as const;

export default function PurchasesPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: purchases, isLoading } = usePurchases(userId);
  const { data: products } = useProducts(userId);
  const { data: stores } = useStores(userId);
  const createPurchase = useCreatePurchase();
  const deletePurchase = useDeletePurchase();

  const [modalOpen, setModalOpen] = useState(false);
  const [deletingPurchase, setDeletingPurchase] = useState<{ id: string; product?: { canonical_name: string } } | null>(null);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      quantity: 1,
      unit: 'piece',
      purchase_date: new Date().toISOString().split('T')[0],
    },
  });

  const totalPrice = watch('total_price');
  const quantity = watch('quantity');

  const onSubmit = async (data: PurchaseFormData) => {
    if (!userId) return;
    await createPurchase.mutateAsync({
      ...data,
      user_id: userId,
      unit_price: data.total_price / data.quantity,
      notes: data.notes || null,
    });
    setModalOpen(false);
    reset({ quantity: 1, unit: 'piece', purchase_date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = async () => {
    if (!deletingPurchase) return;
    await deletePurchase.mutateAsync(deletingPurchase.id);
    setDeletingPurchase(null);
  };

  const filtered = purchases?.filter((p) =>
    p.product?.canonical_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.store?.store_name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Purchases</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track every purchase you make</p>
        </div>
        <button onClick={() => { reset({ quantity: 1, unit: 'piece', purchase_date: new Date().toISOString().split('T')[0] }); setModalOpen(true); }} className="btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Purchase
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search purchases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-md"
        />
      </div>

      {isLoading ? (
        <Spinner className="py-12" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          description="Record your first purchase to start tracking prices."
          action={<button onClick={() => setModalOpen(true)} className="btn-primary">Add Purchase</button>}
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Store</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Unit Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {filtered.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {purchase.product?.canonical_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {purchase.store?.store_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                      {purchase.quantity} {purchase.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                      ₹{Number(purchase.total_price).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                      ₹{Number(purchase.unit_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {purchase.purchase_date}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeletingPurchase(purchase)}
                        className="text-xs font-medium text-red-600 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Purchase" maxWidth="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Product</label>
              <select className="input-field" {...register('product_id')}>
                <option value="">Select product</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>{p.canonical_name}</option>
                ))}
              </select>
              {errors.product_id && <p className="error-text">{errors.product_id.message}</p>}
            </div>
            <div>
              <label className="label">Store</label>
              <select className="input-field" {...register('store_id')}>
                <option value="">Select store</option>
                {stores?.map((s) => (
                  <option key={s.id} value={s.id}>{s.store_name}</option>
                ))}
              </select>
              {errors.store_id && <p className="error-text">{errors.store_id.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Quantity</label>
              <input type="number" step="0.01" className="input-field" {...register('quantity', { valueAsNumber: true })} />
              {errors.quantity && <p className="error-text">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input-field" {...register('unit')}>
                {unitTypes.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Total Price (₹)</label>
              <input type="number" step="0.01" className="input-field" {...register('total_price', { valueAsNumber: true })} />
              {errors.total_price && <p className="error-text">{errors.total_price.message}</p>}
            </div>
          </div>
          {totalPrice && quantity ? (
            <p className="text-sm text-gray-500">
              Unit price: <span className="font-medium text-gray-900 dark:text-gray-100">₹{(totalPrice / quantity).toFixed(2)}</span>
            </p>
          ) : null}
          <div>
            <label className="label">Date</label>
            <input type="date" className="input-field" {...register('purchase_date')} />
            {errors.purchase_date && <p className="error-text">{errors.purchase_date.message}</p>}
          </div>
          <div>
            <label className="label">Notes <span className="text-gray-400">(optional)</span></label>
            <textarea className="input-field" rows={2} {...register('notes')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createPurchase.isPending}>
              {createPurchase.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingPurchase}
        onClose={() => setDeletingPurchase(null)}
        onConfirm={handleDelete}
        title="Delete Purchase"
        message={`Are you sure you want to delete this purchase?`}
        loading={deletePurchase.isPending}
      />
    </div>
  );
}
