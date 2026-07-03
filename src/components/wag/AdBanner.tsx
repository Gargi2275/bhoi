import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import api from "@/lib/api";

function resolveImageUrl(raw: string): string {
  if (!raw) return "";
  return raw.startsWith("http")
    ? raw
    : `${raw.startsWith("/") ? "" : "/"}${raw}`;
}

export function AdBanner({ slot }: { slot: string }) {
  const [ads, setAds] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.getAdvertisements()
      .then(res => {
        if (res && res.length > 0) {
          const active = res.filter(
            (a: any) => a.slot === slot && a.status === "Active" && (a.image || a.image_url)
          );
          setAds(active);
        }
      })
      .catch(err => console.error("Failed to load ad banner", err));
  }, [slot]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrent(c => (c + 1) % ads.length);
  }, [ads.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrent(c => (c - 1 + ads.length) % ads.length);
  }, [ads.length]);

  // Auto-play every 4 seconds
  useEffect(() => {
    if (ads.length <= 1 || paused) return;
    timerRef.current = setInterval(goNext, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ads.length, paused, goNext]);

  if (ads.length === 0) return null;

  const ad = ads[current];
  const imageUrl = resolveImageUrl(ad.image || ad.image_url);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 1.04,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] as const },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
      scale: 0.96,
      transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as const },
    }),
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl mb-6 shadow-lg border border-warm/40 group"
      style={{ height: "clamp(120px, 18vw, 180px)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.a
          key={ad.id ?? current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          href={ad.destination_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 block cursor-pointer"
          style={{ willChange: "transform" }}
        >
          {/* Background image */}
          <img
            src={imageUrl}
            alt={ad.advertiser}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* "Ad" badge */}
          <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] uppercase bg-black/50 text-white/80 rounded-full backdrop-blur-sm border border-white/10">
            Sponsored
          </span>

          {/* Text content */}
          <div className="absolute bottom-4 left-5 text-white max-w-[65%]">
            <div className="text-[9px] uppercase font-bold tracking-[0.18em] text-gold/90 mb-0.5">
              {ad.slot}
            </div>
            <div className="font-ui font-bold text-base sm:text-lg leading-tight drop-shadow-md">
              {ad.advertiser}
            </div>
            {ad.destination_url && (
              <div className="flex items-center gap-1 mt-1.5 text-white/70 text-[10px] font-medium">
                <ExternalLink className="w-2.5 h-2.5" />
                Visit site
              </div>
            )}
          </div>
        </motion.a>
      </AnimatePresence>

      {/* Navigation arrows — only show if multiple ads */}
      {ads.length > 1 && (
        <>
          <button
            onClick={e => { e.preventDefault(); goPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-sm flex items-center justify-center text-white border border-white/15 transition-all opacity-0 group-hover:opacity-100 shadow-lg hover:scale-110 active:scale-95"
            aria-label="Previous ad"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={e => { e.preventDefault(); goNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-sm flex items-center justify-center text-white border border-white/15 transition-all opacity-0 group-hover:opacity-100 shadow-lg hover:scale-110 active:scale-95"
            aria-label="Next ad"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5">
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={e => {
                  e.preventDefault();
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className="rounded-full transition-all duration-300 border border-white/30"
                style={{
                  width: i === current ? 20 : 6,
                  height: 6,
                  background: i === current
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.35)",
                }}
                aria-label={`Go to ad ${i + 1}`}
              />
            ))}
          </div>

          {/* Progress bar */}
          {!paused && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-20">
              <motion.div
                key={current}
                className="h-full bg-gradient-to-r from-gold to-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 4, ease: "linear" }}
              />
            </div>
          )}

          {/* Slide counter */}
          <div className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white/80 text-[9px] font-bold border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
            {current + 1} / {ads.length}
          </div>
        </>
      )}
    </div>
  );
}
