-- Dedicated project. Auth identity lives in Supabase Auth; NO sample personal finance data here.
create table if not exists public.cases (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'Plano Justo', payload jsonb not null default '{}'::jsonb,
 version integer not null default 1 check(version>=1), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint cases_payload_limit check (octet_length(payload::text) <= 200000)
);
create index if not exists cases_owner_updated on public.cases(owner_id,updated_at desc);
create table if not exists public.case_revisions (
 id bigint generated always as identity primary key, case_id uuid not null references public.cases(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade, version integer not null, note text not null default 'Edição confirmada',
 snapshot jsonb not null, created_at timestamptz not null default now(), unique(case_id,version)
);
create table if not exists public.chat_messages (
 id bigint generated always as identity primary key, case_id uuid not null references public.cases(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade, role text not null check(role in('user','assistant')),
 content text not null check(char_length(content)<=12000), created_at timestamptz not null default now()
);
create index if not exists chat_owner_created on public.chat_messages(owner_id,created_at desc);
create table if not exists public.feature_requests (
 id bigint generated always as identity primary key, case_id uuid not null references public.cases(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade, description text not null check(char_length(description)<=3000),
 status text not null default 'solicitado' check(status in('solicitado','em_analise','feito','descartado')),
 created_at timestamptz not null default now()
);

alter table public.cases enable row level security;
alter table public.case_revisions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.feature_requests enable row level security;

create policy cases_read on public.cases for select to authenticated using ((select auth.uid())=owner_id);
create policy cases_insert on public.cases for insert to authenticated with check ((select auth.uid())=owner_id);
create policy cases_update on public.cases for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy cases_delete on public.cases for delete to authenticated using ((select auth.uid())=owner_id);

create policy revisions_read on public.case_revisions for select to authenticated using ((select auth.uid())=owner_id and exists(select 1 from public.cases c where c.id=case_id and c.owner_id=(select auth.uid())));
create policy revisions_insert on public.case_revisions for insert to authenticated with check ((select auth.uid())=owner_id and exists(select 1 from public.cases c where c.id=case_id and c.owner_id=(select auth.uid())));

create policy messages_read on public.chat_messages for select to authenticated using ((select auth.uid())=owner_id and exists(select 1 from public.cases c where c.id=case_id and c.owner_id=(select auth.uid())));
create policy messages_insert on public.chat_messages for insert to authenticated with check ((select auth.uid())=owner_id and exists(select 1 from public.cases c where c.id=case_id and c.owner_id=(select auth.uid())));

create policy features_read on public.feature_requests for select to authenticated using ((select auth.uid())=owner_id and exists(select 1 from public.cases c where c.id=case_id and c.owner_id=(select auth.uid())));
create policy features_insert on public.feature_requests for insert to authenticated with check ((select auth.uid())=owner_id and exists(select 1 from public.cases c where c.id=case_id and c.owner_id=(select auth.uid())));
create policy features_update on public.feature_requests for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);

revoke all on public.cases,public.case_revisions,public.chat_messages,public.feature_requests from anon;
grant select,insert,update,delete on public.cases to authenticated;
grant select,insert on public.case_revisions to authenticated;
grant select,insert on public.chat_messages to authenticated;
grant select,insert,update on public.feature_requests to authenticated;
grant usage,select on all sequences in schema public to authenticated;