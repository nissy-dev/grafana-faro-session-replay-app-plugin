import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { PluginPage } from '@grafana/runtime';
import { Alert, Button, Field, Input, Spinner, useStyles2 } from '@grafana/ui';
import { useNavigate } from 'react-router-dom';
import { buildSessionsQuery } from '../data/lokiQueries';
import { executeLokiQuery } from '../data/lokiClient';
import { parseSessionSummaries } from '../data/faroFrames';
import { ROUTES } from '../constants';
import {
  DEFAULT_MAX_LINES,
  DEFAULT_TIME_RANGE_HOURS,
  type AppPluginSettings,
  type SessionFilters,
  type SessionSummary,
} from '../types';
import { prefixRoute } from '../utils/utils.routing';

interface SessionsPageProps {
  settings: AppPluginSettings;
}

const SessionsPage = ({ settings }: SessionsPageProps) => {
  const styles = useStyles2(getStyles);
  const navigate = useNavigate();
  const [filters, setFilters] = useState<SessionFilters>({});
  const [hours, setHours] = useState(settings.defaultTimeRangeHours ?? DEFAULT_TIME_RANGE_HOURS);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [queryEnd, setQueryEnd] = useState(() => new Date().valueOf());

  useEffect(() => {
    if (!settings.lokiDatasourceUid) {
      return;
    }

    const controller = new AbortController();
    const to = queryEnd;
    const from = to - hours * 60 * 60 * 1000;

    executeLokiQuery({
      datasourceUid: settings.lokiDatasourceUid,
      expr: buildSessionsQuery(filters),
      from,
      to,
      maxLines: settings.maxLines ?? DEFAULT_MAX_LINES,
      signal: controller.signal,
    })
      .then((frames) => setSessions(parseSessionSummaries(frames)))
      .catch((queryError: unknown) => {
        if (!(queryError instanceof DOMException && queryError.name === 'AbortError')) {
          setError(queryError instanceof Error ? queryError.message : 'Unable to query Loki');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters, hours, queryEnd, refreshKey, settings.lokiDatasourceUid, settings.maxLines]);

  if (!settings.lokiDatasourceUid) {
    return (
      <PluginPage>
        <Alert title="Loki data source is not configured" severity="info">
          Open the plugin configuration page and select the Loki data source containing Faro events.
        </Alert>
      </PluginPage>
    );
  }

  const openSession = (sessionId: string) => {
    const to = queryEnd;
    const from = to - hours * 60 * 60 * 1000;
    navigate(`${prefixRoute(ROUTES.Sessions)}/${encodeURIComponent(sessionId)}?from=${from}&to=${to}`);
  };

  return (
    <PluginPage
      actions={
        <Button
          icon="sync"
          variant="secondary"
          onClick={() => {
            setLoading(true);
            setError(undefined);
            setQueryEnd(new Date().valueOf());
            setRefreshKey((value) => value + 1);
          }}
        >
          Refresh
        </Button>
      }
    >
      <div className={styles.header}>
        <div>
          <h1>Faro Session Replay</h1>
          <p className={styles.secondary}>Sessions with a recording start marker in Loki.</p>
        </div>
      </div>

      <div className={styles.filters}>
        <Field label="Search">
          <Input
            id="sessions-filter-search"
            placeholder="Session or user"
            value={filters.search ?? ''}
            onChange={(event) => {
              setLoading(true);
              setFilters({ ...filters, search: event.currentTarget.value || undefined });
            }}
          />
        </Field>
        <Field label="Application">
          <Input
            id="sessions-filter-app"
            placeholder="app_name"
            value={filters.app ?? ''}
            onChange={(event) => {
              setLoading(true);
              setFilters({ ...filters, app: event.currentTarget.value || undefined });
            }}
          />
        </Field>
        <Field label="Environment">
          <Input
            id="sessions-filter-environment"
            placeholder="production"
            value={filters.environment ?? ''}
            onChange={(event) => {
              setLoading(true);
              setFilters({ ...filters, environment: event.currentTarget.value || undefined });
            }}
          />
        </Field>
        <Field label="Lookback hours">
          <Input
            id="sessions-filter-hours"
            type="number"
            min={1}
            value={hours}
            onChange={(event) => {
              setLoading(true);
              setHours(Number(event.currentTarget.value));
            }}
          />
        </Field>
      </div>

      {error && <Alert title="Loki query failed">{error}</Alert>}
      {loading ? (
        <div className={styles.status}>
          <Spinner /> Loading sessions
        </div>
      ) : sessions.length === 0 ? (
        <div className={styles.status}>No recorded sessions found in this time range.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Started</th>
                <th>Application</th>
                <th>User</th>
                <th>Environment</th>
                <th>Browser</th>
                <th>Session ID</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.sessionId} onClick={() => openSession(session.sessionId)} tabIndex={0}>
                  <td>{new Date(session.startedAt).toLocaleString()}</td>
                  <td>{session.app ?? '—'}</td>
                  <td>{session.userEmail ?? session.userId ?? 'Anonymous'}</td>
                  <td>{session.environment ?? '—'}</td>
                  <td>{session.browser ?? '—'}</td>
                  <td className={styles.monospace}>{session.sessionId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PluginPage>
  );
};

const getStyles = (theme: Parameters<typeof css>[0] extends never ? never : any) => ({
  header: css({ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing(3) }),
  secondary: css({ color: theme.colors.text.secondary, margin: 0 }),
  filters: css({
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 2fr) repeat(3, minmax(140px, 1fr))',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down('md')]: { gridTemplateColumns: '1fr 1fr' },
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: '1fr' },
  }),
  status: css({ padding: theme.spacing(5), color: theme.colors.text.secondary, textAlign: 'center' }),
  tableWrap: css({ overflowX: 'auto', borderTop: `1px solid ${theme.colors.border.weak}` }),
  table: css({
    borderCollapse: 'collapse',
    minWidth: 900,
    width: '100%',
    'th, td': { borderBottom: `1px solid ${theme.colors.border.weak}`, padding: theme.spacing(1.5), textAlign: 'left' },
    th: { color: theme.colors.text.secondary, fontWeight: theme.typography.fontWeightMedium },
    'tbody tr': { cursor: 'pointer' },
    'tbody tr:hover': { background: theme.colors.action.hover },
  }),
  monospace: css({ fontFamily: theme.typography.fontFamilyMonospace }),
});

export default SessionsPage;
