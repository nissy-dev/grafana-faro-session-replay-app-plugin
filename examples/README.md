# Session replay example

This example records a small storefront with Faro and sends telemetry through
Alloy: logs, exceptions and events go to Loki, traces go to Tempo.

Services started by the root `docker-compose.yaml`:

- Demo app: <http://localhost:4173>
- Alloy Faro receiver: <http://localhost:12347/collect>
- Loki: <http://localhost:3100>
- Tempo: <http://localhost:3200>
- Grafana replay viewer: <http://localhost:3000/a/nissydev-farosessionreplay-app/sessions>

Open the demo, add products, search, edit the cart, and run the demo checkout.
Then open the replay viewer and refresh the session list.

The demo app fetches `/api/inventory.json` on page load and during checkout from
inside an active span, so the resulting events carry a trace ID. Those rows show
a **Trace** link in the session event feed that opens the trace in Tempo.