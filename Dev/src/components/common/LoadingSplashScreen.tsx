import React from 'react';
import '../../styles/loading-splash.css';

interface LoadingSplashScreenProps {
  message?: string;
  submessage?: string;
  inline?: boolean;
}

export const LoadingSplashScreen: React.FC<LoadingSplashScreenProps> = ({
  message = 'Đang tải dữ liệu...',
  submessage = 'K COFFEE DASHBOARD',
  inline = false,
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
        {/* Animated Brand Logo with Light Sweep */}
        <div className="k-splash-logo-wrap">
          <img
            src="/login-logo.svg"
            alt="K COFFEE"
            className="h-14 sm:h-16 w-auto object-contain select-none pointer-events-none"
            onError={e => {
              // Fallback to logo-dark.svg if login-logo isn't resolved
              const target = e.currentTarget as HTMLImageElement;
              if (!target.src.endsWith('logo-dark.svg')) {
                target.src = '/logo-dark.svg';
              }
            }}
          />
          <div className="k-splash-shimmer" aria-hidden="true" />
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
