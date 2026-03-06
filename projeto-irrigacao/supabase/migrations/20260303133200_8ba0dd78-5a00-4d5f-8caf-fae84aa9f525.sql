
CREATE TABLE public.irrigation_payloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  sensor_id text,
  command text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.irrigation_payloads ENABLE ROW LEVEL SECURITY;

-- Allow edge function (service role) to insert
CREATE POLICY "Allow public inserts on irrigation_payloads"
  ON public.irrigation_payloads FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to read their own plant payloads
CREATE POLICY "Users can view their plant payloads"
  ON public.irrigation_payloads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.plants
    WHERE plants.id = irrigation_payloads.plant_id
      AND plants.user_id = auth.uid()
  ));

-- Allow public read for external consumers (ESP32, etc)
CREATE POLICY "Public can read all payloads"
  ON public.irrigation_payloads FOR SELECT
  USING (true);
