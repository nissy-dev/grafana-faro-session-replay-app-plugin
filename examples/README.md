# Session replay example

This example records a small storefront with Faro and sends telemetry through
Alloy to the local Loki instance used by the app plugin.

Services started by the root `docker-compose.yaml`:

- Demo app: <http://localhost:4173>
- Alloy Faro receiver: <http://localhost:12347/collect>
- Loki: <http://localhost:3100>
- Grafana replay viewer: <http://localhost:3000/a/nissydev-farosessionreplay-app/sessions>

Open the demo, add products, search, edit the cart, and run the demo checkout.
Then open the replay viewer and refresh the session list.