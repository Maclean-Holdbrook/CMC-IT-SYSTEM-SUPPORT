insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'report-attachments',
    'report-attachments',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'ticket-attachments',
    'ticket-attachments',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admins read report files"
on storage.objects for select to authenticated
using (bucket_id = 'report-attachments' and public.is_admin());

create policy "workers read report files for assigned tickets"
on storage.objects for select to authenticated
using (
  bucket_id = 'report-attachments'
  and exists (
    select 1
    from public.report_attachments attachment
    join public.tickets ticket on ticket.report_id = attachment.report_id
    where attachment.storage_path = name
      and ticket.assigned_worker_id = auth.uid()
  )
);

create policy "admins read ticket files"
on storage.objects for select to authenticated
using (bucket_id = 'ticket-attachments' and public.is_admin());

create policy "workers read their assigned ticket files"
on storage.objects for select to authenticated
using (
  bucket_id = 'ticket-attachments'
  and exists (
    select 1
    from public.ticket_attachments attachment
    join public.ticket_updates update_record on update_record.id = attachment.ticket_update_id
    join public.tickets ticket on ticket.id = update_record.ticket_id
    where attachment.storage_path = name
      and ticket.assigned_worker_id = auth.uid()
  )
);
