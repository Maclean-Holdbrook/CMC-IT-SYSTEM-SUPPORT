create policy "workers upload their ticket evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ticket-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (
    select 1 from public.ticket_attachments
    where storage_path = name
  )
);

create policy "workers delete their unlinked ticket evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'ticket-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (
    select 1 from public.ticket_attachments
    where storage_path = name
  )
);
