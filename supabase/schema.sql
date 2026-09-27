-- ================================================================
-- OmniParse — Complete Startup Database Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================


-- ========== 1. PROFILES (extends auth.users) ====================

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  role text default 'member' check (role in ('super_admin', 'admin', 'member', 'viewer')),
  tier text default 'free' check (tier in ('free', 'starter', 'pro', 'enterprise')),
  monthly_limit integer default 100,
  monthly_usage integer default 0,
  usage_reset_at timestamptz default (date_trunc('month', now()) + interval '1 month'),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.profiles is 'User profiles with roles and billing tier';
comment on column public.profiles.role is 'Platform-wide role: super_admin (owner), admin, member, viewer';
comment on column public.profiles.tier is 'Billing plan: free (100/mo), starter (1000/mo), pro (10000/mo), enterprise (unlimited)';


-- ========== 2. ORGANIZATIONS / TEAMS ============================

create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  owner_id uuid references auth.users(id) on delete set null,
  tier text default 'free' check (tier in ('free', 'starter', 'pro', 'enterprise')),
  monthly_limit integer default 100,
  monthly_usage integer default 0,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.organizations is 'Teams/companies that group users together';


-- ========== 3. ORG MEMBERS (user ↔ org with role) ===============

create table if not exists public.org_members (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz default now(),
  unique(org_id, user_id)
);

comment on table public.org_members is 'Maps users to organizations with per-org roles';
comment on column public.org_members.role is 'Org-level role: owner, admin, member, viewer';


-- ========== 4. API KEYS =========================================

create table if not exists public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,           -- first 8 chars for display (op_live_ab12...)
  key_hash text not null,             -- bcrypt hash of the full key
  scopes text[] default '{read,write}',
  status text default 'active' check (status in ('active', 'revoked', 'expired')),
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

comment on table public.api_keys is 'API keys stored as hashed values — never store raw keys';
comment on column public.api_keys.key_prefix is 'Visible prefix like op_live_ab12 for identification';
comment on column public.api_keys.key_hash is 'Hashed key for server-side validation';
comment on column public.api_keys.scopes is 'Permissions: read, write, admin';

create index idx_api_keys_user on public.api_keys(user_id);
create index idx_api_keys_org on public.api_keys(org_id);
create index idx_api_keys_prefix on public.api_keys(key_prefix);


-- ========== 5. DOCUMENTS ========================================

create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references public.organizations(id) on delete cascade,
  filename text not null,
  file_type text not null,
  file_size bigint default 0,
  storage_path text,                  -- path in Supabase Storage bucket
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'error')),
  pages integer,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz default now()
);

comment on table public.documents is 'Uploaded documents tracked with processing status';

create index idx_documents_user on public.documents(user_id);
create index idx_documents_org on public.documents(org_id);
create index idx_documents_status on public.documents(status);


-- ========== 6. OCR RESULTS ======================================

create table if not exists public.ocr_results (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  extracted_text text,                -- full extracted text
  extracted_lines text[],             -- array of text lines
  markdown_output text,
  json_output jsonb,
  word_count integer default 0,
  language text default 'en',
  confidence real,                    -- OCR confidence 0.0-1.0
  processing_time_ms integer,
  metadata jsonb default '{}'::jsonb, -- flexible extra data
  created_at timestamptz default now()
);

comment on table public.ocr_results is 'Extracted OCR text and formatted outputs per document';

create index idx_ocr_results_document on public.ocr_results(document_id);
create index idx_ocr_results_user on public.ocr_results(user_id);


-- ========== 7. USAGE LOGS =======================================

create table if not exists public.usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references public.organizations(id) on delete set null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  endpoint text not null,
  method text default 'POST',
  status_code integer,
  latency_ms integer,
  file_type text,
  file_size bigint,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

comment on table public.usage_logs is 'Every API call logged for analytics and billing';

create index idx_usage_logs_user on public.usage_logs(user_id);
create index idx_usage_logs_org on public.usage_logs(org_id);
create index idx_usage_logs_created on public.usage_logs(created_at desc);


-- ========== 8. SUBSCRIPTIONS / BILLING ==========================

create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free' check (plan in ('free', 'starter', 'pro', 'enterprise')),
  status text default 'active' check (status in ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.subscriptions is 'Stripe subscription tracking — links users/orgs to billing plans';

create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_subscriptions_stripe on public.subscriptions(stripe_customer_id);


-- ========== 9. AUDIT LOG ========================================

create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,               -- e.g. 'key.created', 'user.invited', 'document.deleted'
  target_type text,                   -- e.g. 'api_key', 'document', 'org_member'
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

comment on table public.audit_log is 'Immutable log of all important actions for security and compliance';

create index idx_audit_actor on public.audit_log(actor_id);
create index idx_audit_action on public.audit_log(action);
create index idx_audit_created on public.audit_log(created_at desc);


-- ================================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================================

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.api_keys enable row level security;
alter table public.documents enable row level security;
alter table public.ocr_results enable row level security;
alter table public.usage_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_log enable row level security;


-- ---- Helper: check if user is super_admin ----
create or replace function public.is_super_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$ language sql security definer stable;


-- ---- Helper: check if user is admin or above ----
create or replace function public.is_admin_or_above()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('super_admin', 'admin')
  );
$$ language sql security definer stable;


-- ---- Helper: check org membership ----
create or replace function public.is_org_member(org uuid)
returns boolean as $$
  select exists (
    select 1 from public.org_members
    where org_id = org and user_id = auth.uid()
  );
$$ language sql security definer stable;


-- ---- Helper: check org admin ----
create or replace function public.is_org_admin(org uuid)
returns boolean as $$
  select exists (
    select 1 from public.org_members
    where org_id = org and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$ language sql security definer stable;


-- ==== PROFILES ====
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Super admins can view all profiles"
  on public.profiles for select
  using (public.is_super_admin());

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    -- regular users cannot escalate their own role
    (role = (select role from public.profiles where id = auth.uid()))
    or public.is_super_admin()
  );

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Super admins can update any profile"
  on public.profiles for update
  using (public.is_super_admin());


-- ==== ORGANIZATIONS ====
create policy "Members can view their orgs"
  on public.organizations for select
  using (public.is_org_member(id) or public.is_super_admin());

create policy "Authenticated users can create orgs"
  on public.organizations for insert
  with check (auth.uid() = owner_id);

create policy "Org admins can update their org"
  on public.organizations for update
  using (public.is_org_admin(id) or public.is_super_admin());

create policy "Org owners can delete their org"
  on public.organizations for delete
  using (owner_id = auth.uid() or public.is_super_admin());


-- ==== ORG MEMBERS ====
create policy "Members can view org members"
  on public.org_members for select
  using (public.is_org_member(org_id) or public.is_super_admin());

create policy "Org admins can add members"
  on public.org_members for insert
  with check (public.is_org_admin(org_id) or public.is_super_admin());

create policy "Org admins can update member roles"
  on public.org_members for update
  using (public.is_org_admin(org_id) or public.is_super_admin());

create policy "Org admins can remove members"
  on public.org_members for delete
  using (public.is_org_admin(org_id) or user_id = auth.uid() or public.is_super_admin());


-- ==== API KEYS ====
create policy "Users can view own keys"
  on public.api_keys for select
  using (user_id = auth.uid() or public.is_super_admin());

create policy "Users can create own keys"
  on public.api_keys for insert
  with check (user_id = auth.uid());

create policy "Users can update own keys"
  on public.api_keys for update
  using (user_id = auth.uid());

create policy "Users can delete own keys"
  on public.api_keys for delete
  using (user_id = auth.uid() or public.is_super_admin());


-- ==== DOCUMENTS ====
create policy "Users can view own documents"
  on public.documents for select
  using (user_id = auth.uid() or public.is_org_member(org_id) or public.is_super_admin());

create policy "Users can upload documents"
  on public.documents for insert
  with check (user_id = auth.uid());

create policy "Users can update own documents"
  on public.documents for update
  using (user_id = auth.uid());

create policy "Users can delete own documents"
  on public.documents for delete
  using (user_id = auth.uid() or public.is_super_admin());


-- ==== OCR RESULTS ====
create policy "Users can view own results"
  on public.ocr_results for select
  using (user_id = auth.uid() or public.is_super_admin());

create policy "Users can insert own results"
  on public.ocr_results for insert
  with check (user_id = auth.uid());

create policy "Users can update own results"
  on public.ocr_results for update
  using (user_id = auth.uid());


-- ==== USAGE LOGS ====
create policy "Users can view own usage"
  on public.usage_logs for select
  using (user_id = auth.uid() or public.is_super_admin());

create policy "Users can log own usage"
  on public.usage_logs for insert
  with check (user_id = auth.uid());

create policy "Super admins can view all usage"
  on public.usage_logs for select
  using (public.is_super_admin());


-- ==== SUBSCRIPTIONS ====
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (user_id = auth.uid() or public.is_super_admin());

create policy "System can manage subscriptions"
  on public.subscriptions for all
  using (public.is_super_admin());


-- ==== AUDIT LOG ====
create policy "Super admins can view audit log"
  on public.audit_log for select
  using (public.is_super_admin());

create policy "Users can view own audit entries"
  on public.audit_log for select
  using (actor_id = auth.uid());

create policy "System can insert audit entries"
  on public.audit_log for insert
  with check (actor_id = auth.uid() or public.is_super_admin());


-- ================================================================
-- TRIGGERS & FUNCTIONS
-- ================================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Auto-update updated_at timestamps
create or replace function public.update_modified_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_modified_at();

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.update_modified_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_modified_at();


-- Reset monthly usage on the 1st of each month (call via cron/Edge Function)
create or replace function public.reset_monthly_usage()
returns void as $$
begin
  update public.profiles
  set monthly_usage = 0,
      usage_reset_at = date_trunc('month', now()) + interval '1 month';

  update public.organizations
  set monthly_usage = 0;
end;
$$ language plpgsql security definer;
