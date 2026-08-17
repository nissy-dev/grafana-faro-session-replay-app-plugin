import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { Replayer, ReplayerEvents } from '@grafana/rrweb';
import { EventType, type eventWithTime } from '@grafana/rrweb-types';
import { Button, Checkbox, useStyles2 } from '@grafana/ui';

export interface SeekRequest {
  id: number;
  offset: number;
}

interface SessionReplayPlayerProps {
  events: eventWithTime[];
  seekRequest?: SeekRequest;
  onTimeChange?: (offset: number) => void;
}

const SessionReplayPlayer = ({ events, seekRequest, onTimeChange }: SessionReplayPlayerProps) => {
  const styles = useStyles2(getStyles);
  const rootRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<Replayer>();
  const onTimeChangeRef = useRef(onTimeChange);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [skipInactive, setSkipInactive] = useState(true);

  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  useEffect(() => {
    if (!rootRef.current || events.length === 0) {
      return;
    }

    const replayer = new Replayer(events, {
      root: rootRef.current,
      skipInactive: true,
      speed: 1,
      maxSpeed: 4,
    });
    const metadata = replayer.getMetaData();
    const wrapper = rootRef.current.querySelector<HTMLElement>('.replayer-wrapper');
    const initialViewport = events.find((event) => event.type === EventType.Meta)?.data;
    let replayViewport = initialViewport ? { width: initialViewport.width, height: initialViewport.height } : undefined;
    replayerRef.current = replayer;
    setDuration(metadata.totalTime);
    setCurrentTime(0);

    const fitReplay = () => {
      if (!rootRef.current || !wrapper || !replayViewport) {
        return;
      }
      const scale = Math.min(
        rootRef.current.clientWidth / replayViewport.width,
        rootRef.current.clientHeight / replayViewport.height
      );
      wrapper.style.width = `${replayViewport.width}px`;
      wrapper.style.height = `${replayViewport.height}px`;
      wrapper.style.left = `${(rootRef.current.clientWidth - replayViewport.width * scale) / 2}px`;
      wrapper.style.top = `${(rootRef.current.clientHeight - replayViewport.height * scale) / 2}px`;
      wrapper.style.transform = `scale(${scale})`;
    };

    const onStart = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onFinish = () => setPlaying(false);
    const onResize = (viewport: unknown) => {
      if (!isReplayViewport(viewport)) {
        return;
      }
      replayViewport = viewport;
      fitReplay();
    };
    replayer.on(ReplayerEvents.Start, onStart);
    replayer.on(ReplayerEvents.Resume, onStart);
    replayer.on(ReplayerEvents.Pause, onPause);
    replayer.on(ReplayerEvents.Finish, onFinish);
    replayer.on(ReplayerEvents.Resize, onResize);

    const resizeObserver = new ResizeObserver(fitReplay);
    resizeObserver.observe(rootRef.current);
    fitReplay();

    const timer = window.setInterval(() => {
      const nextTime = Math.max(0, Math.min(metadata.totalTime, replayer.getCurrentTime()));
      setCurrentTime(nextTime);
      onTimeChangeRef.current?.(nextTime);
    }, 200);

    return () => {
      window.clearInterval(timer);
      resizeObserver.disconnect();
      replayer.destroy();
      replayerRef.current = undefined;
    };
  }, [events]);

  useEffect(() => {
    if (!seekRequest || !replayerRef.current) {
      return;
    }
    const offset = Math.max(0, Math.min(duration, seekRequest.offset));
    replayerRef.current.pause(offset);
    setCurrentTime(offset);
    onTimeChange?.(offset);
  }, [duration, onTimeChange, seekRequest]);

  const togglePlayback = () => {
    const replayer = replayerRef.current;
    if (!replayer) {
      return;
    }
    if (playing) {
      replayer.pause();
    } else {
      replayer.play(currentTime >= duration ? 0 : currentTime);
    }
  };

  const changeSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    replayerRef.current?.setConfig({ speed: nextSpeed });
  };

  const changeSkipInactive = (nextValue: boolean) => {
    setSkipInactive(nextValue);
    replayerRef.current?.setConfig({ skipInactive: nextValue });
  };

  return (
    <div className={styles.shell}>
      <div className={styles.viewport} ref={rootRef} />
      <div className={styles.controls}>
        <Button
          icon={playing ? 'pause' : 'play'}
          variant="secondary"
          onClick={togglePlayback}
          aria-label={playing ? 'Pause' : 'Play'}
        />
        <span className={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input
          className={styles.seek}
          type="range"
          aria-label="Replay position"
          min={0}
          max={Math.max(duration, 1)}
          value={currentTime}
          onChange={(event) => {
            const offset = Number(event.currentTarget.value);
            replayerRef.current?.pause(offset);
            setCurrentTime(offset);
          }}
        />
        <div className={styles.speeds} aria-label="Playback speed">
          {[1, 2, 4].map((value) => (
            <Button
              key={value}
              size="sm"
              variant={speed === value ? 'primary' : 'secondary'}
              onClick={() => changeSpeed(value)}
            >
              {value}x
            </Button>
          ))}
        </div>
        <Checkbox
          label="Skip inactive"
          value={skipInactive}
          onChange={(event) => changeSkipInactive(event.currentTarget.checked)}
        />
        <Button
          icon="expand-arrows"
          variant="secondary"
          aria-label="Fullscreen"
          onClick={() => rootRef.current?.requestFullscreen()}
        />
      </div>
    </div>
  );
};

const formatTime = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const isReplayViewport = (value: unknown): value is { width: number; height: number } => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const viewport = value as Record<string, unknown>;
  return typeof viewport.width === 'number' && typeof viewport.height === 'number';
};

const getStyles = (theme: any) => ({
  shell: css({ border: `1px solid ${theme.colors.border.weak}`, background: theme.colors.background.canvas }),
  viewport: css({
    aspectRatio: '16 / 9',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    '& .replayer-wrapper': { position: 'absolute', transformOrigin: 'top left' },
    '& .replayer-mouse-tail': { pointerEvents: 'none', position: 'absolute' },
    '& .replayer-mouse': {
      background: theme.colors.primary.main,
      border: `2px solid ${theme.colors.primary.contrastText}`,
      borderRadius: '50%',
      height: 16,
      pointerEvents: 'none',
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      width: 16,
      zIndex: 1,
    },
  }),
  controls: css({
    alignItems: 'center',
    background: theme.colors.background.primary,
    borderTop: `1px solid ${theme.colors.border.weak}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    minHeight: 52,
    padding: theme.spacing(1),
  }),
  time: css({ fontFamily: theme.typography.fontFamilyMonospace, minWidth: 88 }),
  seek: css({ flex: '1 1 220px' }),
  speeds: css({ display: 'flex', gap: theme.spacing(0.5) }),
});

export default SessionReplayPlayer;
