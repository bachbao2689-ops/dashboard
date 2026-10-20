import React, { useState, useEffect } from 'react';
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
  message = 'Đang tải dữ liệu...',
  submessage = 'K COFFEE DASHBOARD',
  inline = false,
  showReplay = false,
  isIntro = false,
  isExiting = false,
  onSkip,
  className = '',
}) => {
  const [introStep, setIntroStep] = useState<number>(0);

  useEffect(() => {
    if (!isIntro) return;
    const t1 = setTimeout(() => setIntroStep(1), 1300);
    const t2 = setTimeout(() => setIntroStep(2), 2400);
    const t3 = setTimeout(() => setIntroStep(3), 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isIntro]);

  const activeMessage = isIntro
    ? [
        'Khởi tạo mầm xanh K-COFFEE...',
        'Khắc họa huy hiệu thương hiệu...',
        'Đặc sản nguyên chất · Đồng bộ...',
        'Sẵn sàng làm việc!',
      ][introStep]
    : message;

  const content = (
    <>
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

        {/* Modern Fluid Progress Bar (Intro Mode or standard Flow) */}
        <div
          className={`k-splash-progress-track ${isIntro ? 'intro-mode' : ''}`}
          aria-hidden="true"
        >
          <div
            className={
              isIntro
                ? 'k-splash-progress-bar-intro'
                : 'k-splash-progress-bar'
            }
          />
        </div>

        {/* Status Label with Pulsing Dots */}
        <div className="k-splash-label" role="status" aria-live="polite">
          <span>{activeMessage}</span>
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
