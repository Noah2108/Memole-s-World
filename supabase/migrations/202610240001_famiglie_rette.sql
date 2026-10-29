-- Schema per la futura integrazione cloud. NON eseguito dalla V0.1 locale.
-- Richiede Supabase Auth; nessuna password o chiave in questo repository.
begin;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  name text not null check (length(trim(name)) between 2 and 1000),
  relationship text not null, phone text not null default '', email text not null default '', notes text not null default '',
  unique (owner_id, id)
);
create table public.children (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  last_name text not null check (length(trim(last_name)) between 1 and 80),
  birth_date date, school text not null default '', grade text not null default '',
  notes text not null default '', active boolean not null default true,
  unique (owner_id, id)
);
create table public.child_guardians (
  owner_id uuid not null default auth.uid() references auth.users(id),
  child_id uuid not null, guardian_id uuid not null,
  primary key (owner_id, child_id, guardian_id),
  foreign key (owner_id, child_id) references public.children(owner_id, id),
  foreign key (owner_id, guardian_id) references public.guardians(owner_id, id)
);
create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  child_id uuid not null,
  kind text not null check (kind in ('weekly','monthly','custom')),
  label text not null check (length(trim(label)) between 1 and 120),
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  starts_on date not null, ends_on date, due_day integer not null default 5 check (due_day between 1 and 28),
  check (ends_on is null or ends_on >= starts_on),
  foreign key (owner_id, child_id) references public.children(owner_id, id),
  unique (owner_id, id, child_id),
  exclude using gist (owner_id with =, child_id with =, daterange(starts_on, ends_on, '[]') with &&)
);
create table public.charges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  child_id uuid not null, agreement_id uuid not null,
  emission_key text not null, label text not null,
  due_date date not null, period_start date not null, period_end date not null,
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  foreign key (owner_id, child_id) references public.children(owner_id, id),
  foreign key (owner_id, agreement_id, child_id) references public.agreements(owner_id, id, child_id),
  unique (owner_id, emission_key), unique (owner_id, id)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  charge_id uuid not null,
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  paid_on date not null, method text not null check (method in ('bank','cash','card','other')),
  note text not null default '', created_at timestamptz not null default now(),
  voided_at timestamptz, void_reason text not null default '',
  check (voided_at is null or length(trim(void_reason)) between 3 and 1000),
  foreign key (owner_id, charge_id) references public.charges(owner_id, id)
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  at timestamptz not null default now(), action text not null, detail text not null
);
create index charges_owner_date on public.charges(owner_id, due_date);
create index payments_owner_charge on public.payments(owner_id, charge_id);
create index payments_owner_date on public.payments(owner_id, paid_on);
create index audit_owner_date on public.audit_events(owner_id, at desc);

-- Invoker: nessuna funzione definer esposta al client.
create function public.protect_payment() returns trigger language plpgsql set search_path = '' as $$
declare expected integer; received bigint;
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'voided_at' - 'void_reason') is distinct from (to_jsonb(old) - 'voided_at' - 'void_reason')
       or old.voided_at is not null or new.voided_at is null then
      raise exception 'Solo lo storno motivato di un pagamento valido è consentito';
    end if;
    new.voided_at := now();
  elsif new.voided_at is not null then
    raise exception 'Un nuovo pagamento non può essere già stornato';
  end if;
  if new.paid_on > timezone('Europe/Rome', now())::date then raise exception 'Data di pagamento futura'; end if;
  -- Serializza pagamenti concorrenti sulla stessa scadenza.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text || ':' || new.charge_id::text, 0));
  select amount_cents into expected from public.charges where owner_id = new.owner_id and id = new.charge_id;
  if not found then raise exception 'Scadenza inesistente o non accessibile'; end if;
  select coalesce(sum(amount_cents),0) into received from public.payments
    where owner_id = new.owner_id and charge_id = new.charge_id and voided_at is null and id <> new.id;
  if new.voided_at is null and received + new.amount_cents > expected then raise exception 'Importo superiore al residuo'; end if;
  return new;
end $$;
create trigger protect_payment before insert or update on public.payments for each row execute function public.protect_payment();

create function public.protect_agreement() returns trigger language plpgsql set search_path = '' as $$
declare latest date;
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'ends_on') is distinct from (to_jsonb(old) - 'ends_on') or old.ends_on is not null or new.ends_on is null then
      raise exception 'Solo la chiusura di un accordo aperto è consentita';
    end if;
    select max(period_end) into latest from public.charges where owner_id = new.owner_id and agreement_id = new.id;
    if latest is not null and new.ends_on < latest then raise exception 'Esistono periodi già emessi'; end if;
  else
    select max(period_end) into latest from public.charges where owner_id = new.owner_id and child_id = new.child_id;
    if latest is not null and new.starts_on <= latest then raise exception 'Il nuovo accordo precede periodi già emessi'; end if;
  end if;
  return new;
end $$;
create trigger protect_agreement before insert or update on public.agreements for each row execute function public.protect_agreement();

-- RLS per proprietario; le FK composte impediscono collegamenti tra due account.
do $$
declare t text;
begin
  foreach t in array array['guardians','children','child_guardians','agreements','charges','payments','audit_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert on table public.%I to authenticated', t);
    execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid()) = owner_id)', t);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = owner_id)', t);
  end loop;
  foreach t in array array['guardians','children','agreements','payments'] loop
    execute format('grant update on table public.%I to authenticated', t);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', t);
  end loop;
end $$;
grant delete on public.child_guardians to authenticated;
create policy owner_delete_link on public.child_guardians for delete to authenticated using ((select auth.uid()) = owner_id);
-- Charges/audit append-only; nessun permesso DELETE sulle entità storiche.
revoke all on function public.protect_payment() from public;
revoke all on function public.protect_agreement() from public;
commit;
