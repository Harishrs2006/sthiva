'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SthivaLogo } from '@sthiva/web-core';
import { CHAPTERS, resolveChapterLinks } from './chapters';
import { HeroPinCheck } from './HeroPinCheck';

// Full-screen hero that plays the construction story on its own: every photo slowly pushes in
// towards the work happening in it (transform-origin = the photo's focus point), then crossfades
// to the next. It is driven by a timer only, never by scroll or touch, and only animates
// transform and opacity so it stays on the GPU and never janks.

export const SLIDE_MS = 6500;
export const FADE_MS = 1400;

type Categories = { slug: string; name: string }[] | null;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

function Slide({ i, state, onLoaded, motion, paused }: { i: number; state: 'current' | 'previous' | 'preload'; onLoaded: (i: number) => void; motion: boolean; paused: boolean }) {
  const c = CHAPTERS[i];
  return (
    <div
      className={`absolute inset-0 ${state === 'current' ? 'z-[2] animate-[slide-in_var(--fade)_ease-out_both]' : state === 'previous' ? 'z-[1]' : 'z-0 opacity-0'}`}
      style={{ ['--fade' as string]: `${FADE_MS}ms` }}
      aria-hidden="true"
    >
      <div
        className={`absolute inset-0 will-change-transform ${motion && state !== 'preload' ? 'animate-[ken-burns_var(--dur)_linear_both]' : ''}`}
        style={{
          transformOrigin: c.focus ?? '50% 50%',
          ['--dur' as string]: `${SLIDE_MS + FADE_MS * 2}ms`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        <Image
          src={c.photo!}
          alt=""
          fill
          sizes="100vw"
          quality={78}
          priority={i === 0}
          loading={i === 0 ? undefined : 'eager'}
          className="object-cover"
          style={{ objectPosition: c.focus ?? '50% 50%' }}
          onLoad={() => onLoaded(i)}
        />
      </div>
    </div>
  );
}

export function HeroSlideshow({ categories }: { categories: Categories }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set());
  const [userPaused, setUserPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const section = useRef<HTMLElement>(null);

  const count = CHAPTERS.length;
  const next = (index + 1) % count;
  const playing = !reduced && !userPaused && onScreen && tabVisible;

  const markLoaded = useCallback((i: number) => {
    setLoaded((s) => (s.has(i) ? s : new Set(s).add(i)));
  }, []);

  // Pause while scrolled away or while the browser tab is hidden
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.intersectionRatio > 0.25), { threshold: [0, 0.25, 0.5] });
    io.observe(el);
    const onVis = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // The progress bar's CSS animation is the clock: when it finishes, move on, but only once the
  // next photo has loaded (no blank frames). Pausing the animation pauses the story exactly.
  const [timeUp, setTimeUp] = useState(false);
  useEffect(() => {
    if (!timeUp || !loaded.has(next)) return;
    setTimeUp(false);
    setPrevious(index);
    setIndex(next);
  }, [timeUp, loaded, next, index]);

  // Drop the outgoing photo once the crossfade has finished
  useEffect(() => {
    if (previous === null) return;
    const t = window.setTimeout(() => setPrevious(null), FADE_MS + 100);
    return () => window.clearTimeout(t);
  }, [previous]);

  const hero = CHAPTERS[0];
  const chapter = CHAPTERS[index];
  const links = resolveChapterLinks(chapter, categories);

  return (
    <section
      id="story"
      ref={section}
      aria-roledescription="carousel"
      aria-label="Sthiva: construction materials marketplace"
      className="on-ink relative isolate h-[100svh] min-h-[600px] overflow-hidden bg-ink text-sand"
    >
      {/* photos: previous (fading out under), current (fading in), next (preloading) */}
      <div className="absolute inset-0">
        {previous !== null && <Slide key={`p${previous}`} i={previous} state="previous" onLoaded={markLoaded} motion={!reduced} paused={!playing} />}
        <Slide key={`c${index}`} i={index} state="current" onLoaded={markLoaded} motion={!reduced} paused={!playing} />
        {!reduced && next !== index && <Slide key={`n${next}`} i={next} state="preload" onLoaded={markLoaded} motion={false} paused />}
      </div>

      {/* readability */}
      <div className="pointer-events-none absolute inset-0 z-[3] bg-ink/45" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(180deg,rgba(11,12,10,0.65)_0%,rgba(11,12,10,0)_28%,rgba(11,12,10,0)_50%,rgba(11,12,10,0.85)_100%)]" aria-hidden="true" />
      <div className="grain pointer-events-none absolute inset-0 z-[3]" aria-hidden="true" />

      {/* brand message: stays put while the photos change behind it */}
      <div className="relative z-[4] flex h-full flex-col items-center justify-center px-5 pb-56 pt-[var(--header-h)] text-center md:pb-40">
        <div className="animate-fade-up">
          <SthivaLogo onDark height={72} className="h-[48px] w-auto sm:h-[72px]" />
        </div>
        <h1 className="mt-6 max-w-5xl font-display text-[clamp(2.75rem,7.6vw,6.5rem)] font-bold leading-[0.92] tracking-tightest text-white text-balance">
          <span className="block animate-fade-up" style={{ animationDelay: '120ms' }}>{hero.title}</span>
          <span className="block animate-fade-up font-serif font-normal italic tracking-[-0.02em] text-lime" style={{ animationDelay: '240ms' }}>{hero.accent}</span>
        </h1>
        <p className="mt-6 max-w-xl animate-fade-up text-pretty text-[17px] leading-relaxed text-white/80 sm:text-[19px]" style={{ animationDelay: '380ms' }}>
          {hero.body}
        </p>
        <div className="mt-8 w-full animate-fade-up" style={{ animationDelay: '460ms' }}>
          <HeroPinCheck />
        </div>
        <div className="mt-5 flex animate-fade-up flex-wrap justify-center gap-3" style={{ animationDelay: '520ms' }}>
          <a href="#categories" className="btn-lime group h-12 px-6 text-[15px] sm:h-14 sm:px-7 sm:text-[16px]">
            Browse materials
            <span className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">arrow_forward</span>
          </a>
          <a href="#how-it-works" className="btn-ghost-dark h-12 px-6 text-[15px] backdrop-blur-md sm:h-14 sm:px-7 sm:text-[16px]">How it works</a>
        </div>
      </div>

      {/* what is on screen now, plus progress and the pause control */}
      <div className="absolute inset-x-0 bottom-[84px] z-[4] md:bottom-0">
        <div className="container-x flex items-end justify-between gap-4 pb-6">
          <div key={index} className="min-w-0 animate-fade-up" aria-live="off">
            {index > 0 && (
              <>
                <p className="eyebrow flex items-center gap-2 text-lime">
                  <span className="font-mono text-white/60">{String(index).padStart(2, '0')}</span>
                  <span className="h-px w-6 bg-lime/60" aria-hidden="true" />
                  {chapter.eyebrow}
                </p>
                <p className="mt-2 truncate font-display text-[clamp(1.25rem,3vw,1.75rem)] font-semibold tracking-tight text-white">
                  {chapter.title} <span className="font-serif font-normal italic">{chapter.accent}</span>
                </p>
                {links[0] && (
                  <Link href={`/category/${links[0].slug}`} className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
                    Shop {links[0].name}
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                  </Link>
                )}
              </>
            )}
          </div>
          {!reduced && (
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-pressed={userPaused}
            aria-label={userPaused ? 'Play the slideshow' : 'Pause the slideshow'}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{userPaused ? 'play_arrow' : 'pause'}</span>
          </button>
          )}
        </div>
        {!reduced && (
        <div className="container-x flex gap-1.5 pb-5" aria-hidden="true">
          {CHAPTERS.map((c, i) => (
            <span key={c.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
              <span
                key={i === index ? `run${index}` : 'idle'}
                className={`block h-full origin-left rounded-full bg-lime ${i < index ? 'scale-x-100' : i === index && !reduced ? 'animate-[progress_var(--dur)_linear_both]' : 'scale-x-0'}`}
                style={{ ['--dur' as string]: `${SLIDE_MS}ms`, animationPlayState: playing ? 'running' : 'paused' }}
                onAnimationEnd={i === index ? () => setTimeUp(true) : undefined}
              />
            </span>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
