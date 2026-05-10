
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles viewable by authenticated" on public.profiles for select to authenticated using (true);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

-- Auto-create profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text,1,6)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Feed posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "posts viewable" on public.posts for select to authenticated using (true);
create policy "users create own posts" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own posts" on public.posts for update to authenticated using (auth.uid() = user_id);
create policy "users delete own posts" on public.posts for delete to authenticated using (auth.uid() = user_id);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "view own messages" on public.messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "send messages" on public.messages for insert to authenticated with check (auth.uid() = sender_id);
create index on public.messages (sender_id, recipient_id, created_at);

-- Videos
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  created_at timestamptz not null default now()
);
alter table public.videos enable row level security;
create policy "videos viewable" on public.videos for select to authenticated using (true);
create policy "users create own videos" on public.videos for insert to authenticated with check (auth.uid() = user_id);
create policy "users delete own videos" on public.videos for delete to authenticated using (auth.uid() = user_id);

-- Groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.groups enable row level security;
create policy "groups viewable" on public.groups for select to authenticated using (true);
create policy "users create groups" on public.groups for insert to authenticated with check (auth.uid() = created_by);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;
create policy "members viewable" on public.group_members for select to authenticated using (true);
create policy "users join groups" on public.group_members for insert to authenticated with check (auth.uid() = user_id);
create policy "users leave groups" on public.group_members for delete to authenticated using (auth.uid() = user_id);

create table public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.group_posts enable row level security;
create policy "group posts viewable" on public.group_posts for select to authenticated using (true);
create policy "members post" on public.group_posts for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.group_members where group_id = group_posts.group_id and user_id = auth.uid()));
create policy "users delete own group posts" on public.group_posts for delete to authenticated using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.group_posts;

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('post-images','post-images',true),
  ('videos','videos',true),
  ('video-thumbnails','video-thumbnails',true),
  ('avatars','avatars',true);

create policy "public read media" on storage.objects for select to public
  using (bucket_id in ('post-images','videos','video-thumbnails','avatars'));
create policy "auth upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('post-images','videos','video-thumbnails','avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "auth delete own files" on storage.objects for delete to authenticated
  using (bucket_id in ('post-images','videos','video-thumbnails','avatars') and (storage.foldername(name))[1] = auth.uid()::text);
