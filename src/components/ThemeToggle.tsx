import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
  className?: string;
  variant?: 'pill' | 'button';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  className = '',
  variant = 'pill',
}) => {
  const isDark = theme === 'dark';

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors cursor-pointer select-none ${
          isDark
            ? 'bg-[#1F1F23] hover:bg-[#27272A] text-amber-400'
            : 'bg-[#F4F4F6] hover:bg-[#EAEBED] text-slate-700'
        } ${className}`}
        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle Theme"
        id="theme-toggle-btn"
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" strokeWidth={2.2} />
        ) : (
          <Moon className="w-3.5 h-3.5 text-slate-700 fill-slate-700/20" strokeWidth={2.2} />
        )}
      </button>
    );
  }

  // Dual-Segment Segmented Pill Toggle:
  // - Mode Terang (Putih): Container #F0F1F4, Segmen aktif Putih #FFFFFF murni.
  //   PERATURAN: TANPA GARIS HITAM (border: none, outline: none)
  // - Mode Gelap (Hitam): Container #121214, Segmen aktif Abu Gelap #27272A.
  //   PERATURAN: TANPA GARIS PUTIH (border: none, outline: none)
  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`inline-flex items-center p-0.5 rounded-full select-none cursor-pointer transition-colors duration-150 ${
        'bg-[var(--bg-section-alt)]'
      } ${className}`}
      style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      id="theme-toggle-pill"
    >
      {/* Light Option */}
      <span
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-all duration-150 ${
          !isDark
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm font-semibold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
        style={{ border: 'none', outline: 'none' }}
      >
        <Sun
          className={`w-3 h-3 ${!isDark ? 'text-amber-500 fill-amber-500/20' : 'text-[#71717A]'}`}
          strokeWidth={2.2}
        />
        <span className="hidden sm:inline">Terang</span>
      </span>

      {/* Dark Option */}
      <span
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-all duration-150 ${
          isDark
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm font-semibold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
        style={{ border: 'none', outline: 'none' }}
      >
        <Moon
          className={`w-3 h-3 ${isDark ? 'text-indigo-400 fill-indigo-400/20' : 'text-[#71717A]'}`}
          strokeWidth={2.2}
        />
        <span className="hidden sm:inline">Gelap</span>
      </span>
    </div>
  );
};
