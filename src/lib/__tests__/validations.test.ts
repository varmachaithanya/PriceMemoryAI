import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  changePasswordSchema,
  storeSchema,
  productSchema,
  purchaseSchema,
} from '../validations';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'password' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      full_name: 'John Doe',
      email: 'john@example.com',
      mobile: '+919876543210',
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'StrongPass1',
      confirmPassword: 'DifferentPass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password (no uppercase)', () => {
    const result = registerSchema.safeParse({
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'strongpass1',
      confirmPassword: 'strongpass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short name', () => {
    const result = registerSchema.safeParse({
      full_name: 'J',
      email: 'john@example.com',
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty mobile', () => {
    const result = registerSchema.safeParse({
      full_name: 'John Doe',
      email: 'john@example.com',
      mobile: '',
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
    });
    expect(result.success).toBe(true);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts matching strong passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewPass123',
      confirmPassword: 'OldPass123',
    });
    expect(result.success).toBe(false);
  });
});

describe('profileSchema', () => {
  it('accepts valid profile data', () => {
    const result = profileSchema.safeParse({ full_name: 'John Doe', mobile: '+919876543210' });
    expect(result.success).toBe(true);
  });

  it('accepts empty mobile', () => {
    const result = profileSchema.safeParse({ full_name: 'John Doe', mobile: '' });
    expect(result.success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  it('accepts valid password change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass1',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects same old and new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'SamePass1',
      newPassword: 'SamePass1',
      confirmPassword: 'SamePass1',
    });
    expect(result.success).toBe(false);
  });
});

describe('storeSchema', () => {
  it('accepts valid store data', () => {
    const result = storeSchema.safeParse({
      store_name: 'Big Bazaar',
      address: 'MG Road',
      city: 'Mumbai',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty store name', () => {
    const result = storeSchema.safeParse({ store_name: '' });
    expect(result.success).toBe(false);
  });
});

describe('productSchema', () => {
  it('accepts valid product data', () => {
    const result = productSchema.safeParse({
      canonical_name: 'Tomatoes',
      category: 'Vegetables',
      brand: '',
      unit_type: 'kg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid unit type', () => {
    const result = productSchema.safeParse({
      canonical_name: 'Tomatoes',
      unit_type: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('purchaseSchema', () => {
  it('accepts valid purchase data', () => {
    const result = purchaseSchema.safeParse({
      store_id: '550e8400-e29b-41d4-a716-446655440000',
      product_id: '550e8400-e29b-41d4-a716-446655440001',
      quantity: 2,
      unit: 'kg',
      total_price: 80,
      purchase_date: '2024-01-15',
      notes: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative quantity', () => {
    const result = purchaseSchema.safeParse({
      store_id: '550e8400-e29b-41d4-a716-446655440000',
      product_id: '550e8400-e29b-41d4-a716-446655440001',
      quantity: -1,
      unit: 'kg',
      total_price: 80,
      purchase_date: '2024-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid store UUID', () => {
    const result = purchaseSchema.safeParse({
      store_id: 'not-a-uuid',
      product_id: '550e8400-e29b-41d4-a716-446655440001',
      quantity: 2,
      unit: 'kg',
      total_price: 80,
      purchase_date: '2024-01-15',
    });
    expect(result.success).toBe(false);
  });
});
