import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlants } from '@/hooks/usePlants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlantIllustration } from '@/components/PlantIllustration';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type PlantType = Database['public']['Enums']['plant_type'];

const plantTypes: { type: PlantType; label: string; emoji: string }[] = [
  { type: 'succulent', label: 'Suculenta', emoji: '🪴' },
  { type: 'fern', label: 'Samambaia', emoji: '🌿' },
  { type: 'flower', label: 'Flor', emoji: '🌸' },
  { type: 'cactus', label: 'Cacto', emoji: '🌵' },
  { type: 'tree', label: 'Árvore', emoji: '🌳' },
  { type: 'herb', label: 'Erva', emoji: '🌱' },
];

export default function AddPlant() {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<PlantType>('succulent');
  const [isLoading, setIsLoading] = useState(false);
  const { addPlant } = usePlants();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsLoading(true);
    const { error } = await addPlant(name.trim(), selectedType);
    setIsLoading(false);
    
    if (!error) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full bg-card hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Nova Plantinha</h1>
        </div>

        {/* Preview */}
        <div className="plant-card mb-8">
          <div className="w-48 h-48 mx-auto">
            <PlantIllustration type={selectedType} humidity={80} />
          </div>
          <p className="text-center text-muted-foreground mt-4">
            {name || 'Dê um nome para sua plantinha'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground font-medium text-lg">
              Nome da planta
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Ex: Fernanda 🌿"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-nature text-lg"
              maxLength={30}
            />
          </div>




          {/* Plant type selector */}
          <div className="space-y-3">
            <Label className="text-foreground font-medium text-lg">
              Tipo de planta
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {plantTypes.map(({ type, label, emoji }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-3",
                    selectedType === type
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className={cn(
                    "font-medium",
                    selectedType === type ? "text-primary" : "text-foreground"
                  )}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-2xl text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Plantar! 🌱'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
