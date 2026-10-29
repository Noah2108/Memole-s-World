-- Eseguire solo su Supabase LOCALE DI TEST, dopo la migrazione.
-- supabase test db  (pgTAP). Tutto viene annullato dal rollback finale.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000001','owner-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','owner-b@example.invalid');
insert into public.guardians(id,owner_id,name,relationship) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Tutore A','Genitore'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Tutore B','Genitore');
insert into public.children(id,owner_id,first_name,last_name) values
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Bimbo','A'),
 ('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Bimbo','B');
insert into public.child_guardians(owner_id,child_id,guardian_id) values
 ('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
insert into public.agreements(id,owner_id,child_id,kind,label,amount_cents,starts_on) values
 ('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','monthly','Retta A',10000,'2024-01-01');
insert into public.charges(id,owner_id,child_id,agreement_id,emission_key,label,due_date,period_start,period_end,amount_cents) values
 ('40000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','test:2024-01','Gennaio','2024-01-05','2024-01-01','2024-01-31',10000);
insert into public.payments(id,owner_id,charge_id,amount_cents,paid_on,method) values
 ('50000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',2500,'2024-01-05','cash');
insert into public.audit_events(owner_id,action,detail) values ('00000000-0000-4000-8000-000000000001','Test','Evento A');

set local role anon;
select throws_ok('select * from public.children','42501','permission denied for table children','Anonimo senza accesso');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.guardians),1,'A legge solo i propri tutori');
select is((select count(*)::integer from public.children),1,'A legge solo i propri bambini');
select is((select count(*)::integer from public.child_guardians),1,'A legge i propri collegamenti');
select is((select count(*)::integer from public.agreements),1,'A legge i propri accordi');
select is((select count(*)::integer from public.charges),1,'A legge le proprie scadenze');
select is((select count(*)::integer from public.payments),1,'A legge i propri pagamenti');
select is((select count(*)::integer from public.audit_events),1,'A legge il proprio storico');
select is_empty($$update public.children set first_name = 'Violazione' where id = '20000000-0000-4000-8000-000000000002' returning id$$,'A non modifica il bambino di B');
select throws_ok($$insert into public.guardians(owner_id,name,relationship) values ('00000000-0000-4000-8000-000000000002','Intruso','Genitore')$$,'42501','new row violates row-level security policy for table "guardians"','A non inserisce come B');
select throws_ok($$insert into public.child_guardians(owner_id,child_id,guardian_id) values ('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002')$$,'23503',null,'FK impedisce tutori di un altro account');
select throws_ok($$insert into public.payments(charge_id,amount_cents,paid_on,method) values ('40000000-0000-4000-8000-000000000001',7501,'2024-01-06','bank')$$,'P0001','Importo superiore al residuo','Eccedenza respinta');
select results_eq($$insert into public.payments(charge_id,amount_cents,paid_on,method) values ('40000000-0000-4000-8000-000000000001',7500,'2024-01-06','bank') returning amount_cents$$,array[7500],'Saldo consentito e realmente inserito');
select throws_ok($$update public.payments set amount_cents = 1 where id = '50000000-0000-4000-8000-000000000001'$$,'P0001','Solo lo storno motivato di un pagamento valido è consentito','Movimento immutabile');
select results_eq($$update public.payments set voided_at = now(), void_reason = 'Errore demo' where id = '50000000-0000-4000-8000-000000000001' returning void_reason$$,array['Errore demo'],'Storno consentito e conservato');
select throws_ok($$delete from public.charges where id = '40000000-0000-4000-8000-000000000001'$$,'42501','permission denied for table charges','Scadenze non cancellabili');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.children),1,'B vede solo il proprio bambino');
select is((select count(*)::integer from public.payments),0,'B non legge pagamenti di A');
select is((select count(*)::integer from public.audit_events),0,'B non legge storico di A');
select is((select first_name from public.children),'Bimbo','Il tentativo di A non ha alterato il bambino di B');
select * from finish();
rollback;
