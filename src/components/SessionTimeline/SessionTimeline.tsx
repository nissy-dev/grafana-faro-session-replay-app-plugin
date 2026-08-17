import React from 'react';
import { css } from '@emotion/css';
import { Button, useStyles2 } from '@grafana/ui';
import type { SessionLog } from '../../types';

interface SessionTimelineProps {
  logs: SessionLog[];
  replayStart: number;
  currentOffset: number;
  tempoDatasourceUid?: string;
  onSeek: (offset: number) => void;
}

const SessionTimeline = ({ logs, replayStart, currentOffset, tempoDatasourceUid, onSeek }: SessionTimelineProps) => {
  const styles = useStyles2(getStyles);
  const currentTimestamp = replayStart + currentOffset;

  if (logs.length === 0) {
    return <div className={styles.empty}>No correlated logs or exceptions found.</div>;
  }

  return (
    <div className={styles.list}>
      {logs.map((log, index) => {
        const offset = Math.max(0, log.timestamp - replayStart);
        const isCurrent = Math.abs(log.timestamp - currentTimestamp) < 500;
        return (
          <div className={isCurrent ? styles.currentRow : styles.row} key={`${log.timestamp}:${index}`}>
            <Button variant="secondary" size="sm" onClick={() => onSeek(offset)}>
              {formatOffset(offset)}
            </Button>
            <span className={styles.kind}>{log.kind}</span>
            <span className={styles.message}>{log.message || '(no message)'}</span>
            {tempoDatasourceUid && log.traceId && (
              <a href={buildTraceUrl(tempoDatasourceUid, log.traceId, log.timestamp)} target="_blank" rel="noreferrer">
                View trace
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
};

const buildTraceUrl = (datasourceUid: string, traceId: string, timestamp: number) => {
  const panes = {
    trace: {
      datasource: datasourceUid,
      queries: [{ refId: 'A', query: traceId, queryType: 'traceId' }],
      range: { from: timestamp - 15 * 60_000, to: timestamp + 15 * 60_000 },
    },
  };
  return `/explore?schemaVersion=1&panes=${encodeURIComponent(JSON.stringify(panes))}`;
};

const formatOffset = (milliseconds: number) =>
  `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;

const getStyles = (theme: any) => ({
  empty: css({ color: theme.colors.text.secondary, padding: theme.spacing(3), textAlign: 'center' }),
  list: css({ borderTop: `1px solid ${theme.colors.border.weak}` }),
  row: css({
    alignItems: 'center',
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    display: 'grid',
    gap: theme.spacing(1),
    gridTemplateColumns: '70px 90px minmax(180px, 1fr) auto',
    minHeight: 48,
    padding: theme.spacing(1),
  }),
  currentRow: css({
    alignItems: 'center',
    background: theme.colors.action.selected,
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    display: 'grid',
    gap: theme.spacing(1),
    gridTemplateColumns: '70px 90px minmax(180px, 1fr) auto',
    minHeight: 48,
    padding: theme.spacing(1),
  }),
  kind: css({ color: theme.colors.text.secondary, textTransform: 'capitalize' }),
  message: css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
});

export default SessionTimeline;
