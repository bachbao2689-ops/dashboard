import React from 'react';
import { KCoffeeSproutLogoAnimation } from './KCoffeeSproutLogoAnimation';
import '../../styles/loading-splash.css';

interface LoadingSplashScreenProps {
  message?: string;
  submessage?: string;
  inline?: boolean;
  showReplay?: boolean;
  isIntro?: boolean;
  isExiting?: boolean;
  onSkip?: () => void;
  className?: string;
}

export const LoadingSplashScreen: React.FC<LoadingSplashScreenProps> = ({
  inline = false,
  showReplay = false,
  isIntro = false,
  isExiting = false,
  onSkip,
  className = '',
}) => {
  const content = (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {isIntro && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="k-splash-skip-btn"
          title="Bỏ qua hoạt ảnh và vào ứng dụng ngay"
        >
          Bỏ qua &rarr;
        </button>
      )}

      {/* Pure Logo Presentation - No background circles, no card frame, no progress track */}
      <div className="w-full flex items-center justify-center px-4">
        <KCoffeeSproutLogoAnimation showReplayButton={showReplay} />
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="relative w-full min-h-[360px] flex flex-col items-center justify-center p-6 overflow-hidden bg-[#002e6d] dark:bg-slate-900">
        {content}
      </div>
    );
  }

  return (
    <div
      className={`k-splash-container ${isExiting ? 'k-splash-exit' : ''} ${className}`}
      role="status"
      aria-live="polite"
    >
      {content}
    </div>
  );
};

export default LoadingSplashScreen;
