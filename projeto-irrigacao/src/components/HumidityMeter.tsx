import { Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

interface HumidityMeterProps {
  humidity: number;
  className?: string;
}

export const HumidityMeter = ({ humidity, className }: HumidityMeterProps) => {
  const getHumidityColor = () => {
    if (humidity >= 70) return "from-sky to-primary";
    if (humidity >= 40) return "from-primary to-moss";
    return "from-terracotta to-accent";
  };

  const getHumidityLabel = () => {
    if (humidity >= 70) return "Bem hidratada!";
    if (humidity >= 40) return "Nível bom";
    if (humidity >= 20) return "Precisa de água";
    return "Muito seca!";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-sky" />
          <span className="font-medium text-foreground">Umidade</span>
        </div>
        <span className={cn(
          "text-sm font-semibold px-3 py-1 rounded-full",
          humidity >= 40 ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
        )}>
          {getHumidityLabel()}
        </span>
      </div>
      
      <div className="humidity-bar">
        <div 
          className={cn("humidity-fill bg-gradient-to-r", getHumidityColor())}
          style={{ width: `${humidity}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span className="font-bold text-lg text-foreground">{humidity}%</span>
        <span>100%</span>
      </div>
    </div>
  );
};
