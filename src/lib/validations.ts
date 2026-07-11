import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  mobile: z.string().regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid mobile number').optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  mobile: z.string().regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid mobile number').optional().or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const storeSchema = z.object({
  store_name: z.string().min(1, 'Store name is required').max(200),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export type StoreFormData = z.infer<typeof storeSchema>;

export const productSchema = z.object({
  canonical_name: z.string().min(1, 'Product name is required').max(200),
  category: z.string().max(100).optional().or(z.literal('')),
  brand: z.string().max(100).optional().or(z.literal('')),
  unit_type: z.enum(['kg', 'gram', 'liter', 'ml', 'piece', 'packet']),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const purchaseSchema = z.object({
  store_id: z.string().uuid('Please select a store'),
  product_id: z.string().uuid('Please select a product'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.enum(['kg', 'gram', 'liter', 'ml', 'piece', 'packet']),
  total_price: z.number().positive('Price must be greater than 0'),
  purchase_date: z.string().min(1, 'Date is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type PurchaseFormData = z.infer<typeof purchaseSchema>;
