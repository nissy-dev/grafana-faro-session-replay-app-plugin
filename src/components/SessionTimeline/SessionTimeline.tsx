import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/css';
import { Icon, useStyles2 } from '@grafana/ui';
import type { SessionEvent } from '../../types';
import { testIds } from '../testIds';

interface SessionTimelineProps {
  events: SessionEvent[];
  replayStart: number;
  currentOffset: number;
  tempoDatasourceUid?: string;
  onSeek: (offset: number) => void;
}

const SessionTimeline = ({ events, replayStart, currentOffset, tempoDatasourceUid, onSeek }: SessionTimelineProps) => {
  const styles = useStyles2(getStyles);
  const activeRowRef = useRef<HTMLLIElement>(null);
  const currentTimestamp = replayStart + currentOffset;
  const activeIndex = findActiveIndex(events, currentTimestamp);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  if (events.length === 0) {
    return <div className={styles.empty}>No logs, exceptions or events were recorded for this session.</div>;
  }

  return (
    <ul className={styles.list} data-testid={testIds.sessionTimeline.list}>
      {events.map((event, index) => {
        const offset = Math.max(0, event.timestamp - replayStart);
        const isActive = index === activeIndex;
        const traceUrl = tempoDatasourceUid && event.traceId ? buildTraceUrl(tempoDatasourceUid, event) : undefined;

        return (
          <li
            className={isActive ? styles.activeRow : index > activeIndex ? styles.upcomingRow : styles.row}
            key={`${event.timestamp}:${index}`}
            ref={isActive ? activeRowRef : undefined}
          >
            <button className={styles.offset} onClick={() => onSeek(offset)} title="Jump to this moment">
              {formatOffset(offset)}
            </button>
            <span className={styles.kind} data-kind={event.kind}>
              {event.kind}
            </span>
            <div className={styles.body}>
              {event.name && <div className={styles.name}>{event.name}</div>}
              <div className={styles.message} title={event.message}>
                {event.message || '(no message)'}
              </div>
            </div>
            {traceUrl && (
              <a className={styles.trace} href={traceUrl} target="_blank" rel="noreferrer" title="Open trace in Tempo">
                <Icon name="link" /> Trace
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** Index of the most recent event at the current replay position, or -1 while playback is before the first one. */
const findActiveIndex = (events: SessionEvent[], currentTimestamp: number): number => {
  let active = -1;
  for (let index = 0; index < events.length; index += 1) {
    if (events[index].timestamp > currentTimestamp) {
      break;
    }
    active = index;
  }
  return active;
};

const buildTraceUrl = (datasourceUid: string, { traceId, timestamp }: SessionEvent) => {
  const panes = {
    trace: {
      datasource: datasourceUid,
      // TraceQL accepts a bare trace ID; the older `traceId` query type is no longer resolved by Explore.
      queries: [{ refId: 'A', query: traceId, queryType: 'traceql' }],
      range: { from: timestamp - 15 * 60_000, to: timestamp + 15 * 60_000 },
    },
  };
  return `/explore?schemaVersion=1&panes=${encodeURIComponent(JSON.stringify(panes))}`;
};

const formatOffset = (milliseconds: number) =>
  `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;

const getStyles = (theme: any) => {
  const row = css({
    alignItems: 'baseline',
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    display: 'grid',
    gap: theme.spacing(1),
    gridTemplateColumns: 'auto auto minmax(0, 1fr) auto',
    padding: theme.spacing(1),
  });

  return {
    empty: css({ color: theme.colors.text.secondary, padding: theme.spacing(3), textAlign: 'center' }),
    list: css({ listStyle: 'none', margin: 0, padding: 0 }),
    row,
    activeRow: css(row, { background: theme.colors.action.selected }),
    upcomingRow: css(row, { color: theme.colors.text.secondary }),
    offset: css({
      background: 'none',
      border: 'none',
      color: theme.colors.text.link,
      cursor: 'pointer',
      fontFamily: theme.typography.fontFamilyMonospace,
      fontSize: theme.typography.bodySmall.fontSize,
      padding: 0,
    }),
    kind: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      textTransform: 'uppercase',
      '&[data-kind="exception"]': { color: theme.colors.error.text },
      '&[data-kind="event"]': { color: theme.colors.primary.text },
    }),
    body: css({ minWidth: 0 }),
    name: css({ fontWeight: theme.typography.fontWeightMedium, overflowWrap: 'anywhere' }),
    // Performance events carry dozens of attributes, so the feed shows a clamped preview and the full text on hover.
    message: css({
      display: '-webkit-box',
      fontSize: theme.typography.bodySmall.fontSize,
      overflow: 'hidden',
      overflowWrap: 'anywhere',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 2,
    }),
    trace: css({ color: theme.colors.text.link, fontSize: theme.typography.bodySmall.fontSize, whiteSpace: 'nowrap' }),
  };
};

export default SessionTimeline;
