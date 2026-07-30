# Supabase setup

Run this in the Supabase SQL editor:

```sql
create table if not exists public.retirement_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_name text not null default 'My Retirement Plan',
  plan_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists retirement_plans_user_id_updated_at_idx
  on public.retirement_plans (user_id, updated_at desc);

alter table public.retirement_plans enable row level security;

create policy "Users can read their own retirement plans"
  on public.retirement_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own retirement plans"
  on public.retirement_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own retirement plans"
  on public.retirement_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own retirement plans"
  on public.retirement_plans for delete
  using (auth.uid() = user_id);
```

Copy `app/js/config.example.js` to `app/js/config.js`, then enter the project URL and anon/publishable key.

Add these redirect URLs in Supabase Authentication settings:

- `http://localhost:8000/login.html`
- the final production login URL

Test with two separate accounts to confirm users cannot read each other's plans.
