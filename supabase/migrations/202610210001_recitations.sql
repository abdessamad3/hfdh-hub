-- Private audio is served only by the Firebase-authorizing Edge Function.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('recitations','recitations',false,33554432,array['audio/webm','audio/ogg','audio/mp4'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create table if not exists public.recitations (
 id uuid primary key,
 student_id text not null,
 owner_uid text not null,
 object_path text unique not null,
 metadata jsonb not null,
 bytes bigint not null check(bytes between 1 and 33554432),
 state text not null default 'pending' check(state in ('pending','online')),
 created_at timestamptz not null default now()
);
alter table public.recitations enable row level security;
revoke all on public.recitations from anon, authenticated;
grant select,insert,update on public.recitations to service_role;
-- No storage.objects policies are added: client tokens cannot bypass the function.
create or replace function public.reserve_recitation(record_id uuid,student text,owner text,path text,meta jsonb,size bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
 perform pg_advisory_xact_lock(210042);
 if exists(select 1 from recitations where id=record_id) then
  if not exists(select 1 from recitations where id=record_id and owner_uid=owner and metadata=meta) then raise exception 'conflict'; end if;
  return;
 end if;
 if size < 1 or size > 33554432 or (select coalesce(sum(bytes),0) from recitations)+size > 900000000 then raise exception 'audio quota reached'; end if;
 insert into recitations(id,student_id,owner_uid,object_path,metadata,bytes) values(record_id,student,owner,path,meta,size);
end; $$;
revoke all on function public.reserve_recitation(uuid,text,text,text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.reserve_recitation(uuid,text,text,text,jsonb,bigint) to service_role;
create or replace function public.recitation_storage_usage()
returns bigint language sql security definer set search_path=public as $$ select coalesce(sum(bytes),0) from recitations $$;
revoke all on function public.recitation_storage_usage() from public,anon,authenticated;
grant execute on function public.recitation_storage_usage() to service_role;
