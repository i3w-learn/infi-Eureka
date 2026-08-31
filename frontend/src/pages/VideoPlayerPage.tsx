import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { videosApi, type VideoSummary, type WatchSource } from '../api/videos.api';
import { API_BASE, ApiError } from '../api/client';
import { track } from '../analytics/ga';
import { BackButton, useGoBack } from '../components/BackButton';
import { formatPaise } from '../api/payments.api';
import { useActivePlan } from '../hooks/useActivePlan';

/**
 * One lecture, played on our page rather than sent off to YouTube.
 *
 * Nothing loads until the student presses play. That click does three things
 * at once: it is the user gesture browsers demand before granting fullscreen,
 * it starts the embed with autoplay, and it means a student browsing the
 * catalogue never quietly loads a video they did not ask for.
 */

/** '2h 40m' — matches how the catalogue states length. */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function VideoPlayerPage() {
  const { videoId = '' } = useParams();
  const { plan } = useActivePlan();
  const [video, setVideo] = useState<VideoSummary | null>(null);
  const [source, setSource] = useState<WatchSource | null>(null);
  const [error, setError] = useState<string>();
  const [locked, setLocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const goBack = useGoBack('/videos');

  useEffect(() => {
    let cancelled = false;
    videosApi
      .get(videoId)
      .then((v) => !cancelled && setVideo(v))
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load this lecture.');
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const play = useCallback(async () => {
    // Ask for fullscreen inside the click itself. Awaiting the network first
    // would spend the user gesture and the browser would refuse.
    const stage = stageRef.current;
    if (stage?.requestFullscreen) {
      try {
        await stage.requestFullscreen();
      } catch {
        // Fullscreen refused (iOS Safari on iPhone, or a browser policy) —
        // the lecture still plays inline, which is the part that matters.
      }
    }

    setPlaying(true);
    try {
      const watch = await videosApi.watch(videoId);
      setSource(watch);
      track.videoPlayed(videoId);
    } catch (err) {
      setPlaying(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      if (err instanceof ApiError && err.needsPayment) {
        setLocked(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not start this lecture.');
    }
  }, [videoId]);

  if (error) {
    return (
      <Shell>
        <p className="text-ink-soft">{error}</p>
        <Link to="/videos" className="mt-4 inline-block text-plum underline underline-offset-4">
          Back to all lectures
        </Link>
      </Shell>
    );
  }

  if (!video) {
    return (
      <Shell>
        <p className="text-ink-faint">Loading…</p>
      </Shell>
    );
  }

  const duration = formatDuration(video.durationSeconds);

  return (
    <Shell>
      <BackButton fallback="/videos" />

      <p className="mt-5 text-sm text-ink-faint">
        <Link to="/videos" className="underline underline-offset-4 hover:text-plum">
          One-shot videos
        </Link>
        <span aria-hidden="true"> / </span>
        {video.chapter}
      </p>

      <h1 className="mt-2 font-display text-[1.6rem] leading-tight font-extrabold tracking-tight sm:text-[2rem]">
        {video.title}
      </h1>
      <p className="mt-1 text-[0.95rem] text-ink-soft">
        {[video.educatorName, video.grade ? `Class ${video.grade}` : null, duration]
          .filter(Boolean)
          .join(' · ')}
      </p>

      {/* The stage is what goes fullscreen, so the iframe fills the screen
          rather than sitting letterboxed inside the page layout. Before play
          it is a poster: the thumbnail if there is one, otherwise the same
          plum-and-OMR-dots panel the login page uses. */}
      <div
        ref={stageRef}
        className="video-stage sticker-card relative mt-6 aspect-video max-h-[calc(100vh-13rem)] w-full overflow-hidden"
        data-tone="plum"
      >
        {playing && source ? (
          <>
            <PlayerSurface source={source} videoId={videoId} title={video.title} />
            {/* Once a lecture is playing it can be fullscreen, where the page
                — and its back button — is not on screen at all. This copy
                rides on the stage itself, so leaving is always one tap away. */}
            <button
              type="button"
              onClick={() => void goBack()}
              className="video-exit absolute top-3 left-3 z-10"
            >
              <span aria-hidden="true">←</span>
              Back
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={play}
            className="video-poster group relative grid h-full w-full place-items-center"
            style={video.thumbnailUrl ? { backgroundImage: `url(${video.thumbnailUrl})` } : undefined}
            aria-label={`Play ${video.title}`}
          >
            {/* Backdrop: gradient + dot grid, or a dimming scrim over the thumbnail. */}
            <span
              aria-hidden="true"
              className="video-poster-backdrop"
              data-thumb={Boolean(video.thumbnailUrl)}
            />

            {/* Class badge, top-left, like the cards in the catalogue. */}
            {video.grade ? (
              <span className="sticker-pill absolute top-4 left-4 px-3 py-1 text-[0.72rem] font-bold">
                Class {video.grade}
              </span>
            ) : null}
            {duration ? (
              <span className="sticker-pill absolute right-4 bottom-4 hidden px-3 py-1 text-[0.72rem] font-bold tabular-nums sm:inline-flex">
                {duration}
              </span>
            ) : null}

            <span className="relative flex flex-col items-center gap-4">
              <span className="video-play-btn">
                <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true">
                  <path d="M3 2.5 28 17 3 31.5Z" fill="currentColor" />
                </svg>
              </span>
              <span className="sticker-pill px-3.5 py-1.5 text-[0.8rem] font-semibold">
                {playing ? 'Starting…' : 'Play · opens fullscreen'}
              </span>
            </span>
          </button>
        )}
      </div>

      {locked ? (
        <div className="sticker-card mt-6 p-5 sm:p-6">
          <p className="font-display text-[1.1rem] font-bold">This lecture is part of the full course.</p>
          <p className="mt-1 text-sm text-ink-soft">
            One payment opens every lecture, note and mock test — no renewals.
          </p>
          <Link to="/unlock" className="sticker-btn mt-5">
            Unlock everything{plan ? ` — ${formatPaise(plan.pricePaise)}` : ''}
          </Link>
        </div>
      ) : null}
    </Shell>
  );
}

/** Whichever surface this lecture plays through. */
function PlayerSurface({ source, videoId, title }: { source: WatchSource; videoId: string; title: string }) {
  if (source.kind === 'youtube') {
    return (
      <iframe
        // autoplay so the click that entered fullscreen also starts playback
        src={`${source.embedUrl}&autoplay=1`}
        title={title}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }

  const src = source.kind === 'link' ? source.url : `${API_BASE}/videos/${videoId}/stream?t=${source.token}`;

  return <video src={src} className="h-full w-full" controls autoPlay playsInline />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full px-5 pt-6 pb-16 sm:px-8 lg:px-10">
      {/* A lecture is watched, not read, so the stage takes the width it is
          given. The cap only stops the video going silly on an ultrawide. */}
      <div className="mx-auto w-full max-w-[92rem]">{children}</div>
    </div>
  );
}
