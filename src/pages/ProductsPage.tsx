import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '@/lib/validations';
import type { Product } from '@/types/database';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';

const unitTypes = ['kg', 'gram', 'liter', 'ml', 'piece', 'packet'] as const;

export default function ProductsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: products, isLoading } = useProducts(userId);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const openCreate = () => {
    setEditingProduct(null);
    reset({ canonical_name: '', category: '', brand: '', unit_type: 'piece' });
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    reset({
      canonical_name: product.canonical_name,
      category: product.category || '',
      brand: product.brand || '',
      unit_type: product.unit_type,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!userId) return;
    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
    } else {
      await createProduct.mutateAsync({
        ...data,
        user_id: userId,
        category: data.category || null,
        brand: data.brand || null,
      });
    }
    setModalOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    await deleteProduct.mutateAsync(deletingProduct.id);
    setDeletingProduct(null);
  };

  const filtered = products?.filter((p) =>
    p.canonical_name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Products</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your tracked products</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Product
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-md"
        />
      </div>

      {isLoading ? (
        <Spinner className="py-12" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to start tracking prices."
          action={<button onClick={openCreate} className="btn-primary">Add Product</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <div key={product.id} className="card group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{product.canonical_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{product.category || 'Uncategorized'}</p>
                  {product.brand && <p className="text-xs text-gray-400 dark:text-gray-500">{product.brand}</p>}
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  {product.unit_type}
                </span>
              </div>
              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                <button onClick={() => openEdit(product)} className="text-xs font-medium text-emerald-600 hover:text-emerald-500">
                  Edit
                </button>
                <button onClick={() => setDeletingProduct(product)} className="text-xs font-medium text-red-600 hover:text-red-500">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Product Name</label>
            <input className="input-field" placeholder="e.g. Tomatoes" {...register('canonical_name')} />
            {errors.canonical_name && <p className="error-text">{errors.canonical_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <input className="input-field" placeholder="e.g. Vegetables" {...register('category')} />
            </div>
            <div>
              <label className="label">Brand</label>
              <input className="input-field" placeholder="e.g. Amul" {...register('brand')} />
            </div>
          </div>
          <div>
            <label className="label">Unit Type</label>
            <select className="input-field" {...register('unit_type')}>
              {unitTypes.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createProduct.isPending || updateProduct.isPending}>
              {createProduct.isPending || updateProduct.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.canonical_name}"? This will also delete all associated purchases.`}
        loading={deleteProduct.isPending}
      />
    </div>
  );
}
