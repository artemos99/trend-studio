-- Trend Studio Cloud Workspace: run once in Supabase > SQL Editor.
-- No browser/service_role secrets. Every user's row is private to their session.
create table if not exists public.trend_studio_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.trend_studio_workspaces enable row level security;
revoke all on table public.trend_studio_workspaces from anon, authenticated;
grant select, insert, update, delete on table public.trend_studio_workspaces to authenticated;

drop policy if exists "User reads own workspace" on public.trend_studio_workspaces;
create policy "User reads own workspace" on public.trend_studio_workspaces
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "User creates own workspace" on public.trend_studio_workspaces;
create policy "User creates own workspace" on public.trend_studio_workspaces
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "User updates own workspace" on public.trend_studio_workspaces;
create policy "User updates own workspace" on public.trend_studio_workspaces
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "User deletes own workspace" on public.trend_studio_workspaces;
create policy "User deletes own workspace" on public.trend_studio_workspaces
for delete to authenticated using ((select auth.uid()) = user_id);

-- Mandatory authenticator MFA for all cloud workspaces.
-- Must be applied in Supabase SQL Editor before accepting real users.
drop policy if exists "Require 2FA for workspace" on public.trend_studio_workspaces;
create policy "Require 2FA for workspace" on public.trend_studio_workspaces
as restrictive to authenticated for all
using ((select auth.jwt()->>'aal') = 'aal2')
with check ((select auth.jwt()->>'aal') = 'aal2');
