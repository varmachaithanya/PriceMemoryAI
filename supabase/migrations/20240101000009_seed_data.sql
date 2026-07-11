-- Seed data for development
-- This file is for development/testing only

-- Note: Users must be created through Supabase Auth first
-- The profile trigger handles profile creation automatically
-- Use this to seed additional test data after auth signup

-- Example seed data (run after creating a test user):
-- Replace 'TEST_USER_UUID' with an actual auth.users UUID

/*
insert into public.stores (user_id, store_name, address, city) values
  ('TEST_USER_UUID', 'Big Bazaar', 'MG Road, Sector 5', 'Mumbai'),
  ('TEST_USER_UUID', 'Local Kirana', 'Park Street', 'Mumbai'),
  ('TEST_USER_UUID', 'Fresh Market', 'Station Road', 'Mumbai');

insert into public.products (user_id, canonical_name, category, brand, unit_type) values
  ('TEST_USER_UUID', 'Tomatoes', 'Vegetables', null, 'kg'),
  ('TEST_USER_UUID', 'Milk', 'Dairy', 'Amul', 'liter'),
  ('TEST_USER_UUID', 'Rice', 'Grains', 'Basmati', 'kg'),
  ('TEST_USER_UUID', 'Cooking Oil', 'Essentials', 'Fortune', 'liter'),
  ('TEST_USER_UUID', 'Onions', 'Vegetables', null, 'kg');

insert into public.purchases (user_id, store_id, product_id, quantity, unit, total_price, unit_price, purchase_date) values
  ('TEST_USER_UUID',
   (select id from public.stores where store_name = 'Big Bazaar' limit 1),
   (select id from public.products where canonical_name = 'Tomatoes' limit 1),
   2, 'kg', 80, 40, current_date - interval '30 days'),
  ('TEST_USER_UUID',
   (select id from public.stores where store_name = 'Local Kirana' limit 1),
   (select id from public.products where canonical_name = 'Tomatoes' limit 1),
   1.5, 'kg', 75, 50, current_date - interval '15 days'),
  ('TEST_USER_UUID',
   (select id from public.stores where store_name = 'Fresh Market' limit 1),
   (select id from public.products where canonical_name = 'Milk' limit 1),
   2, 'liter', 100, 50, current_date - interval '7 days'),
  ('TEST_USER_UUID',
   (select id from public.stores where store_name = 'Big Bazaar' limit 1),
   (select id from public.products where canonical_name = 'Rice' limit 1),
   5, 'kg', 450, 90, current_date - interval '3 days'),
  ('TEST_USER_UUID',
   (select id from public.stores where store_name = 'Local Kirana' limit 1),
   (select id from public.products where canonical_name = 'Cooking Oil' limit 1),
   1, 'liter', 150, 150, current_date - interval '1 day');
*/
