create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and role='admin' and not banned)
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and not banned)
$$;

drop policy if exists "profiles self update" on profiles;
create policy "profiles self update" on profiles for update
using (auth.uid()=id and public.is_active_user());

drop policy if exists "houses owner insert" on houses;
create policy "houses owner insert" on houses for insert
with check (public.is_active_user() and owner_id=auth.uid());

drop policy if exists "houses owner update" on houses;
create policy "houses owner update" on houses for update
using (public.is_active_user() and (owner_id=auth.uid() or public.is_admin()))
with check (public.is_active_user() and (owner_id=auth.uid() or public.is_admin()));

drop policy if exists "house rooms owner write" on house_rooms;
create policy "house rooms owner write" on house_rooms for all
using (public.is_active_user() and (public.is_admin() or exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())))
with check (public.is_active_user() and (public.is_admin() or exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())));

drop policy if exists "stands owner write" on stands;
create policy "stands owner write" on stands for all
using (public.is_active_user() and (public.is_admin() or exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())))
with check (public.is_active_user() and (public.is_admin() or exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())));

drop policy if exists "wishes insert auth" on wishes;
create policy "wishes insert auth" on wishes for insert
with check (public.is_active_user() and auth.uid()=user_id);

drop policy if exists "wishes delete own or admin" on wishes;
create policy "wishes delete own or admin" on wishes for delete
using (public.is_active_user() and (user_id=auth.uid() or public.is_admin()));

drop policy if exists "wish_votes self" on wish_votes;
create policy "wish_votes self" on wish_votes for all
using (public.is_active_user() and auth.uid()=user_id)
with check (public.is_active_user() and auth.uid()=user_id);

drop policy if exists "house_votes self not owner" on house_votes;
create policy "house_votes self not owner" on house_votes for insert
with check (
  public.is_active_user()
  and auth.uid()=user_id
  and exists(select 1 from houses h where h.id=house_id and (h.is_public or h.owner_id=auth.uid()))
  and not exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())
);

drop policy if exists "house votes delete own" on house_votes;
create policy "house votes delete own" on house_votes for delete
using (public.is_active_user() and auth.uid()=user_id);

drop policy if exists "guestbook insert auth" on guestbook;
create policy "guestbook insert auth" on guestbook for insert
with check (
  public.is_active_user()
  and auth.uid()=author_id
  and exists(select 1 from houses h where h.id=house_id and (h.is_public or h.owner_id=auth.uid()))
);

drop policy if exists "guestbook owner delete" on guestbook;
create policy "guestbook owner delete" on guestbook for delete
using (public.is_active_user() and exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid()));

drop policy if exists "guestbook author delete" on guestbook;
create policy "guestbook author delete" on guestbook for delete
using (public.is_active_user() and auth.uid()=author_id);

drop policy if exists "guestbook admin delete" on guestbook;
create policy "guestbook admin delete" on guestbook for delete
using (public.is_active_user() and public.is_admin());

drop policy if exists "complaints insert auth" on complaints;
create policy "complaints insert auth" on complaints for insert
with check (public.is_active_user() and auth.uid()=reporter_id);

drop policy if exists "audit read admin" on audit_log;
create policy "audit read admin" on audit_log for select
using (public.is_admin());

drop policy if exists "notifications update own" on notifications;
create policy "notifications update own" on notifications for update
using (public.is_active_user() and auth.uid()=user_id)
with check (public.is_active_user() and auth.uid()=user_id);

create or replace function public.record_house_visit(p_house uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  house_owner uuid;
  visitor_name text;
begin
  if auth.uid() is not null and not public.is_active_user() then
    raise exception 'Account is banned';
  end if;
  update houses set visits=visits+1 where id=p_house and (is_public or owner_id=auth.uid())
  returning owner_id into house_owner;
  if not found then raise exception 'House not found'; end if;
  if auth.uid() is not null and auth.uid()<>house_owner then
    select username into visitor_name from profiles where id=auth.uid();
    insert into notifications(user_id,body) values(house_owner,'👋 '||coalesce(visitor_name,'Mehmon')||' uyingizga kirdi');
  end if;
end
$$;

create or replace function public.update_my_username(new_username text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_active_user() then raise exception 'Account is banned'; end if;
  if char_length(trim(new_username)) not between 2 and 24 then raise exception 'Username must be 2–24 characters'; end if;
  update profiles set username=trim(new_username) where id=auth.uid();
end
$$;

drop policy if exists "house images owner insert" on storage.objects;
create policy "house images owner insert" on storage.objects for insert to authenticated
with check (public.is_active_user() and bucket_id='house-images' and split_part(name,'/',1)=auth.uid()::text);

drop policy if exists "house images owner update" on storage.objects;
create policy "house images owner update" on storage.objects for update to authenticated
using (public.is_active_user() and bucket_id='house-images' and split_part(name,'/',1)=auth.uid()::text)
with check (public.is_active_user() and bucket_id='house-images' and split_part(name,'/',1)=auth.uid()::text);

drop function if exists public.check_secret_password(uuid, text);
