create table if not exists reservations (
  id text primary key,
  reservationid text,
  date text not null,
  name text,
  email text,
  dogcount integer default 0,
  dogs jsonb default '[]'::jsonb,
  dropoff text,
  pickup text,
  created_at timestamptz default now()
);

create table if not exists unavailable_dates (
  date text primary key
);

create index if not exists reservations_date_idx on reservations(date);
create index if not exists reservations_email_idx on reservations(email);

alter table reservations enable row level security;
alter table unavailable_dates enable row level security;

drop policy if exists "Public can read reservations" on reservations;
drop policy if exists "Public can insert reservations" on reservations;
drop policy if exists "Public can delete reservations" on reservations;
drop policy if exists "Public can read unavailable dates" on unavailable_dates;
drop policy if exists "Public can insert unavailable dates" on unavailable_dates;
drop policy if exists "Public can delete unavailable dates" on unavailable_dates;

create policy "Public can read reservations" on reservations for select to anon, authenticated using (true);
create policy "Public can insert reservations" on reservations for insert to anon, authenticated with check (true);
create policy "Public can delete reservations" on reservations for delete to anon, authenticated using (true);
create policy "Public can read unavailable dates" on unavailable_dates for select to anon, authenticated using (true);
create policy "Public can insert unavailable dates" on unavailable_dates for insert to anon, authenticated with check (true);
create policy "Public can delete unavailable dates" on unavailable_dates for delete to anon, authenticated using (true);
