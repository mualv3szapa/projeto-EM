import { cn } from "@/lib/utils";

type PlantType = 'succulent' | 'fern' | 'flower' | 'cactus' | 'tree' | 'herb';

interface PlantIllustrationProps {
  type: PlantType;
  humidity: number;
  className?: string;
  isWatering?: boolean;
}

export const PlantIllustration = ({ type, humidity, className, isWatering }: PlantIllustrationProps) => {
  const isDry = humidity < 30;
  const isHealthy = humidity >= 50;
  
  const plantColor = isDry ? "hsl(45, 50%, 60%)" : isHealthy ? "hsl(140, 45%, 40%)" : "hsl(100, 35%, 50%)";
  const potColor = "hsl(20, 50%, 45%)";
  
  const renderPlant = () => {
    switch (type) {
      case 'succulent':
        return (
          <g className={cn("transition-all duration-500", !isDry && "animate-sway")}>
            {/* Succulent leaves */}
            <ellipse cx="100" cy="85" rx="25" ry="15" fill={plantColor} transform="rotate(-30 100 85)" />
            <ellipse cx="100" cy="85" rx="25" ry="15" fill={plantColor} transform="rotate(30 100 85)" />
            <ellipse cx="100" cy="80" rx="22" ry="13" fill={plantColor} transform="rotate(-15 100 80)" />
            <ellipse cx="100" cy="80" rx="22" ry="13" fill={plantColor} transform="rotate(15 100 80)" />
            <ellipse cx="100" cy="75" rx="18" ry="10" fill={plantColor} />
            <circle cx="100" cy="70" r="8" fill={plantColor} />
          </g>
        );
      case 'fern':
        return (
          <g className={cn("transition-all duration-500", !isDry && "animate-sway")}>
            {/* Fern fronds */}
            {[-35, -20, 0, 20, 35].map((angle, i) => (
              <g key={i} transform={`rotate(${angle} 100 100)`}>
                <path
                  d={`M100,100 Q${95 + i * 2},60 100,30`}
                  stroke={plantColor}
                  strokeWidth="3"
                  fill="none"
                />
                {[70, 55, 40].map((y, j) => (
                  <ellipse key={j} cx="100" cy={y} rx="12" ry="4" fill={plantColor} transform={`rotate(${j % 2 ? 25 : -25} 100 ${y})`} />
                ))}
              </g>
            ))}
          </g>
        );
      case 'flower':
        return (
          <g className={cn("transition-all duration-500", !isDry && "animate-sway")}>
            {/* Stem */}
            <path d="M100,100 Q95,70 100,45" stroke={plantColor} strokeWidth="4" fill="none" />
            {/* Leaves */}
            <ellipse cx="92" cy="75" rx="15" ry="6" fill={plantColor} transform="rotate(-30 92 75)" />
            <ellipse cx="108" cy="80" rx="15" ry="6" fill={plantColor} transform="rotate(30 108 80)" />
            {/* Flower petals */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <ellipse
                key={i}
                cx="100"
                cy="35"
                rx="12"
                ry="8"
                fill={isDry ? "hsl(45, 40%, 70%)" : "hsl(340, 70%, 65%)"}
                transform={`rotate(${angle} 100 45)`}
              />
            ))}
            <circle cx="100" cy="45" r="8" fill={isDry ? "hsl(45, 50%, 60%)" : "hsl(45, 80%, 60%)"} />
          </g>
        );
      case 'cactus':
        return (
          <g className={cn("transition-all duration-500", !isDry && "animate-sway origin-bottom")}>
            {/* Main body */}
            <path
              d="M85,100 Q80,70 90,40 Q100,30 110,40 Q120,70 115,100 Z"
              fill={plantColor}
            />
            {/* Arms */}
            <path
              d="M85,70 Q70,65 70,55 Q70,45 78,50 Q80,60 85,65"
              fill={plantColor}
            />
            <path
              d="M115,75 Q130,70 130,60 Q130,50 122,55 Q120,65 115,70"
              fill={plantColor}
            />
            {/* Spines */}
            {[[90, 50], [100, 45], [110, 55], [95, 65], [105, 70], [100, 85]].map(([x, y], i) => (
              <line key={i} x1={x} y1={y} x2={x + (i % 2 ? 5 : -5)} y2={y - 5} stroke="hsl(45, 30%, 85%)" strokeWidth="1" />
            ))}
          </g>
        );
      case 'tree':
        return (
          <g className={cn("transition-all duration-500", !isDry && "animate-sway origin-bottom")}>
            {/* Trunk */}
            <rect x="93" y="70" width="14" height="35" fill="hsl(30, 40%, 35%)" rx="3" />
            {/* Foliage layers */}
            <ellipse cx="100" cy="55" rx="35" ry="25" fill={plantColor} />
            <ellipse cx="100" cy="45" rx="28" ry="20" fill={isDry ? "hsl(50, 45%, 55%)" : "hsl(135, 40%, 45%)"} />
            <ellipse cx="100" cy="38" rx="20" ry="15" fill={plantColor} />
          </g>
        );
      case 'herb':
        return (
          <g className={cn("transition-all duration-500", !isDry && "animate-sway")}>
            {/* Multiple stems with leaves */}
            {[-15, 0, 15].map((offset, i) => (
              <g key={i}>
                <path
                  d={`M${100 + offset},100 Q${98 + offset},70 ${100 + offset},45`}
                  stroke={plantColor}
                  strokeWidth="3"
                  fill="none"
                />
                <ellipse cx={100 + offset - 8} cy={65 - i * 5} rx="12" ry="5" fill={plantColor} transform={`rotate(-25 ${100 + offset - 8} ${65 - i * 5})`} />
                <ellipse cx={100 + offset + 8} cy={55 - i * 5} rx="12" ry="5" fill={plantColor} transform={`rotate(25 ${100 + offset + 8} ${55 - i * 5})`} />
              </g>
            ))}
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 200 180" className="w-full h-full">
        {/* Pot */}
        <path
          d="M60,110 L65,160 Q65,170 75,170 L125,170 Q135,170 135,160 L140,110 Z"
          fill={potColor}
        />
        <ellipse cx="100" cy="110" rx="42" ry="8" fill="hsl(20, 45%, 50%)" />
        <ellipse cx="100" cy="110" rx="36" ry="5" fill="hsl(30, 40%, 30%)" />
        
        {/* Plant */}
        {renderPlant()}
        
        {/* Water drops animation */}
        {isWatering && (
          <>
            <circle cx="90" cy="60" r="4" fill="hsl(200, 70%, 70%)" className="animate-water-drop" />
            <circle cx="100" cy="50" r="5" fill="hsl(200, 70%, 70%)" className="animate-water-drop" style={{ animationDelay: '0.1s' }} />
            <circle cx="110" cy="65" r="4" fill="hsl(200, 70%, 70%)" className="animate-water-drop" style={{ animationDelay: '0.2s' }} />
          </>
        )}
      </svg>
      
      {/* Dry indicator */}
      {isDry && (
        <div className="absolute top-2 right-2 text-2xl animate-bounce-soft">💧</div>
      )}
    </div>
  );
};
