import React from 'react';

// Propriétés pré-générées des flocons de neige (déterministes)
const snowflakeProperties = Array.from({ length: 50 }, (_, i) => {
  const drift = (i * 13.7 + Math.sin(i * 0.5) * 15) % 80 - 40; // Dérive plus variée de -40px à +40px
  return {
    delay: (i * 0.13 + Math.cos(i * 0.3) * 2) % 5, // Délai plus varié de 0-5 secondes
    duration: ((i * 0.17 + Math.sin(i * 0.7) * 3) % 8) + 6, // Durée plus variée de 6-14 secondes
    left: `${(i * 3.7 + Math.sin(i * 0.4) * 20) % 100}%`, // Position plus dispersée
    size: ((i * 1.3 + Math.cos(i * 0.6) * 4) % 16) + 8, // Taille plus variée
    drift
  };
});

// IDs d'animation uniques pré-calculés
const uniqueAnimationIds = Array.from(
  new Set(snowflakeProperties.map(prop => Math.abs(Math.floor(prop.drift))))
);

// Composant pour les flocons de neige
export const Snowflake: React.FC<{ delay: number; duration: number; left: string; size: number; drift: number }> = ({ delay, duration, left, size, drift }) => (
  <div
    className="absolute text-blue-300 opacity-90 pointer-events-none select-none"
    style={{
      left,
      top: '-100px',
      fontSize: `${size}px`,
      animation: `calendar-snowfall-${Math.abs(Math.floor(drift))} ${duration}s linear ${delay}s infinite`,
      zIndex: 0
    }}
  >
    ❄
  </div>
);

// Fonction pour générer les flocons de neige (maintenant déterministe)
export const generateSnowflakes = () => {
  const snowflakes = snowflakeProperties.map((props, i) => (
    <Snowflake
      key={i}
      delay={props.delay}
      duration={props.duration}
      left={props.left}
      size={props.size}
      drift={props.drift}
    />
  ));
  
  return { snowflakes, animations: uniqueAnimationIds };
};

// Générer les animations CSS dynamiquement pour le calendrier
export const generateCalendarSnowfallAnimations = (animations: number[]) => {
  return animations.map(drift => `
    @keyframes calendar-snowfall-${drift} {
      0% {
        transform: translateY(-100px) translateX(${Math.sin(drift * 0.1) * 10}px) rotate(0deg) scale(0.7);
        opacity: 1;
      }
      15% {
        transform: translateY(75px) translateX(${drift * 0.15 + Math.sin(0.15 * Math.PI * 3) * 12}px) rotate(54deg) scale(1);
        opacity: 1;
      }
      25% {
        transform: translateY(125px) translateX(${drift * 0.25 + Math.sin(0.25 * Math.PI * 4) * 15}px) rotate(90deg) scale(0.9);
        opacity: 1;
      }
      40% {
        transform: translateY(200px) translateX(${drift * 0.4 + Math.sin(0.4 * Math.PI * 5) * 18}px) rotate(144deg) scale(1.1);
        opacity: 1;
      }
      50% {
        transform: translateY(250px) translateX(${drift * 0.5 + Math.sin(0.5 * Math.PI * 6) * 20}px) rotate(180deg) scale(0.95);
        opacity: 1;
      }
      65% {
        transform: translateY(325px) translateX(${drift * 0.65 + Math.sin(0.65 * Math.PI * 7) * 16}px) rotate(234deg) scale(1.05);
        opacity: 1;
      }
      75% {
        transform: translateY(375px) translateX(${drift * 0.75 + Math.sin(0.75 * Math.PI * 8) * 17}px) rotate(270deg) scale(0.9);
        opacity: 1;
      }
      90% {
        transform: translateY(450px) translateX(${drift * 0.9 + Math.sin(0.9 * Math.PI * 9) * 14}px) rotate(324deg) scale(1);
        opacity: 1;
      }
      100% {
        transform: translateY(550px) translateX(${drift + Math.sin(Math.PI * 10) * 12}px) rotate(360deg) scale(0.8);
        opacity: 0;
      }
    }
  `).join('\n');
};