import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStores, useCreateStore, useUpdateStore, useDeleteStore } from '@/hooks/useStores';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { storeSchema, type StoreFormData } from '@/lib/validations';
import type { Store } from '@/types/database';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';

export default function StoresPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: stores, isLoading } = useStores(userId);
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
  });

  const openCreate = () => {
    setEditingStore(null);
    reset({ store_name: '', address: '', city: '' });
    setModalOpen(true);
  };

  const openEdit = (store: Store) => {
    setEditingStore(store);
    reset({
      store_name: store.store_name,
      address: store.address || '',
      city: store.city || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: StoreFormData) => {
    if (!userId) return;
    if (editingStore) {
      await updateStore.mutateAsync({ id: editingStore.id, ...data });
    } else {
      await createStore.mutateAsync({
        ...data,
        user_id: userId,
        address: data.address || null,
        city: data.city || null,
      });
    }
    setModalOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (!deletingStore) return;
    await deleteStore.mutateAsync(deletingStore.id);
    setDeletingStore(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your stores and shops</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Store
        </button>
      </div>

      {isLoading ? (
        <Spinner className="py-12" />
      ) : !stores || stores.length === 0 ? (
        <EmptyState
          title="No stores yet"
          description="Add stores where you shop to compare prices."
          action={<button onClick={openCreate} className="btn-primary">Add Store</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <div key={store.id} className="card group">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{store.store_name}</h3>
                {store.address && <p className="text-sm text-gray-500 dark:text-gray-400">{store.address}</p>}
                {store.city && <p className="text-xs text-gray-400 dark:text-gray-500">{store.city}</p>}
              </div>
              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                <button onClick={() => openEdit(store)} className="text-xs font-medium text-emerald-600 hover:text-emerald-500">
                  Edit
                </button>
                <button onClick={() => setDeletingStore(store)} className="text-xs font-medium text-red-600 hover:text-red-500">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingStore ? 'Edit Store' : 'Add Store'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Store Name</label>
            <input className="input-field" placeholder="e.g. Big Bazaar" {...register('store_name')} />
            {errors.store_name && <p className="error-text">{errors.store_name.message}</p>}
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input-field" placeholder="e.g. MG Road, Sector 5" {...register('address')} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input-field" placeholder="e.g. Mumbai" {...register('city')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createStore.isPending || updateStore.isPending}>
              {createStore.isPending || updateStore.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingStore}
        onClose={() => setDeletingStore(null)}
        onConfirm={handleDelete}
        title="Delete Store"
        message={`Are you sure you want to delete "${deletingStore?.store_name}"? Associated purchases will lose their store reference.`}
        loading={deleteStore.isPending}
      />
    </div>
  );
}
