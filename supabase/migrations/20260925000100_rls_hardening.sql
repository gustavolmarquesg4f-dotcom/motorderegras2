-- Confirmed applied to dedicated Supabase project. Harden parent ownership for updates.
drop policy if exists features_update on public.feature_requests;
create policy features_update on public.feature_requests for update to authenticated
 using ((select auth.uid())=owner_id and exists(select 1 from public.cases c where c.id=case_id and c.owner_id=(select auth.uid())))
 with check ((select auth.uid())=owner_id and exists(select 1 from public.cases c where c.id=case_id and c.owner_id=(select auth.uid())));
create index if not exists case_revisions_owner_id_idx on public.case_revisions(owner_id);
create index if not exists chat_messages_case_id_idx on public.chat_messages(case_id);
create index if not exists feature_requests_case_id_idx on public.feature_requests(case_id);
create index if not exists feature_requests_owner_id_idx on public.feature_requests(owner_id);