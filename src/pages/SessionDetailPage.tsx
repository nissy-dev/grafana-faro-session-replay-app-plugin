import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { PluginPage } from '@grafana/runtime';
import { Alert, Button, Spinner, useStyles2 } from '@grafana/ui';
import { useParams, useSearchParams } from 'react-router-dom';
import SessionReplayPlayer, { type SeekRequest } from '../components/SessionReplayPlayer/SessionReplayPlayer';
import SessionTimeline from '../components/SessionTimeline/SessionTimeline';
import { parseReplayEvents, parseSessionLogs } from '../data/faroFrames';
import { executeLokiQuery, fetchLokiFramesByTimeWindows } from '../data/lokiClient';
import { buildReplayQuery, buildSessionLogsQuery } from '../data/lokiQueries';
import {
  DEFAULT_MAX_LINES,
  DEFAULT_TIME_RANGE_HOURS,
  type AppPluginSettings,
  type ReplayParseResult,
  type SessionLog,
} from '../types';

const SessionDetailPage = ({ settings }: { settings: AppPluginSettings }) => {
  const styles = useStyles2(getStyles);
  const { sessionId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [replay, setReplay] = useState<ReplayParseResult>();
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [seekRequest, setSeekRequest] = useState<SeekRequest>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(Boolean(settings.lokiDatasourceUid));
  const [fallbackEnd] = useState(() => new Date().valueOf());

  const to = parseTime(searchParams.get('to')) ?? fallbackEnd;
  const from =
    parseTime(searchParams.get('from')) ??
    to - (settings.defaultTimeRangeHours ?? DEFAULT_TIME_RANGE_HOURS) * 60 * 60 * 1000;

  useEffect(() => {
    if (!settings.lokiDatasourceUid || !sessionId) {
      return;
    }

    const controller = new AbortController();
    const options = {
      datasourceUid: settings.lokiDatasourceUid,
      from,
      to,
      maxLines: settings.maxLines ?? DEFAULT_MAX_LINES,
      signal: controller.signal,
    };
    Promise.all([
      fetchLokiFramesByTimeWindows({ ...options, expr: buildReplayQuery(sessionId) }),
      executeLokiQuery({ ...options, expr: buildSessionLogsQuery(sessionId) }),
    ])
      .then(([replayFrames, logFrames]) => {
        setReplay(parseReplayEvents(replayFrames));
        setLogs(parseSessionLogs(logFrames));
      })
      .catch((queryError: unknown) => {
        if (!(queryError instanceof DOMException && queryError.name === 'AbortError')) {
          setError(queryError instanceof Error ? queryError.message : 'Unable to load the session');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [from, sessionId, settings.lokiDatasourceUid, settings.maxLines, to]);

  if (!settings.lokiDatasourceUid) {
    return (
      <PluginPage>
        <Alert title="Loki data source is not configured" severity="info">
          Configure the plugin before loading a replay.
        </Alert>
      </PluginPage>
    );
  }

  const replayStart = replay?.events[0]?.timestamp ?? 0;

  return (
    <PluginPage
      actions={
        <Button icon="copy" variant="secondary" onClick={() => navigator.clipboard.writeText(window.location.href)}>
          Copy link
        </Button>
      }
    >
      <div className={styles.heading}>
        <div>
          <h1>Session replay</h1>
          <div className={styles.sessionId}>{sessionId}</div>
        </div>
        {replay && (
          <div className={styles.metadata}>
            {replay.events.length} events · {logs.length} logs
          </div>
        )}
      </div>

      {error && <Alert title="Session query failed">{error}</Alert>}
      {loading && (
        <div className={styles.loading}>
          <Spinner /> Loading replay
        </div>
      )}
      {!loading && replay && !replay.hasFullSnapshot && (
        <Alert title="This recording has no full snapshot" severity="warning">
          The selected time range may start after the recording began.
        </Alert>
      )}
      {!loading && replay?.discardedLines ? (
        <Alert title="Some replay events were discarded" severity="warning">
          {replay.discardedLines} malformed event lines could not be decoded.
        </Alert>
      ) : null}
      {!loading && replay?.hasFullSnapshot && (
        <SessionReplayPlayer events={replay.events} seekRequest={seekRequest} onTimeChange={setCurrentOffset} />
      )}

      {!loading && replay && (
        <section className={styles.timeline}>
          <h2>Logs and exceptions</h2>
          <SessionTimeline
            logs={logs}
            replayStart={replayStart}
            currentOffset={currentOffset}
            tempoDatasourceUid={settings.tempoDatasourceUid}
            onSeek={(offset) => setSeekRequest({ id: Date.now(), offset })}
          />
        </section>
      )}
    </PluginPage>
  );
};

const parseTime = (value: string | null) => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getStyles = (theme: any) => ({
  heading: css({
    alignItems: 'flex-end',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  }),
  sessionId: css({ color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamilyMonospace }),
  metadata: css({ color: theme.colors.text.secondary }),
  loading: css({ color: theme.colors.text.secondary, padding: theme.spacing(5), textAlign: 'center' }),
  timeline: css({ marginTop: theme.spacing(4), h2: { fontSize: theme.typography.h4.fontSize } }),
});

export default SessionDetailPage;
