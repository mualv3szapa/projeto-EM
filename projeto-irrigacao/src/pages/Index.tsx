import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlants } from '@/hooks/usePlants';
import { supabase } from '@/integrations/supabase/client';
import { PlantIllustration } from '@/components/PlantIllustration';
import { HumidityMeter } from '@/components/HumidityMeter';
import { Button } from '@/components/ui/button';
import { Plus, Droplets, LogOut, Trash2, Loader2, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Plant = Database['public']['Tables']['plants']['Row'] & { currentHumidity: number; hasSensor: boolean };

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { plants, loading: plantsLoading, waterPlant, deletePlant, toggleIrrigation, refetch } = usePlants();
  const navigate = useNavigate();
  const [wateringPlantId, setWateringPlantId] = useState<string | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  const displayHumidity = selectedPlant?.currentHumidity ?? 0;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Refetch plants every 30 seconds for sensor updates
  // Realtime subscription for live sensor updates
  useEffect(() => {
    const channel = supabase
      .channel('plants-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'plants' }, () => {
        refetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  useEffect(() => {
    if (plants.length > 0 && !selectedPlant) {
      setSelectedPlant(plants[0]);
    }
  }, [plants]);

  // Keep selectedPlant in sync with plants data
  useEffect(() => {
    if (selectedPlant) {
      const updated = plants.find(p => p.id === selectedPlant.id);
      if (updated) setSelectedPlant(updated);
    }
  }, [plants]);

  const handleWater = async (plantId: string) => {
    setWateringPlantId(plantId);
    await waterPlant(plantId);
    
    // Update selected plant locally
    if (selectedPlant?.id === plantId) {
      setSelectedPlant({ 
        ...selectedPlant, 
        humidity: 100, 
        currentHumidity: 100,
        last_watered_at: new Date().toISOString() 
      });
    }
    
    setTimeout(() => setWateringPlantId(null), 1000);
  };

  const handleDelete = async (plantId: string) => {
    await deletePlant(plantId);
    if (selectedPlant?.id === plantId) {
      setSelectedPlant(plants.find(p => p.id !== plantId) || null);
    }
  };

  if (authLoading || plantsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce-soft mb-4">🌱</div>
          <p className="text-muted-foreground">Carregando seu jardim...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gradient-nature">🌿 Plantinha Pet</h1>
          <button
            onClick={signOut}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 pb-24">
        {plants.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16">
            <div className="text-8xl mb-6 animate-sway">🌱</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Seu jardim está vazio!
            </h2>
            <p className="text-muted-foreground mb-8">
              Adicione sua primeira plantinha e comece a cuidar dela.
            </p>
            <Button
              onClick={() => navigate('/add-plant')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 rounded-2xl text-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Planta
            </Button>
          </div>
        ) : (
          <>
            {/* Selected plant display */}
            {selectedPlant && (
              <div className="plant-card mb-6 animate-grow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedPlant.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground capitalize">
                        {selectedPlant.plant_type === 'succulent' && 'Suculenta'}
                        {selectedPlant.plant_type === 'fern' && 'Samambaia'}
                        {selectedPlant.plant_type === 'flower' && 'Flor'}
                        {selectedPlant.plant_type === 'cactus' && 'Cacto'}
                        {selectedPlant.plant_type === 'tree' && 'Árvore'}
                        {selectedPlant.plant_type === 'herb' && 'Erva'}
                      </p>
                      {selectedPlant.hasSensor && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          📡 Sensor ao vivo
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedPlant.id)}
                    className="p-2 rounded-full hover:bg-destructive/10 transition-colors"
                    title="Remover planta"
                  >
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </button>
                </div>

                {/* Plant illustration */}
                <div className="w-56 h-56 mx-auto my-4">
                  <PlantIllustration
                    type={selectedPlant.plant_type}
                    humidity={displayHumidity}
                    isWatering={wateringPlantId === selectedPlant.id}
                  />
                </div>

                {/* Humidity meter */}
                <HumidityMeter humidity={displayHumidity} className="mb-6" />

                {/* Water / Irrigation button */}
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      setWateringPlantId(selectedPlant.id);
                      await toggleIrrigation(selectedPlant.id, true);
                    }}
                    disabled={selectedPlant.pump_active}
                    className={cn(
                      "flex-1 btn-water flex items-center justify-center gap-2",
                      selectedPlant.pump_active && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Droplets className="w-5 h-5" />
                    {selectedPlant.pump_active ? 'Bomba ligada...' : 'Regar Planta'}
                  </button>
                  <button
                    onClick={async () => {
                      await toggleIrrigation(selectedPlant.id, false);
                      setWateringPlantId(null);
                    }}
                    disabled={!selectedPlant.pump_active}
                    className={cn(
                      "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-200",
                      !selectedPlant.pump_active
                        ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        : "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]"
                    )}
                  >
                    <PowerOff className="w-4 h-4" />
                    Parar
                  </button>
                </div>

                {/* Last watered */}
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Última rega: {new Date(selectedPlant.last_watered_at).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}

            {/* Plant list */}
            {plants.length > 1 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Suas plantas</h3>
                <div className="grid grid-cols-3 gap-3">
                  {plants.map((plant) => (
                    <button
                      key={plant.id}
                      onClick={() => setSelectedPlant(plant)}
                      className={cn(
                        "p-3 rounded-2xl border-2 transition-all duration-200",
                        selectedPlant?.id === plant.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <div className="w-16 h-16 mx-auto">
                        <PlantIllustration type={plant.plant_type} humidity={plant.currentHumidity} />
                      </div>
                      <p className="text-xs font-medium text-center mt-2 truncate text-foreground">
                        {plant.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* FAB */}
      {plants.length > 0 && (
        <button
          onClick={() => navigate('/add-plant')}
          className="fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-plant flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}
