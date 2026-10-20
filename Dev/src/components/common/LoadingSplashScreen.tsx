import React from 'react';
import { KCoffeeSproutLogoAnimation } from './KCoffeeSproutLogoAnimation';
import '../../styles/loading-splash.css';

interface LoadingSplashScreenProps {
  message?: string;
  submessage?: string;
  inline?: boolean;
  showReplay?: boolean;
}

export const LoadingSplashScreen: React.FC<LoadingSplashScreenProps> = ({
  message = 'Đang tải dữ liệu...',
  submessage = 'K COFFEE DASHBOARD',
  inline = false,
  showReplay = false,
}) => {
  const content = (
    <>
      {/* Background Ambient Glow & Pulsar Elements */}
      <div className="k-splash-glow" aria-hidden="true" />
      <div className="k-splash-ripple" aria-hidden="true" />
      <div className="k-splash-ripple" aria-hidden="true" />
      <div className="k-splash-orbit" aria-hidden="true" />

      {/* Floating Glassmorphic Brand Card */}
      <div className="k-splash-card">
        {/* Animated Sprout -> Chữ K -> Vòng Tròn -> Chữ Trượt Logo */}
        <div className="w-full flex items-center justify-center">
          <KCoffeeSproutLogoAnimation showReplayButton={showReplay} />
        </div>

        {/* Modern Fluid Progress Bar */}
        <div className="k-splash-progress-track" aria-hidden="true">
          <div className="k-splash-progress-bar" />
        </div>

        {/* Status Label with Pulsing Dots */}
        <div className="k-splash-label" role="status" aria-live="polite">
          <span>{message}</span>
          <span className="inline-flex items-center gap-1 ml-0.5">
            <span className="k-splash-dot" />
            <span className="k-splash-dot" />
            <span className="k-splash-dot" />
          </span>
        </div>

        {submessage && (
          <span className="text-[10.5px] font-medium tracking-widest uppercase text-white/50 dark:text-slate-400/60 mt-1">
            {submessage}
          </span>
        )}
      </div>
    </>
  );

  if (inline) {
    return (
      <div className="relative w-full min-h-[360px] flex flex-col items-center justify-center p-6 rounded-3xl overflow-hidden bg-[#002e6d] dark:bg-slate-900">
        {content}
      </div>
    );
  }

  return (
    <div className="k-splash-container" role="status" aria-live="polite">
      {content}
    </div>
  );
};

export default LoadingSplashScreen;
