create or replace function public.worker_update_ticket(
  p_ticket_id uuid,
  p_status public.ticket_status,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_ticket public.tickets;
  updated_ticket public.tickets;
  created_update_id uuid;
  allowed boolean := false;
begin
  select * into current_ticket
  from public.tickets
  where id = p_ticket_id and assigned_worker_id = auth.uid()
  for update;

  if current_ticket.id is null then
    raise exception 'Assigned ticket not found';
  end if;

  allowed := current_ticket.status = p_status
    or (current_ticket.status = 'assigned' and p_status = 'accepted')
    or (current_ticket.status = 'accepted' and p_status = 'in_progress')
    or (current_ticket.status = 'in_progress' and p_status in ('blocked', 'completed'))
    or (current_ticket.status = 'blocked' and p_status in ('in_progress', 'completed'));

  if not allowed then
    raise exception 'Invalid ticket status transition';
  end if;

  if trim(coalesce(p_message, '')) = '' then
    raise exception 'A progress message is required';
  end if;

  update public.tickets
  set
    status = p_status,
    accepted_at = case when p_status = 'accepted' and accepted_at is null then now() else accepted_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = p_ticket_id
  returning * into updated_ticket;

  insert into public.ticket_updates (ticket_id, author_id, previous_status, new_status, message)
  values (p_ticket_id, auth.uid(), current_ticket.status, p_status, trim(p_message))
  returning id into created_update_id;

  if p_status in ('accepted', 'in_progress', 'blocked', 'completed') then
    update public.reports
    set status = 'in_progress'
    where id = current_ticket.report_id and status in ('assigned', 'under_review');
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
  values (
    auth.uid(),
    'ticket.status_updated',
    'ticket',
    p_ticket_id,
    jsonb_build_object('status', current_ticket.status),
    jsonb_build_object('status', p_status, 'message', trim(p_message))
  );

  return jsonb_build_object(
    'ticket_id', updated_ticket.id,
    'status', updated_ticket.status,
    'update_id', created_update_id
  );
end;
$$;

revoke all on function public.worker_update_ticket(uuid, public.ticket_status, text) from public;
grant execute on function public.worker_update_ticket(uuid, public.ticket_status, text) to authenticated;
