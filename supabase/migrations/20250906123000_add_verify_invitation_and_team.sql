-- Create RPC to verify invitation token and fetch team info bypassing RLS (security definer)
set check_function_bodies = off;

create or replace function public.verify_invitation_and_team(p_token text)
returns table (
  invitation_id uuid,
  email text,
  role text,
  status text,
  expires_at timestamptz,
  invited_by uuid,
  team_id uuid,
  team_name text,
  team_description text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    ti.id,
    ti.email,
    ti.role,
    ti.status,
    ti.expires_at,
    ti.invited_by,
    ti.team_id,
    t.name,
    t.description
  from public.team_invitations ti
  join public.teams t on t.id = ti.team_id
  where ti.token = p_token
    and ti.status = 'pending'
    and ti.expires_at > now()
  limit 1;
end;
$$;

grant execute on function public.verify_invitation_and_team(text) to anon, authenticated;

