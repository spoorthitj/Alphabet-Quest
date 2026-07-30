alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.game_statistics enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view own progress" on public.user_progress
  for select using (auth.uid() = user_id);
create policy "Users can upsert own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);
create policy "Users can update own progress" on public.user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view own achievements" on public.achievements
  for select using (auth.uid() = user_id);
create policy "Users can upsert own achievements" on public.achievements
  for insert with check (auth.uid() = user_id);
create policy "Users can update own achievements" on public.achievements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view own stats" on public.game_statistics
  for select using (auth.uid() = user_id);
create policy "Users can upsert own stats" on public.game_statistics
  for insert with check (auth.uid() = user_id);
create policy "Users can update own stats" on public.game_statistics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
