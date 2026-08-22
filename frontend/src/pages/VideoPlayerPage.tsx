import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { videosApi, type VideoSummary, type WatchSource } from '../api/videos.api';
import { API_BASE, ApiError } from '../api/client';
import { track } from '../analytics/ga';

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
  const [video, setVideo] = useState<VideoSummary | null>(null);
  const [source, setSource] = useState<WatchSource | null>(null);
  const [error, setError] = useState<string>();
  const [locked, setLocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

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
      if (err instanceof ApiError && err.status === 402) {
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
      <p className="text-sm text-ink-faint">
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
          rather than sitting letterboxed inside the page layout. */}
      <div
        ref={stageRef}
        className="video-stage mt-6 aspect-video w-full overflow-hidden rounded-2xl bg-plum-deep"
      >
        {playing && source ? (
          <PlayerSurface source={source} videoId={videoId} title={video.title} />
        ) : (
          <button
            type="button"
            onClick={play}
            className="group grid h-full w-full place-items-center"
            aria-label={`Play ${video.title}`}
          >
            <span className="grid h-20 w-20 place-items-center rounded-bubble bg-white/15 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
              <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true">
                <path d="M2 2.5 27 17 2 31.5Z" fill="#fff" />
              </svg>
            </span>
            <span className="mt-4 text-sm text-white/70">
              {playing ? 'Starting…' : 'Play — opens fullscreen'}
            </span>
          </button>
        )}
      </div>

      {locked ? (
        <div className="mt-5 rounded-2xl border border-paper-edge bg-white p-5">
          <p className="font-semibold">This lecture is part of the full course.</p>
          <p className="mt-1 text-sm text-ink-soft">
            One payment opens every lecture, note and mock test — no renewals.
          </p>
          <Link
            to="/unlock"
            className="mt-4 inline-block rounded-xl bg-gradient-to-b from-[#f8823c] to-marigold px-5 py-2.5 font-semibold text-white"
          >
            Unlock everything — ₹3,499
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

  const src =
    source.kind === 'link'
      ? source.url
      : `${API_BASE}/videos/${videoId}/stream?t=${source.token}`;

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
