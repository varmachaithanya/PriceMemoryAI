-- Custom enum types
create type user_role as enum ('user', 'admin');
create type unit_type as enum ('kg', 'gram', 'liter', 'ml', 'piece', 'packet');
create type receipt_status as enum ('pending', 'processing', 'done', 'failed');
create type alert_type as enum ('price_spike', 'store_expensive', 'inflation');
