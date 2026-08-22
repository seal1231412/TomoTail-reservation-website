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
