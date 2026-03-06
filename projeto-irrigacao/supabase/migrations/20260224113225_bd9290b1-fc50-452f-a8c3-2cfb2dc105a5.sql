
-- Fix: restrict UPDATE on plant_commands to only allow changing status from pending to executed
DROP POLICY "Allow service role command updates" ON public.plant_commands;

-- Only the edge function (service role) will update commands, so we don't need a public policy
-- The service role bypasses RLS entirely
