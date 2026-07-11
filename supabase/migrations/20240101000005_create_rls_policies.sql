-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Stores policies
create policy "Users can manage own stores"
  on public.stores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all stores"
  on public.stores for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Products policies
create policy "Users can manage own products"
  on public.products for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all products"
  on public.products for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Purchases policies
create policy "Users can manage own purchases"
  on public.purchases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all purchases"
  on public.purchases for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Receipts policies
create policy "Users can manage own receipts"
  on public.receipts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all receipts"
  on public.receipts for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Alerts policies
create policy "Users can manage own alerts"
  on public.alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Item aliases (shared cache, read for all authenticated, write for service role)
create policy "Authenticated users can read item aliases"
  on public.item_aliases for select
  to authenticated
  using (true);

create policy "Service role can insert item aliases"
  on public.item_aliases for insert
  to service_role
  with check (true);
