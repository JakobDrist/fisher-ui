'use client';

import { AnimatePresence, motion as Motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

export type SpotifyData = {
  isPlaying: boolean;
  title: string;
  artist: string;
  albumArt: string | null;
  songUrl: string | null;
};

const fallbackTrack: SpotifyData = {
  isPlaying: false,
  title: 'Smuk Som Et Stjerneskud',
  artist: 'Brødrene Olsen',
  albumArt:
    'https://i.scdn.co/image/ab67616d0000b273e621fdbe7e5b0c7bbd822c68',
  songUrl: 'https://open.spotify.com',
};

const DISC_SIZE = 260;
const DISC_SCALE_COLLAPSED = 100 / DISC_SIZE;
const CARD = {
  collapsed: { w: 270, h: 88, r: 22 },
  expanded: { w: 250, h: 284, r: 28 },
} as const;
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 46, mass: 0.9 };
const FADE = { duration: 0.2, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] };

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.438-5.305-1.764-8.786-.97-.333.075-.66-.135-.736-.468-.076-.333.136-.66.469-.736 3.812-.87 7.08-.495 9.716 1.115.293.18.383.563.204.856zm1.224-2.724c-.226.367-.707.487-1.074.26-2.69-1.653-6.785-2.13-9.957-1.166-.41.124-.843-.105-.968-.516-.124-.41.106-.843.517-.968 3.63-1.1 8.13-.566 11.22 1.332.368.226.488.708.262 1.075v-.017zm.105-2.836C14.492 8.71 8.822 8.522 5.526 9.52c-.506.153-1.04-.137-1.193-.642-.153-.505.137-1.04.642-1.193 3.778-1.147 10.026-.93 13.974 1.413.456.27.608.863.337 1.32-.27.455-.863.607-1.32.337l.016-.017z" />
    </svg>
  );
}

function SoundBars({ compact = false }: { compact?: boolean }) {
  const bars = compact
    ? [{ max: 8, delay: 0 }, { max: 12, delay: 0.15 }, { max: 7, delay: 0.08 }, { max: 11, delay: 0.22 }]
    : [{ max: 10, delay: 0 }, { max: 14, delay: 0.12 }, { max: 8, delay: 0.06 }, { max: 12, delay: 0.18 }];

  return (
    <span className={`flex items-end gap-[2.5px] ${compact ? 'h-3' : 'h-3.5'}`}>
      {bars.map((bar, index) => (
        <Motion.span
          key={index}
          className="inline-block w-[2.5px] rounded-full bg-[#1DB954]"
          animate={{ height: [3, bar.max, 3] }}
          transition={{ duration: 0.65 + index * 0.05, repeat: Infinity, delay: bar.delay, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

function CdDisc({ track, isOffline }: { track: SpotifyData; isOffline: boolean }) {
  return (
    <div className="relative size-full overflow-hidden rounded-full border border-black/10 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.12)] dark:border-white/10">
      {track.albumArt ? (
        <img
          src={track.albumArt}
          alt={track.title}
          className={`size-full rounded-full object-cover ${track.isPlaying ? 'animate-[spin_8s_linear_infinite]' : 'animate-[spin_18s_linear_infinite]'}`}
          style={{ filter: isOffline ? 'saturate(65%) brightness(0.9)' : undefined }}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-neutral-800">
          <SpotifyIcon className="size-1/3 text-[#1DB954]" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at center, transparent 28%, rgba(0,0,0,0.06) 29%, transparent 30%), radial-gradient(circle at center, transparent 42%, rgba(0,0,0,0.05) 43%, transparent 44%), radial-gradient(circle at center, transparent 56%, rgba(0,0,0,0.04) 57%, transparent 58%), radial-gradient(circle at center, transparent 70%, rgba(0,0,0,0.04) 71%, transparent 72%)' }} />
      <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),inset_0_0_12px_rgba(0,0,0,0.15)]" />
      <div className="pointer-events-none absolute inset-0 m-auto flex size-[22%] items-center justify-center rounded-full border-2 border-[#A8ACBA] bg-gradient-to-b from-[#E8EBF5] via-[#9EA2B4] to-[#6B6F82] shadow-md">
        <div className="size-[42%] rounded-full border-[1.5px] border-[#3a3a3a] bg-[#111111] shadow-inner" />
      </div>
    </div>
  );
}

export type MusicPlayerProps = {
  /** Supply track data directly, or opt in to polling your own Spotify endpoint. */
  track?: SpotifyData;
  endpoint?: string;
};

export default function MusicPlayer({ track: suppliedTrack, endpoint }: MusicPlayerProps = {}) {
  const [data, setData] = useState<SpotifyData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!endpoint || suppliedTrack) return;
    let cancelled = false;
    const controller = new AbortController();
    const loadSpotify = async () => {
      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) return;
        const next = await response.json();
        if (!cancelled && next?.isConfigured !== false && next?.title) setData(next);
      } catch {
        // The official component retains a graceful offline state when Spotify is unavailable.
      }
    };
    void loadSpotify();
    const interval = window.setInterval(loadSpotify, 10_000);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [endpoint, suppliedTrack]);

  useEffect(() => {
    if (!isExpanded) return;
    const close = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) setIsExpanded(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isExpanded]);

  const isOffline = !suppliedTrack && !data;
  const track = suppliedTrack ?? data ?? fallbackTrack;
  const status = track.isPlaying ? 'Now Playing' : isOffline ? 'Last Played' : 'Last Played';

  return (
    <div className="relative z-40 my-4 flex h-[88px] w-full select-none justify-center">
      <div className="absolute bottom-0 left-1/2 flex w-fit -translate-x-1/2 items-end justify-center">
        <Motion.div
          ref={cardRef}
          onClick={() => setIsExpanded((value) => !value)}
          initial={false}
          whileTap={{ scale: 0.985 }}
          transition={SPRING}
          animate={{ width: isExpanded ? CARD.expanded.w : CARD.collapsed.w, height: isExpanded ? CARD.expanded.h : CARD.collapsed.h, borderRadius: isExpanded ? CARD.expanded.r : CARD.collapsed.r }}
          style={{ transformOrigin: 'bottom center' }}
          className="group relative z-50 cursor-pointer overflow-hidden border border-neutral-200/90 bg-white text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-6px_rgba(0,0,0,0.1)] dark:border-[#38332F] dark:bg-[#1A1715] dark:text-white dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_-6px_rgba(0,0,0,0.4)]"
        >
          <Motion.div initial={false} style={{ width: DISC_SIZE, height: DISC_SIZE }} animate={isExpanded ? { scale: 1, x: -5, y: -130 } : { scale: DISC_SCALE_COLLAPSED, x: 118, y: -86 }} transition={SPRING} className="pointer-events-none absolute left-0 top-0 z-20">
            <CdDisc track={track} isOffline={isOffline} />
          </Motion.div>
          <Motion.div initial={false} animate={{ opacity: isExpanded ? 0 : 1 }} transition={{ duration: 0.18, delay: isExpanded ? 0 : 0.32, ease: FADE.ease }} className="pointer-events-none absolute inset-y-0 right-[68px] z-30 w-8 bg-gradient-to-r from-white to-transparent dark:from-[#1A1715]" />
          <AnimatePresence>
            {track.isPlaying && !isExpanded && <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="pointer-events-none absolute -right-4 top-1/2 size-28 -translate-y-1/2 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle, rgba(29,185,84,0.45) 0%, transparent 70%)' }} />}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              <Motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-y-0 left-0 z-10 flex w-[calc(100%-100px)] flex-col justify-center gap-1.5 pl-4 pr-2">
                <div className="flex items-center gap-1.5">
                  <SpotifyIcon className="size-3 shrink-0 text-[#1DB954]" />
                  <span className="text-[11px] font-medium tracking-wide text-neutral-400 dark:text-neutral-500">{status}</span>
                  {track.isPlaying && <SoundBars compact />}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-xs font-semibold leading-snug tracking-tight text-neutral-900 dark:text-white">{track.title}</span>
                  <span className="truncate text-[11px] font-medium leading-snug text-neutral-500 dark:text-neutral-400">{track.artist}</span>
                </div>
              </Motion.div>
            ) : (
              <Motion.div key="expanded" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }} className="absolute left-0 top-[152px] z-10 flex h-[calc(100%-152px)] w-full flex-col items-center px-5 pb-8 pt-1 text-center">
                {track.isPlaying && <div className="mb-4 flex items-center justify-center"><SoundBars /></div>}
                <div className="flex w-full flex-col items-center gap-1 text-center">
                  <span className="block w-full truncate text-sm font-semibold leading-snug tracking-tight text-neutral-900 dark:text-white">{track.title}</span>
                  <span className="block w-full truncate text-xs font-medium leading-snug text-neutral-500 dark:text-neutral-400">{track.artist}</span>
                </div>
                <div className="mt-auto flex w-full flex-col items-center pt-4">
                  <div className="mb-4 h-[2px] w-6 rounded-full bg-neutral-400/40 dark:bg-neutral-600/40" />
                  <a href={track.songUrl ?? 'https://open.spotify.com'} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="group/link flex cursor-pointer items-center gap-1.5 pb-0.5 text-xs font-bold text-[#1DB954] hover:text-[#1ed760]">
                    <span>Open Song</span><SpotifyIcon className="size-3.5 text-[#1DB954] transition-transform duration-150 group-hover/link:scale-110" />
                  </a>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </Motion.div>
      </div>
    </div>
  );
}
