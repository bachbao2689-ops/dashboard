import React from 'react';
import { PhucSinhLogoMotion } from './PhucSinhLogoMotion';
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
    <div className="relative w-full h-full grid place-items-center">
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

      {/* Pure Logo Presentation - Vector SVG Phuc Sinh Consumers */}
      <div className="w-full grid place-items-center px-4">
        <PhucSinhLogoMotion
          variant="full"
          size="hero"
          durationPreset="intro"
          showReplayButton={showReplay}
          replayOnHover
        />
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="relative w-full min-h-[360px] grid place-items-center p-6 overflow-hidden bg-[#002e6d] dark:bg-slate-900">
        {content}
      </div>
    );
  }

  return (
    <div
      className={`k-splash-container ${isExiting ? 'k-splash-exit' : ''} ${className} ${isIntro ? 'cursor-pointer' : ''}`}
      role="status"
      aria-live="polite"
      onClick={isIntro ? onSkip : undefined}
    >
      {content}
    </div>
  );
};

export default LoadingSplashScreen;
