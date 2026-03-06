-- Add sensor_id column to plants table for ESP32 identification
ALTER TABLE public.plants 
ADD COLUMN sensor_id text UNIQUE;

-- Create index for faster sensor lookups
CREATE INDEX idx_plants_sensor_id ON public.plants(sensor_id);

-- Create a table to store sensor readings history (optional, for analytics)
CREATE TABLE public.sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  soil_humidity integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on sensor_readings
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view readings for their own plants
CREATE POLICY "Users can view their plant readings"
ON public.sensor_readings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.plants 
    WHERE plants.id = sensor_readings.plant_id 
    AND plants.user_id = auth.uid()
  )
);

-- Policy: Allow anonymous inserts (ESP32 won't have auth token)
CREATE POLICY "Allow sensor data inserts"
ON public.sensor_readings
FOR INSERT
WITH CHECK (true);