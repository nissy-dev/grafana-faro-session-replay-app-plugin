# Faro Session Replay

Grafana app plugin for browsing and replaying browser sessions recorded by
[`@grafana/faro-instrumentation-replay`](https://github.com/grafana/faro-web-sdk/tree/main/experimental/instrumentation-replay)
and stored in Loki. Grafana Cloud Frontend Observability offers
[session replay as a hosted feature](https://grafana.com/blog/visual-playback-of-the-user-journey-introducing-session-replay-in-grafana-cloud-frontend-observability/);
this plugin covers the same ground for recordings you keep in your own Loki.

## Demo

Replaying a session recorded by the [example stack](examples/README.md): the feed on the
right follows playback, and rows carrying a trace ID link into Tempo.

<video src="docs/media/session-replay.webm" poster="docs/media/session-replay.png" controls muted playsinline width="900">
  <a href="docs/media/session-replay.webm">Watch the session replay demo</a>
</video>

Regenerate it with `node scripts/record-demo.mjs` while the example stack is running.

## Features

- Search recorded sessions by time, application, environment, user, or session ID.
- Replay Faro rrweb events with play, pause, seek, speed, inactive-period skipping, and fullscreen controls.
- Follow the session's logs, exceptions, custom events, and measurements in a feed beside the player that tracks playback.
- Seek playback from a feed entry and open related trace IDs in Tempo/Explore.
- Share a replay using a URL containing the session ID and absolute time range.

## Development

The toolchain is pinned by `mise.toml`:

```bash
mise install
mise exec -- pnpm install
mise exec -- pnpm run dev
```

Start Grafana and the provisioned local Loki instance in another terminal:

```bash
mise exec -- pnpm run server
```

Loki is exposed on <http://localhost:3100>; Grafana reaches it through the
Compose network at `http://loki:3100`.

Open <http://localhost:3000/a/nissydev-farosessionreplay-app/sessions>. The local
Grafana instance permits this unsigned development plugin and provisions the app
with the `local-loki` datasource UID.

Run checks with:

```bash
mise exec -- pnpm run typecheck
mise exec -- pnpm run lint
mise exec -- pnpm run test:ci
mise exec -- pnpm run build
```

## Collection pipeline

This plugin does not collect or store replay data. Applications record sessions,
Alloy receives Faro telemetry, and Alloy writes JSON log lines to Loki:

```text
Browser + Faro ReplayInstrumentation -> Alloy faro.receiver -> Loki -> Grafana plugin
```

Use the replay package version matching the application's Faro packages. Faro 2.9
records with `@grafana/rrweb@2.0.0-grafana.2`; this plugin uses that same fork for
playback.

```ts
import { ReplayInstrumentation } from '@grafana/faro-instrumentation-replay';
import { initializeFaro } from '@grafana/faro-web-sdk';

initializeFaro({
  url: 'http://localhost:12347/collect',
  app: { name: 'storefront', version: '1.0.0', environment: 'development' },
  instrumentations: [new ReplayInstrumentation({ samplingRate: 1 })],
});
```

Configure Alloy's `faro.receiver` logs output to write to Loki. The plugin expects
JSON lines with these canonical fields:

| Field                         | Purpose                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `kind`                        | `event`, `log`, `exception`, or `measurement`; intended as a low-cardinality Loki label |
| `event_name`                  | `faro.session_recording.started` or `faro.session_recording.event`                      |
| `session_id`                  | Faro session ID; keep this as a JSON field, not a Loki stream label                     |
| `event_data_event`            | JSON-encoded `@grafana/rrweb-types` event                                               |
| `timestamp`                   | Original browser telemetry timestamp                                                    |
| `app_name`, `app_environment` | Session list filters and metadata                                                       |
| `user_id`, `user_email`       | Optional user metadata                                                                  |
| `traceID`                     | Optional Tempo correlation                                                              |

The session list uses `faro.session_recording.started` markers. Replay detail
queries `faro.session_recording.event`, splits saturated Loki time windows, parses
the nested rrweb JSON, removes duplicates, and sorts by rrweb timestamp.

The event feed beside the player queries the same session's `log`, `exception`,
`event`, and `measurement` lines, excluding the replay payload itself. Rows whose
line carries a `traceID` link into the configured Tempo data source, so enable
Faro's `TracingInstrumentation` and forward `faro.receiver`'s traces output to
Tempo to get those links.

## Plugin configuration

In **Administration > Plugins and data > Plugins > Faro Session Replay**, configure:

- **Loki data source**: required datasource containing Faro events.
- **Tempo data source**: optional datasource used for trace links.
- **Default time range**: initial session search lookback in hours.
- **Maximum lines per query**: Loki limit before replay retrieval splits the time window.

Datasource credentials remain managed by Grafana. The app stores only datasource
UIDs and query settings in non-sensitive `jsonData`.

## Privacy and limits

- Enable Faro input and text masking before collection. Loki and this plugin do not sanitize recorded DOM data.
- A replay requires at least one rrweb full snapshot in the selected time range.
- There is no explicit session-end event; duration is inferred from the last replay event.
- Multi-tab sessions are not merged.
- Live replay, data deletion, and retention management are outside this plugin.
- `@grafana/rrweb` is an internal Grafana fork. Keep recorder and player versions aligned when upgrading Faro.

Changes to `src/plugin.json` require rebuilding the plugin and restarting Grafana.
