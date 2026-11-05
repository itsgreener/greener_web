-- Greener — datos de desarrollo local (supabase db reset)
-- No se aplica en producción salvo que se ejecute explícitamente.

insert into admin_allowed_domain (domain)
values ('itsgreener.com')
on conflict (domain) do nothing;
