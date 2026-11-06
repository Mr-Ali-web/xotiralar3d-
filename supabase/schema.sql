-- Supabase schema
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'user' check (role in ('user','admin')),
  banned boolean not null default false,
  created_at timestamptz default now(),
  last_seen timestamptz
);
create table houses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null default 'Mening uyim',
  wall_color text default '#333366',
  floor_color text default '#222244',
  theme text default 'dark',
  music_id uuid,
  is_public boolean default true,
  visits int default 0,
  created_at timestamptz default now()
);
create table house_rooms (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  room_index int not null check (room_index between 0 and 5),
  name text not null,
  color int not null default 335 check (color between 0 and 360),
  mode text not null default 'dark' check (mode in ('dark','light')),
  unique (house_id, room_index),
  unique (house_id, id)
);
create table stands (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  room_id uuid not null references house_rooms(id) on delete cascade,
  stand_index int not null check (stand_index between 0 and 8),
  image_url text,
  title text,
  caption text,
  updated_at timestamptz default now(),
  unique (room_id, stand_index),
  foreign key (house_id, room_id) references house_rooms(house_id, id) on delete cascade
);
create table wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  body text not null check (char_length(body) between 1 and 500),
  rating int default 0,
  created_at timestamptz default now()
);
create table wish_votes (
  wish_id uuid references wishes(id) on delete cascade,
  user_id uuid references profiles(id),
  value int not null check (value between 1 and 5),
  primary key (wish_id,user_id)
);
create table house_votes (
  house_id uuid references houses(id) on delete cascade,
  user_id uuid references profiles(id),
  value int not null check (value between 1 and 5),
  primary key (house_id,user_id)
);
create table guestbook (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references houses(id) on delete cascade,
  author_id uuid references profiles(id),
  author_name text,
  message text not null,
  created_at timestamptz default now()
);
create table songs (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  artist text,
  url text not null,
  sort_order int default 0
);
create table news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  created_at timestamptz default now()
);
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  target_user_id uuid references profiles(id),
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);
create table complaints (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),
  target_type text,
  target_id uuid,
  reason text,
  resolved boolean not null default false,
  created_at timestamptz default now()
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create table user_badges (
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- RLS
alter table profiles enable row level security;
alter table houses enable row level security;
alter table house_rooms enable row level security;
alter table stands enable row level security;
alter table wishes enable row level security;
alter table wish_votes enable row level security;
alter table house_votes enable row level security;
alter table guestbook enable row level security;
alter table songs enable row level security;
alter table news enable row level security;
alter table audit_log enable row level security;
alter table complaints enable row level security;
alter table notifications enable row level security;
alter table user_badges enable row level security;

-- policies (basic)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and role='admin' and not banned)
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and not banned)
$$;

create policy "profiles read all" on profiles for select using (true);
create policy "profiles self update" on profiles for update using (auth.uid()=id and public.is_active_user());
create policy "profiles admin update" on profiles for update using (public.is_admin()) with check (public.is_admin());
create policy "houses read public" on houses for select using (is_public or owner_id=auth.uid() or public.is_admin());
create policy "houses owner insert" on houses for insert with check (public.is_active_user() and owner_id=auth.uid());
create policy "houses owner update" on houses for update
using (public.is_active_user() and (owner_id=auth.uid() or public.is_admin()))
with check (public.is_active_user() and (owner_id=auth.uid() or public.is_admin()));
create policy "house rooms read" on house_rooms for select using (public.is_admin() or exists(select 1 from houses h where h.id=house_id and (h.is_public or h.owner_id=auth.uid())));
create policy "house rooms owner write" on house_rooms for all
using (public.is_active_user() and (public.is_admin() or exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())))
with check (public.is_active_user() and (public.is_admin() or exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())));
create policy "stands read" on stands for select using (public.is_admin() or exists(select 1 from houses h where h.id=house_id and (h.is_public or h.owner_id=auth.uid())));
create policy "stands owner write" on stands for all
using (public.is_active_user() and (public.is_admin() or exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())))
with check (public.is_active_user() and (public.is_admin() or exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())));
create policy "wishes read" on wishes for select using (true);
create policy "wishes insert auth" on wishes for insert with check (public.is_active_user() and auth.uid()=user_id);
create policy "wishes delete own or admin" on wishes for delete using (public.is_active_user() and (user_id=auth.uid() or public.is_admin()));
create policy "wish_votes self" on wish_votes for all
using (public.is_active_user() and auth.uid()=user_id)
with check (public.is_active_user() and auth.uid()=user_id);
create policy "wish votes read" on wish_votes for select using (true);
create policy "house votes read" on house_votes for select using (exists(select 1 from houses h where h.id=house_id and (h.is_public or h.owner_id=auth.uid())));
create policy "house_votes self not owner" on house_votes for insert with check (
  public.is_active_user()
  and auth.uid()=user_id
  and exists(select 1 from houses h where h.id=house_id and (h.is_public or h.owner_id=auth.uid()))
  and not exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid())
);
create policy "house votes delete own" on house_votes for delete using (public.is_active_user() and auth.uid()=user_id);
create policy "guestbook read" on guestbook for select using (exists(select 1 from houses h where h.id=house_id and (h.is_public or h.owner_id=auth.uid())));
create policy "guestbook insert auth" on guestbook for insert with check (
  public.is_active_user()
  and auth.uid()=author_id
  and exists(select 1 from houses h where h.id=house_id and (h.is_public or h.owner_id=auth.uid()))
);
create policy "guestbook owner delete" on guestbook for delete using (public.is_active_user() and exists(select 1 from houses h where h.id=house_id and h.owner_id=auth.uid()));
create policy "guestbook author delete" on guestbook for delete using (public.is_active_user() and auth.uid()=author_id);
create policy "guestbook admin delete" on guestbook for delete using (public.is_active_user() and public.is_admin());
create policy "songs read" on songs for select using (true);
create policy "songs admin write" on songs for all using (public.is_admin()) with check (public.is_admin());
create policy "news read" on news for select using (true);
create policy "news admin write" on news for all using (public.is_admin()) with check (public.is_admin());
create policy "complaints insert auth" on complaints for insert with check (public.is_active_user() and auth.uid()=reporter_id);
create policy "complaints admin read" on complaints for select using (public.is_admin());
create policy "complaints admin update" on complaints for update using (public.is_admin()) with check (public.is_admin());
create policy "audit read admin" on audit_log for select using (public.is_admin());
create policy "audit insert admin" on audit_log for insert with check (auth.uid()=actor_id and public.is_admin());
create policy "notifications read own" on notifications for select using (auth.uid()=user_id);
create policy "notifications update own" on notifications for update
using (public.is_active_user() and auth.uid()=user_id)
with check (public.is_active_user() and auth.uid()=user_id);
create policy "badges read own" on user_badges for select using (auth.uid()=user_id);

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
grant execute on function public.record_house_visit(uuid) to anon, authenticated;

create or replace function public.notify_house_vote()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  house_owner uuid;
  voter_name text;
begin
  select owner_id into house_owner from houses where id=new.house_id;
  if house_owner is not null and house_owner<>new.user_id then
    select username into voter_name from profiles where id=new.user_id;
    insert into notifications(user_id,body) values(house_owner,'❤️ '||coalesce(voter_name,'Foydalanuvchi')||' uyingizga layk bosdi');
  end if;
  return new;
end
$$;
create trigger house_vote_notification after insert on house_votes
for each row execute function public.notify_house_vote();

create or replace function public.notify_guestbook_entry()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  house_owner uuid;
begin
  select owner_id into house_owner from houses where id=new.house_id;
  if house_owner is not null and house_owner<>new.author_id then
    insert into notifications(user_id,body) values(house_owner,'📖 '||coalesce(new.author_name,'Mehmon')||' mehmonlar kitobiga yozdi');
  end if;
  return new;
end
$$;
create trigger guestbook_notification after insert on guestbook
for each row execute function public.notify_guestbook_entry();

create or replace function public.notify_wish_vote()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  wish_owner uuid;
  voter_name text;
begin
  select user_id into wish_owner from wishes where id=new.wish_id;
  if wish_owner is not null and wish_owner<>new.user_id then
    select username into voter_name from profiles where id=new.user_id;
    insert into notifications(user_id,body) values(wish_owner,'❤️ '||coalesce(voter_name,'Foydalanuvchi')||' tilagingizga layk bosdi');
  end if;
  return new;
end
$$;
create trigger wish_vote_notification after insert on wish_votes
for each row execute function public.notify_wish_vote();

create or replace function public.notify_news()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into notifications(user_id,body)
  select id,'📰 '||new.title from profiles where id<>auth.uid();
  return new;
end
$$;
create trigger news_notification after insert on news
for each row execute function public.notify_news();

create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid()=old.id and not public.is_admin() then
    new.role := old.role;
    new.banned := old.banned;
  end if;
  return new;
end
$$;
create trigger protect_profile_privileges before update on profiles
for each row execute function public.protect_profile_privileges();

create or replace function public.update_my_username(new_username text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_active_user() then raise exception 'Account is banned'; end if;
  if char_length(trim(new_username)) not between 2 and 24 then raise exception 'Username must be 2–24 characters'; end if;
  update profiles set username=trim(new_username) where id=auth.uid();
end
$$;
grant execute on function public.update_my_username(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  base_name text;
  chosen_name text;
  new_house uuid;
begin
  base_name := coalesce(nullif(trim(new.raw_user_meta_data->>'username'),''),split_part(coalesce(new.email,'user'),'@',1));
  chosen_name := left(base_name,24);
  if exists(select 1 from profiles where username=chosen_name) then
    chosen_name := left(base_name,15)||'-'||left(new.id::text,8);
  end if;
  insert into profiles(id,username) values(new.id,chosen_name);
  insert into houses(owner_id,name) values(new.id,chosen_name||' uyi') returning id into new_house;
  insert into house_rooms(house_id,room_index,name,color,mode) values
    (new_house,0,'Mehmonxona',335,'dark'),
    (new_house,1,'Xotiralar xonasi',20,'dark'),
    (new_house,2,'Sevgi bog‘i',65,'light');
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

insert into storage.buckets(id,name,public)
values ('house-images','house-images',true)
on conflict (id) do update set public=true;
create policy "house images public read" on storage.objects for select using (bucket_id='house-images');
create policy "house images owner insert" on storage.objects for insert to authenticated
with check (public.is_active_user() and bucket_id='house-images' and split_part(name,'/',1)=auth.uid()::text);
create policy "house images owner update" on storage.objects for update to authenticated
using (public.is_active_user() and bucket_id='house-images' and split_part(name,'/',1)=auth.uid()::text)
with check (public.is_active_user() and bucket_id='house-images' and split_part(name,'/',1)=auth.uid()::text);

drop function if exists public.check_secret_password(uuid, text);
