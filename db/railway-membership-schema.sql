create extension if not exists "pgcrypto";

create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    full_name text not null,
    password_hash text,
    status text not null default 'active' check (status in ('active', 'disabled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists subscription_plans (
    id uuid primary key default gen_random_uuid(),
    plan_code text not null unique,
    display_name text not null,
    billing_interval text not null check (billing_interval in ('month', 'year', 'one_time')),
    amount_cents integer not null check (amount_cents >= 0),
    currency text not null default 'PHP',
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    plan_id uuid not null references subscription_plans(id),
    provider text not null default 'paymongo',
    provider_customer_id text,
    provider_subscription_id text,
    provider_checkout_id text,
    status text not null check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
    starts_at timestamptz,
    current_period_end timestamptz,
    cancelled_at timestamptz,
    cancel_at_period_end boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete set null,
    subscription_id uuid references subscriptions(id) on delete set null,
    provider text not null default 'paymongo',
    provider_event_id text,
    provider_payment_id text,
    provider_checkout_id text,
    amount_cents integer not null check (amount_cents >= 0),
    currency text not null default 'PHP',
    status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
    raw_payload jsonb,
    paid_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists course_access (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    course_slug text not null,
    access_status text not null check (access_status in ('active', 'revoked', 'pending')),
    subscription_id uuid references subscriptions(id) on delete set null,
    granted_at timestamptz not null default now(),
    revoked_at timestamptz,
    unique (user_id, course_slug)
);

create table if not exists webhook_events (
    id uuid primary key default gen_random_uuid(),
    provider text not null default 'paymongo',
    provider_event_id text,
    event_type text not null,
    payload jsonb not null,
    processed_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists user_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now(),
    last_used_at timestamptz not null default now()
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_status on subscriptions(status);
create index if not exists idx_payments_subscription_id on payments(subscription_id);
create index if not exists idx_payments_provider_checkout_id on payments(provider_checkout_id);
create index if not exists idx_course_access_user_id on course_access(user_id);
create index if not exists idx_user_sessions_user_id on user_sessions(user_id);
create index if not exists idx_user_sessions_expires_at on user_sessions(expires_at);

insert into subscription_plans (plan_code, display_name, billing_interval, amount_cents, currency)
values ('courseClubMonthly', 'Course Club Monthly', 'month', 99900, 'PHP')
on conflict (plan_code) do update
set display_name = excluded.display_name,
    billing_interval = excluded.billing_interval,
    amount_cents = excluded.amount_cents,
    currency = excluded.currency,
    is_active = true;
