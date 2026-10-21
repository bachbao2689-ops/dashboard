import React from 'react';

interface LoginCarouselControlsProps {
  total: number;
  current: number;
  onSelect: (index: number) => void;
}

export const LoginCarouselControls: React.FC<LoginCarouselControlsProps> = ({
  total,
  current,
  onSelect,
}) => {
  return (
    <div
      className="login-carousel-controls"
      role="tablist"
      aria-label="Chọn concept màn hình chờ"
    >
      {Array.from({ length: total }).map((_, idx) => {
        const isActive = idx === current;
        return (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Concept ${idx + 1}`}
            title={`Concept ${idx + 1}`}
            onClick={() => onSelect(idx)}
            className={`login-carousel-dot ${isActive ? 'is-active' : 'is-inactive'}`}
          />
        );
      })}
    </div>
  );
};
