import React from 'react';
import { useGame } from '../../store/GameContext.js';
import charactersData from '../../data/characters.json' with { type: 'json' };

interface CharacterSpriteProps {
  characterId: string;
  isCelebrating?: boolean;
  scale?: number;
  className?: string;
}

export const CharacterSprite: React.FC<CharacterSpriteProps> = ({
  characterId,
  isCelebrating = false,
  scale = 1,
  className = '',
}) => {
  const { state } = useGame();

  // Find character from manifest
  const character =
    charactersData.find((c: any) => c.id === characterId) ||
    charactersData[0] || {
      id: 'hero',
      displayName: 'Hero',
      idle: { src: 'assets/char/hero/main.svg' },
      reward: { src: 'assets/char/hero/get_star.svg' },
      pixelArt: true,
      stage: { scale: 0.8, offsetY: 0 },
    };

  const hasReward = Boolean(character.reward?.src);
  const showReward = isCelebrating && hasReward;

  // Use base URL for path resolution
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
  const imageRelPath = showReward ? character.reward!.src : character.idle.src;
  const imageSrc = `${baseUrl}/${imageRelPath.replace(/^\//, '')}${
    showReward ? `?t=${Date.now()}` : ''
  }`;

  const isPixel = character.pixelArt !== false;

  // Equipped gear for this character
  const charGear = state.equippedGear[character.id] || {};

  // Custom user uploaded gear
  const customItems = state.customGearMeta.filter(
    item => !item.targetCharacterId || item.targetCharacterId === character.id
  );

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{
        transform: `scale(${scale * (character.stage?.scale || 0.8)}) translateY(${
          character.stage?.offsetY || 0
        }%)`,
      }}
    >
      {/* Back Layer Gear (e.g. wings, cape, backpack) */}
      {charGear.back && (
        <div className="absolute inset-0 pointer-events-none z-[1] flex items-center justify-center">
          <svg className="w-full h-full opacity-90" viewBox="0 0 240 240">
            {/* SVG back accessory visual */}
            <path d="M70 120 C50 80, 50 160, 80 180 Z" fill="#4338CA" opacity="0.8" />
            <path d="M170 120 C190 80, 190 160, 160 180 Z" fill="#4338CA" opacity="0.8" />
          </svg>
        </div>
      )}

      {/* Main Character Image / GIF / SVG */}
      <img
        src={imageSrc}
        alt={character.displayName}
        className={`max-w-full max-h-full object-contain pointer-events-none z-[2] transition-transform duration-300 ${
          isPixel ? 'pixelated' : ''
        } ${isCelebrating && !hasReward ? 'animate-celebrate-bounce' : ''}`}
        draggable={false}
      />

      {/* Front Layers Gear overlays */}
      {/* Body Gear (e.g. hoodie / armor trim) */}
      {charGear.body && (
        <div className="absolute inset-0 pointer-events-none z-[3] flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 240 240">
            <path d="M96 112 L144 112 L138 165 L102 165 Z" fill="#4C1D95" opacity="0.75" />
            <line x1="120" y1="114" x2="120" y2="160" stroke="#C4B5FD" strokeWidth="2" />
          </svg>
        </div>
      )}

      {/* Head Gear (e.g. headband) */}
      {charGear.head && (
        <div className="absolute inset-0 pointer-events-none z-[4] flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 240 240">
            <rect x="104" y="74" width="32" height="6" rx="2" fill="#DC2626" />
            <circle cx="120" cy="77" r="2.5" fill="#FBBF24" />
          </svg>
        </div>
      )}

      {/* Face Gear (e.g. glasses) */}
      {charGear.face && (
        <div className="absolute inset-0 pointer-events-none z-[5] flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 240 240">
            <rect x="110" y="80" width="8" height="6" rx="1.5" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
            <rect x="122" y="80" width="8" height="6" rx="1.5" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
            <line x1="118" y1="83" x2="122" y2="83" stroke="#38BDF8" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Handheld Gear (e.g. tome / tablet) */}
      {charGear.handheld && (
        <div className="absolute inset-0 pointer-events-none z-[6] flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 240 240">
            <rect x="62" y="130" width="18" height="24" rx="2" fill="#0284C7" />
            <line x1="65" y1="135" x2="77" y2="135" stroke="#FFFFFF" strokeWidth="1" />
            <line x1="65" y1="140" x2="75" y2="140" stroke="#BAE6FD" strokeWidth="1" />
          </svg>
        </div>
      )}

      {/* Custom Gear Layer */}
      {customItems.map(custom => {
        if (!custom.imageBlobUrl) return null;
        return (
          <img
            key={custom.id}
            src={custom.imageBlobUrl}
            alt={custom.name}
            className="absolute pointer-events-none z-[7]"
            style={{
              transform: `translate(${custom.offsetX}px, ${custom.offsetY}px) scale(${custom.scale}) ${
                custom.flipX ? 'scaleX(-1)' : ''
              }`,
            }}
          />
        );
      })}
    </div>
  );
};
