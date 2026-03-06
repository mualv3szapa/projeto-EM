
ALTER TABLE public.plants DROP CONSTRAINT IF EXISTS plants_sensor_id_key;
UPDATE public.plants SET sensor_id = 'esp32-main' WHERE sensor_id IS NULL;
ALTER TABLE public.plants ALTER COLUMN sensor_id SET DEFAULT 'esp32-main';
ALTER PUBLICATION supabase_realtime ADD TABLE public.plants;
