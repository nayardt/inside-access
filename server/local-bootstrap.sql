-- Development compatibility layer ONLY. Supabase already provides auth and API roles.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key, email text unique not null);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create schema local_auth;
create table local_auth.credentials(user_id uuid primary key references auth.users(id), salt text not null, password_hash text not null);
create table local_auth.sessions(token_hash text primary key, user_id uuid not null references auth.users(id), expires_at timestamptz not null);
