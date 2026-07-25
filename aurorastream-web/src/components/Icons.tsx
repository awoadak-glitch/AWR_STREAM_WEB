interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export function FlameIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 2c1 3-2 4-2 7a4 4 0 108 0c0-1-.5-2-1-2 1 4-1 5-2 5a2.5 2.5 0 01-2.5-2.5c0-2 1.5-3 1.5-5C13.5 3 12.5 2.2 12 2z" />
      <path d="M9 13a5 5 0 0010 0c0-2-1-3.5-2-4.5.5 3-1 5-3 5a2.5 2.5 0 01-2.5-2.5c-1 .5-2.5 1.5-2.5 2z" opacity=".7" />
    </svg>
  );
}

export function SparklesIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" />
      <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" opacity=".7" />
    </svg>
  );
}

export function FilmIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9h18M3 15h18M8 4v16M16 4v16" />
    </svg>
  );
}

export function TvIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <rect x="3" y="6" width="18" height="13" rx="1.5" />
      <path d="M8 21h8M8 2l4 4 4-4" />
    </svg>
  );
}

export function MasksIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <circle cx="8" cy="12" r="6" />
      <circle cx="16" cy="12" r="6" opacity=".6" />
    </svg>
  );
}

export function WandIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} style={style}>
      <path d="M4 20L18 6" />
      <path d="M17 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </svg>
  );
}

export const CATEGORY_ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  flame: FlameIcon,
  sparkles: SparklesIcon,
  film: FilmIcon,
  tv: TvIcon,
  masks: MasksIcon,
  wand: WandIcon,
};

export function PlayIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function StarIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
      <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
    </svg>
  );
}

export function CloseIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className} style={style}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function SearchIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} style={style}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function HomeIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z" />
    </svg>
  );
}

export function SettingsIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function DownloadIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 3v13m0 0l-4-4m4 4l4-4M4 20h16" />
    </svg>
  );
}

export function ExternalLinkIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

export function SkipNextIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M6 5v14l10-7zM17 5h2v14h-2z" />
    </svg>
  );
}

export function AlertIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}
