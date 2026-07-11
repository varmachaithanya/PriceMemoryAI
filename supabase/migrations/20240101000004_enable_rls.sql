-- Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.receipts enable row level security;
alter table public.alerts enable row level security;
alter table public.item_aliases enable row level security;
