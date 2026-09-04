CREATE OR REPLACE FUNCTION public.get_talk_vote_counts()
RETURNS TABLE(talk_id uuid, votes integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_votes.talk_id, COUNT(*)::integer AS votes
  FROM public.user_votes
  GROUP BY user_votes.talk_id;
$$;

COMMENT ON FUNCTION public.get_talk_vote_counts() IS
  'Agrega votos por charla sin exponer user_id. SECURITY DEFINER para no aplicar RLS de user_votes (SELECT solo propios).';

REVOKE ALL ON FUNCTION public.get_talk_vote_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_talk_vote_counts() TO anon, authenticated;
