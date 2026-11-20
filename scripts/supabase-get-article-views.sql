-- ============================================================
-- 文章阅读数：只读批量查询 RPC（供列表页展示，不增加计数）
-- 背景：anon 角色对 public.article_views 无 SELECT 权限，
--       计数只能通过 increment_article_view 写入，因此列表页
--       复用同样的 SECURITY DEFINER 模式提供只读查询。
-- 在 Supabase Dashboard → SQL Editor 中执行一次即可。
-- ============================================================

create or replace function public.get_article_views(p_article_keys text[])
returns table (article_key text, view_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.article_key::text, v.view_count::bigint
  from public.article_views v
  where v.article_key = any(p_article_keys);
$$;

revoke all on function public.get_article_views(text[]) from public;
grant execute on function public.get_article_views(text[]) to anon, authenticated;

-- 防止超大数组滥用（每页最多 12 张卡片，64 足够冗余）
comment on function public.get_article_views(text[]) is
  'Read-only batch view counts for article lists; max 64 keys per call.';

-- 可选加固：限制单次查询的 key 数量（若想要硬限制，用下面这版替换函数体）
-- create or replace function public.get_article_views(p_article_keys text[])
-- returns table (article_key text, view_count bigint)
-- language plpgsql
-- stable
-- security definer
-- set search_path = public
-- as $$
-- begin
--   if p_article_keys is null or cardinality(p_article_keys) > 64 then
--     raise exception 'too many article keys (max 64)';
--   end if;
--   return query
--     select v.article_key::text, v.view_count::bigint
--     from public.article_views v
--     where v.article_key = any(p_article_keys);
-- end;
-- $$;