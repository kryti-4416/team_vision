# GridSense

GridSense is an off-grid environmental monitoring dashboard for a four-node ESP32 and LoRa mesh. It gives responders a single view of sensor readings, node availability, network routes, and environmental risk when internet or cellular service may be unavailable.

The frontend is built with plain HTML, CSS, and JavaScript. It can read the gateway's USB serial output in a supported browser; a backend API can be connected later through the data adapter in `app.js`.

## Features

- **Overview:** node availability, gateway serial state, buffered reading count, sensor types, recent events, latest readings, a network map preview, and a heatmap preview.
- **Network map:** satellite background, four node markers, gateway marker, active, alternative, and broken link styles, and route changes reported by the gateway.
- **Node details:** per-node status, manually assigned coordinates, last-seen time, temperature, gas, vibration, next hop, and hop count.
- **Heatmap:** selectable gas, temperature, and vibration views with low-to-high risk coloring. Danger alerts are shown across the dashboard and can be dismissed after viewing the heatmap.
- **Alerts and events:** gateway-reported readings and route activity, plus heatmap danger alerts.
- **Data logs:** timestamped sensor readings, delivery state, and route or reroute information.
- **Settings:** add and delete node records, choose a primary sensor, and enter latitude and longitude. Coordinates are validated, node IDs must be unique, and deletion requires confirmation.
- **Responsive, keyboard-accessible controls** and clear connection and waiting states.

The dashboard does not display battery levels or RSSI, send commands to ESP32 nodes, or require internet access.

## Hardware and sensors

The project uses four ESP32/LoRa nodes and one gateway. The sensors represented in the interface are:

- MQ135 gas sensor
- DS18B20 temperature sensor
- SW-420 vibration sensor

Node coordinates are entered manually; the nodes do not provide GPS coordinates.

## Run locally

No package installation or build step is required.

1. Open this folder in Visual Studio Code.
2. Serve the folder on localhost with the Live Server extension or another local static file server.
3. Open the local address in Chrome or Edge.
4. Select **Connect gateway serial** and choose the gateway's COM port.

Close Arduino IDE Serial Monitor before connecting from the browser, because both applications cannot normally use the same COM port at the same time. The dashboard opens the port at **115200 baud**.

## Gateway serial integration

The serial reader in `app.js` parses the gateway's multi-line `GATEWAY RECEIVED` message and the periodic `GW STATUS:` message. It reads the message ID, route, origin, temperature, gas, and vibration fields. RSSI is ignored by the UI.

The reader currently updates live sensor values for **Node 3** when the gateway reports origin Node 3. It recognizes normal and backup routes, including:

```text
3->2->1->GW [NORMAL]
3->4->1->GW [BACKUP]
```

When the gateway reports a route change, the network map and data logs are updated. No routing decisions are made by the frontend.

## Display conversions and heatmap thresholds

The gateway packet carries numeric sensor fields. The current frontend applies simple display mappings so Node 3 appears in the same units as the other node cards:

- Gas: incoming number is displayed as ppm at a 1:1 display scale.
- Temperature: displayed in °C.
- SW-420 vibration: `0` displays as `0.0 g`; any nonzero value displays as `1.0 g`.

With the current vibration threshold of **0.6 g**, a vibration value of `1` colors the area around Node 3 red in the vibration heatmap and raises a danger alert. The MQ135 and SW-420 conversions are presentation mappings, not calibrated physical measurements. Calibrate them against the actual sensors before relying on the displayed ppm or g values operationally. The thresholds are defined in `app.js` as `dangerThresholds`.

## Project files

```text
GridSense Dashboard/
├── index.html
├── app.js
├── styles.css
├── topology.css
└── assets/
    └── gridsense-satellite.jpg
```

- `index.html` contains the dashboard layout and navigation.
- `styles.css` and `topology.css` define the visual theme and map layout.
- `app.js` contains rendering, navigation, heatmap alerts, settings, and the Web Serial reader.
- `assets/gridsense-satellite.jpg` is the local satellite image used by the map and heatmap.


