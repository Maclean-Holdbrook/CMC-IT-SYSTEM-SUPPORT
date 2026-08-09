create or replace function public.create_ticket_for_report(
  p_report_id uuid,
  p_worker_id uuid default null,
  p_priority public.priority_level default 'medium',
  p_instructions text default null
)
returns public.tickets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_ticket public.tickets;
  report_title text;
  ticket_reference text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  select title into report_title
  from public.reports
  where id = p_report_id
  for update;

  if report_title is null then
    raise exception 'Report not found';
  end if;

  if p_worker_id is not null and not exists (
    select 1 from public.profiles
    where id = p_worker_id and role = 'worker' and active
  ) then
    raise exception 'Selected worker is not active';
  end if;

  ticket_reference := 'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.tickets (
    ticket_number,
    report_id,
    assigned_worker_id,
    assigned_by,
    title,
    instructions,
    priority
  ) values (
    ticket_reference,
    p_report_id,
    p_worker_id,
    auth.uid(),
    report_title,
    nullif(trim(p_instructions), ''),
    p_priority
  ) returning * into created_ticket;

  update public.reports
  set status = 'assigned'
  where id = p_report_id and status in ('submitted', 'under_review');

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
  values (
    auth.uid(),
    'ticket.created',
    'ticket',
    created_ticket.id,
    jsonb_build_object(
      'ticket_number', created_ticket.ticket_number,
      'report_id', created_ticket.report_id,
      'assigned_worker_id', created_ticket.assigned_worker_id,
      'priority', created_ticket.priority
    )
  );

  return created_ticket;
end;
$$;

grant execute on function public.create_ticket_for_report(uuid, uuid, public.priority_level, text) to authenticated;

create policy "admins create audit entries"
on public.audit_logs for insert to authenticated
with check (public.is_admin() and actor_id = auth.uid());
