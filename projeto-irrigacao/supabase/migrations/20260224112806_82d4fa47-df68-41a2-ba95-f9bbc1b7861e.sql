
-- Table for irrigation commands (site -> ESP32)
CREATE TABLE public.plant_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  command TEXT NOT NULL, -- 'irrigar_on' or 'irrigar_off'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'executed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.plant_commands ENABLE ROW LEVEL SECURITY;

-- Users can create commands for their own plants
CREATE POLICY "Users can create commands for their plants"
ON public.plant_commands FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM plants WHERE plants.id = plant_commands.plant_id AND plants.user_id = auth.uid()));

-- Users can view commands for their own plants
CREATE POLICY "Users can view their plant commands"
ON public.plant_commands FOR SELECT
USING (EXISTS (SELECT 1 FROM plants WHERE plants.id = plant_commands.plant_id AND plants.user_id = auth.uid()));

-- ESP32 can update command status (via service role in edge function)
CREATE POLICY "Allow service role command updates"
ON public.plant_commands FOR UPDATE
USING (true);

-- Add pump_active column to plants for real-time status
ALTER TABLE public.plants ADD COLUMN pump_active BOOLEAN NOT NULL DEFAULT false;
