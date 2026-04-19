-- Roll back Board feature schema objects

drop materialized view if exists public.board_rankings;

drop trigger if exists trg_xp_logs_updated_at on public.xp_logs;
drop trigger if exists trg_board_profiles_updated_at on public.board_profiles;

drop table if exists public.xp_logs;
drop table if exists public.board_profiles;

drop function if exists public.refresh_board_rankings();
drop function if exists public.touch_updated_at();
