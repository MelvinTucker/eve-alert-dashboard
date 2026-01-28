-- Add check_type column to eve_character_check for easy querying

alter table public.eve_character_check
  add column if not exists check_type public.eve_check_type;

-- Backfill from details.check_type when present
update public.eve_character_check
set check_type = (details->>'check_type')::public.eve_check_type
where check_type is null and (details ? 'check_type');

-- Default any remaining nulls to 'pi' (should be rare)
update public.eve_character_check
set check_type = 'pi'
where check_type is null;

alter table public.eve_character_check
  alter column check_type set not null;

create index if not exists eve_character_check_type_checked_idx
  on public.eve_character_check(check_type, checked_at desc);
