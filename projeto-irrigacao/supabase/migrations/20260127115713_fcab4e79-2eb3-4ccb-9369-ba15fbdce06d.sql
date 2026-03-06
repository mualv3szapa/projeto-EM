-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create plant types enum
CREATE TYPE public.plant_type AS ENUM ('succulent', 'fern', 'flower', 'cactus', 'tree', 'herb');

-- Create plants table
CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  plant_type plant_type NOT NULL DEFAULT 'succulent',
  humidity INTEGER NOT NULL DEFAULT 50 CHECK (humidity >= 0 AND humidity <= 100),
  last_watered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Plants policies
CREATE POLICY "Users can view their own plants" 
ON public.plants FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plants" 
ON public.plants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plants" 
ON public.plants FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plants" 
ON public.plants FOR DELETE 
USING (auth.uid() = user_id);