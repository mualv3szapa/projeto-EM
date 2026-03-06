import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { calculateCurrentHumidity } from '@/lib/humidity';
import type { Database } from '@/integrations/supabase/types';

type Plant = Database['public']['Tables']['plants']['Row'];
type PlantWithCurrentHumidity = Plant & { currentHumidity: number; hasSensor: boolean };
type PlantType = Database['public']['Enums']['plant_type'];

export const usePlants = () => {
  const { user } = useAuth();
  const [rawPlants, setRawPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Update humidity calculations every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate current humidity for all plants based on time elapsed
  const plants: PlantWithCurrentHumidity[] = useMemo(() => {
    return rawPlants.map(plant => {
      const hasSensor = Boolean(plant.sensor_id);
      return {
        ...plant,
        hasSensor,
        currentHumidity: calculateCurrentHumidity(plant.humidity, plant.last_watered_at, hasSensor),
      };
    });
  }, [rawPlants, tick]);

  const fetchPlants = async () => {
    if (!user) {
      setRawPlants([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plants:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas plantas.",
        variant: "destructive",
      });
    } else {
      setRawPlants(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlants();
  }, [user]);

  const addPlant = async (name: string, plantType: PlantType, sensorId?: string) => {
    if (!user) return { error: new Error('Usuário não autenticado') };

    const { data, error } = await supabase
      .from('plants')
      .insert({
        user_id: user.id,
        name,
        plant_type: plantType,
        humidity: 80,
        sensor_id: sensorId || null,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a planta.",
        variant: "destructive",
      });
      return { error };
    }

    setRawPlants([data, ...rawPlants]);
    toast({
      title: "Planta adicionada! 🌱",
      description: `${name} foi adicionada ao seu jardim.`,
    });
    return { error: null, data };
  };

  const waterPlant = async (plantId: string) => {
    const { error } = await supabase
      .from('plants')
      .update({
        humidity: 100,
        last_watered_at: new Date().toISOString(),
      })
      .eq('id', plantId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível regar a planta.",
        variant: "destructive",
      });
      return { error };
    }

    setRawPlants(rawPlants.map(p => 
      p.id === plantId 
        ? { ...p, humidity: 100, last_watered_at: new Date().toISOString() }
        : p
    ));
    
    toast({
      title: "Planta regada! 💧",
      description: "Sua plantinha está feliz!",
    });
    return { error: null };
  };

  const deletePlant = async (plantId: string) => {
    const { error } = await supabase
      .from('plants')
      .delete()
      .eq('id', plantId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a planta.",
        variant: "destructive",
      });
      return { error };
    }

    setRawPlants(rawPlants.filter(p => p.id !== plantId));
    toast({
      title: "Planta removida",
      description: "A planta foi removida do seu jardim.",
    });
    return { error: null };
  };

  const toggleIrrigation = async (plantId: string, turnOn: boolean) => {
    const plant = rawPlants.find(p => p.id === plantId);
    const command = turnOn ? 'irrigar_on' : 'irrigar_off';

    // 1. Save command to plant_commands (for ESP32 polling fallback)
    const { error } = await supabase
      .from('plant_commands')
      .insert({
        plant_id: plantId,
        command,
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o comando.",
        variant: "destructive",
      });
      return { error };
    }

    // 2. Publish command via MQTT
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/mqtt-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant_id: plantId,
          sensor_id: plant?.sensor_id || null,
          command,
        }),
      });
    } catch (err) {
      console.error('Error publishing MQTT command:', err);
    }

    // 3. Send JSON payload to irrigation-payload endpoint
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/irrigation-payload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant_id: plantId,
          sensor_id: plant?.sensor_id || null,
          command,
          pump_active: turnOn,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Error sending irrigation payload:', err);
    }

    // Optimistically update pump status
    setRawPlants(rawPlants.map(p =>
      p.id === plantId ? { ...p, pump_active: turnOn } : p
    ));

    toast({
      title: turnOn ? "Irrigação ligada! 💧" : "Irrigação desligada",
      description: turnOn ? "O comando foi enviado via MQTT." : "O comando de parada foi enviado via MQTT.",
    });
    return { error: null };
  };

  return { plants, loading, addPlant, waterPlant, deletePlant, toggleIrrigation, refetch: fetchPlants };
};
