-- AG-05 Premium teaser helper privilege hardening.
-- The low-level extractor operates only on server-supplied protected content and
-- is not part of the anonymous/public API. Only the bounded SECURITY DEFINER
-- teaser-document projection is callable by Reader roles.

revoke all on function public.ag05_first_editorial_paragraph_html(text) from public;
revoke all on function public.ag05_first_editorial_paragraph_html(text) from anon;
revoke all on function public.ag05_first_editorial_paragraph_html(text) from authenticated;

grant execute on function public.ag05_public_story_teaser_document(text) to anon, authenticated;
