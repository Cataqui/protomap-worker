# Protomap Worker

A Cloudflare Worker for serving [PMTiles](https://protomaps.com/) map tiles from R2 storage.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)
- [Cloudflare account](https://dash.cloudflare.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (included as dev dependency)

## Setup

```bash
pnpm install
```

## Cloudflare R2 Buckets

Create the development bucket:

```bash
wrangler r2 bucket create protomap-development
```

For staging and production, create additional buckets and configure them in `wrangler.jsonc`:

```bash
wrangler r2 bucket create protomap-staging
wrangler r2 bucket create protomap-production
```

Upload your `.pmtiles` files to the bucket:

```bash
wrangler r2 object put protomap-[ENV]/map.pmtiles --file ./path/to/map.pmtiles
```

## Local Development

The worker serves at http://localhost:8787. Cache is not active in local development.

### Option A: Local mode (no Cloudflare login needed)

```bash
pnpm start
```

The R2 bucket is simulated in-memory and starts empty — no actual Cloudflare resources are touched.
Use this for code changes and unit testing; tile requests will return 404 since there's no data.

### Option B: Remote mode (requires login once)

```bash
wrangler login          # One-time setup
pnpm start -- --remote  # Or: wrangler dev --remote
```

Connects to your real `protomap-development` R2 bucket on Cloudflare's edge.
Upload your `.pmtiles` file first:

```bash
wrangler r2 object put protomap-development/my-map.pmtiles --file ./my-map.pmtiles
```

Then requests to http://localhost:8787/my-map/... will serve real tile data.

## Configuration

### Environment Variables (`wrangler.jsonc`)

| Variable         | Default                    | Description                          |
|------------------|----------------------------|--------------------------------------|
| `ALLOWED_ORIGINS`| `*`                        | Comma-separated CORS origins         |
| `AUTH_SECRET`    | —                          | HMAC-SHA256 secret for signed URLs   |
| `CACHE_CONTROL`  | `public, max-age=86400`    | Cache-Control header for responses   |

When `AUTH_SECRET` is not set, authentication is disabled and all requests are allowed.

### R2 Buckets (`wrangler.jsonc`)

| Environment   | Bucket Name                  |
|---------------|------------------------------|
| Development   | `protomap-development`    |
| Staging       | `protomap-staging`        |
| Production    | `protomap-production`     |

### Cloudflare Bindings

The worker expects a single R2 bucket binding named `BUCKET`. The bucket name varies by environment (see above).

## Authentication (Signed URLs)

The worker supports optional HMAC-SHA256 signature-based authentication for tile and TileJSON requests. When `AUTH_SECRET` is set, all requests must include valid `v`, `sig`, and `exp` query parameters. When `AUTH_SECRET` is not set, authentication is disabled and all requests pass through.

### How it works

1. A backend service signs URLs using HMAC-SHA256 with the shared `AUTH_SECRET`.
2. The signature covers a versioned message format that includes the params needed for validation.
3. The frontend (map library) includes the signed URL params in tile requests.
4. The worker verifies the signature and params before serving each request.

### URL Format

```
GET /{name}/{z}/{x}/{y}.{ext}?v=1&sig={hex_signature}&exp={unix_timestamp}
```

| Param | Description |
|-------|-------------|
| `v`   | Signature version (currently `1`) |
| `sig` | Hex-encoded HMAC-SHA256 signature |
| `exp` | Unix timestamp when the URL expires |

### Signing Algorithm

The signed message is versioned and colon-delimited for future extensibility:

```
v1 (current): message = "v1:" + expiration
v2 (future):  message = "v2:" + mapName + ":" + expiration
```

The `v` URL parameter tells the verifier which version to use, so only one HMAC computation is needed per request.

#### Backend signing example (Node.js)

```javascript
const crypto = require("crypto");
const secret = process.env.AUTH_SECRET;
const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
const message = `v1:${exp}`;
const sig = crypto.createHmac("sha256", secret).update(message).digest("hex");
const url = `https://your-worker.example.com/your-map/{z}/{x}/{y}.mvt?v=1&sig=${sig}&exp=${exp}`;
```

### Setting the Secret

Generate a secret:

```bash
openssl rand -hex 32
```

Set it in production:

```bash
wrangler secret put AUTH_SECRET
wrangler secret put AUTH_SECRET --env staging
wrangler secret put AUTH_SECRET --env production
```

For local development, copy `.dev.vars.example` to `.dev.vars` and set `AUTH_SECRET` there.

### Client Integration

The frontend never has the secret. A backend service signs the URL and passes it to the frontend. The map library uses the full signed URL as the tile URL template.

**JavaScript example (fetch from backend, then use in Leaflet):**

```javascript
// Fetch a signed URL from your backend
const response = await fetch("/api/sign-tile-url");
const { signedUrl } = await response.json();

// Use in Leaflet
const map = L.map('map').setView([-23.55, -46.63], 12);
L.tileLayer(signedUrl, {
  tileSize: 512,
}).addTo(map);
```

### Testing with curl

```bash
# Compute a signature (adjust expiration as needed)
SECRET="your-auth-secret"
EXP=$(($(date +%s) + 3600))
SIG=$(echo -n "v1:$EXP" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Fetch tile with signed URL
curl "https://your-worker.example.com/your-map/12/1516/2021.mvt?v=1&sig=$SIG&exp=$EXP" -o tile.mvt
```

## API

### Tile Endpoint

```
GET /{name}/{z}/{x}/{y}.{ext}
```

- `name` — Map identifier. The worker looks up a `.pmtiles` file with this name in the R2 bucket. For example, requesting `/brazil/12/1516/2021.mvt` will fetch `brazil.pmtiles` from the bucket.

  You can customize how the name maps to the R2 key via the `PMTILES_PATH` environment variable. By default it's `{name}.pmtiles`, but you can set it to `folder/{name}/archive.pmtiles` or any template containing `{name}`.
- `z` — Zoom level (`0` = single tile covering the whole world, `1` = 2×2 tiles, etc.)
- `x` — Tile column (0 to `2^z - 1`, left to right)
- `y` — Tile row (0 to `2^z - 1`, top to bottom)
- `ext` — File extension that matches the `.pmtiles` archive's internal tile type

  A `.pmtiles` file stores tiles in exactly one format. The URL extension must match it:

  | If your `.pmtiles` contains... | Use `ext` |
  |---|---|
  | Vector tiles (most common, e.g. from Planetiler) | `mvt` (or `pbf` as alias) |
  | PNG raster tiles | `png` |
  | JPEG raster tiles | `jpg` |
  | WebP raster tiles | `webp` |
  | AVIF raster tiles | `avif` |

  Mismatch example: using `.png` when the archive stores MVT returns a `400` error.

  **How to find your archive's type**: run `pmtiles show file.pmtiles` and check the tile type in the header, or request `/name.json` to get the TileJSON response.

### TileJSON Endpoint

```
GET /{name}.json
```

Returns a [TileJSON](https://github.com/mapbox/tilejson-spec) description of the tileset.

### Authentication

If `AUTH_SECRET` is set, all requests must include `?v=1&sig=...&exp=...` query parameters. See the [Authentication section](#authentication-signed-urls) for details.

### Example

Request (without auth):

```http
GET /my-map/10/5/12.mvt
```

Request (with auth enabled):

```http
GET /my-map/10/5/12.mvt?v=1&sig=abc123def456...&exp=1718000000
```

Response: binary protobuf tile data with `Content-Type: application/x-protobuf`.

## Testing

```bash
pnpm test          # Run tests once
pnpm test:watch    # Run tests in watch mode
```

Tests use [Vitest](https://vitest.dev/) with `@cloudflare/vitest-pool-workers` for integration testing against simulated R2 bindings.

## Type Checking

```bash
pnpm typecheck
```

## Linting and Formatting

```bash
pnpm lint          # Check for lint issues
pnpm format       # Format source files
```

Uses [Biome](https://biomejs.dev/) for fast, unified linting and formatting.

## Build

```bash
pnpm build
```

Validates the Worker configuration without deploying.

## Deployment

```bash
pnpm deploy                # Deploy to development
pnpm deploy --env staging  # Deploy to staging
pnpm deploy --env production  # Deploy to production
```

If you enabled authentication, set the secret in each environment:

```bash
wrangler secret put AUTH_SECRET                # Development
wrangler secret put AUTH_SECRET --env staging  # Staging
wrangler secret put AUTH_SECRET --env production  # Production
```

## Client Integration

This worker serves tiles to any map library that supports HTTP tile sources. Below are examples for common platforms.

### Flutter (flutter_map)

```dart
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

TileLayer(
  tileProvider: CachedNetworkTileProvider(),
  urlTemplate: 'https://your-worker.example.com/{mapName}/{z}/{x}/{y}.mvt',
  additionalOptions: {
    'mapName': 'your-map',
  },
),
```

### Leaflet (JavaScript)

```html
<script>
const map = L.map('map').setView([-23.55, -46.63], 12);

L.tileLayer('https://your-worker.example.com/{mapName}/{z}/{x}/{y}.mvt', {
  mapName: 'your-map',
  tileSize: 512,
}).addTo(map);
</script>
```

### MapLibre GL JS (JavaScript)

```javascript
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      tiles: {
        type: 'vector',
        tiles: ['https://your-worker.example.com/your-map/{z}/{x}/{y}.mvt'],
      },
    },
    layers: [
      {
        id: 'roads',
        type: 'line',
        source: 'tiles',
        'source-layer': 'roads',
      },
    ],
  },
});
```

### React Native (react-native-maps)

```jsx
import MapView, { UrlTile } from 'react-native-maps';

<MapView
  initialRegion={{
    latitude: -23.55,
    longitude: -46.63,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  }}
>
  <UrlTile
    urlTemplate="https://your-worker.example.com/your-map/{z}/{x}/{y}.mvt"
    tileSize={512}
  />
</MapView>
```

### React Native (Mapbox GL)

```jsx
import Mapbox from '@rnmapbox/maps';

<Mapbox.MapView style={{ flex: 1 }}>
  <Mapbox.RasterSource
    id="tiles"
    tileUrlTemplates={['https://your-worker.example.com/your-map/{z}/{x}/{y}.mvt']}
    tileSize={512}
  >
    <Mapbox.RasterLayer id="tile-layer" sourceID="tiles" />
  </Mapbox.RasterSource>
</Mapbox.MapView>
```

### OpenLayers (JavaScript)

```javascript
import TileLayer from 'ol/layer/Tile.js';
import XYZ from 'ol/source/XYZ.js';

const layer = new TileLayer({
  source: new XYZ({
    url: 'https://your-worker.example.com/your-map/{z}/{x}/{y}.mvt',
  }),
});
```

### Swift (MapKit)

```swift
import MapKit

let tileOverlay = MKTileOverlay(
  urlTemplate: "https://your-worker.example.com/your-map/{z}/{x}/{y}.mvt"
)
tileOverlay.canReplaceMapContent = true
mapView.addOverlay(tileOverlay, level: .aboveLabels)
```

### Kotlin (osmdroid)

```kotlin
import org.osmdroid.tileprovider.tilesource.OnlineTileSourceBase
import org.osmdroid.util.MapTileIndex

val tileSource = object : OnlineTileSourceBase(
  "PMTiles", 1, 20, 512, ".mvt", arrayOf("https://your-worker.example.com/")
) {
  override fun getTileURLString(tile: Long): String {
    val z = MapTileIndex.getZoom(tile)
    val x = MapTileIndex.getX(tile)
    val y = MapTileIndex.getY(tile)
    return "https://your-worker.example.com/your-map/$z/$x/$y.mvt"
  }
}
mapView.setTileSource(tileSource)
```

### Kotlin (Mapbox Android)

```kotlin
val styleUrl = "https://your-worker.example.com/your-map.json"

mapboxMap.loadStyleUri(styleUrl)
```

### Testing with curl

```bash
# Fetch tile (replace with your worker URL and valid coordinates)
curl https://your-worker.example.com/your-map/12/1516/2021.mvt -o tile.mvt

# Fetch TileJSON metadata
curl https://your-worker.example.com/your-map.json
```

## Security

- CORS is controlled by the `ALLOWED_ORIGINS` variable
- Only GET requests are accepted; POST requests return 405
- Input is validated before accessing R2 resources
- No secrets are hardcoded in source or configuration
- Stack traces are never exposed to clients
- The `BUCKET` binding restricts access to the configured R2 bucket
- Optional HMAC-SHA256 signed URL authentication via `AUTH_SECRET` — set it in production to protect your tile endpoints

## Limitations

- CORS preflight (`OPTIONS`) requests are not handled; tile requests are simple GET requests that do not trigger preflight
- Optional HMAC-SHA256 signed URL authentication must be enabled by setting `AUTH_SECRET` — it is disabled by default
- Cache is disabled in local development; production uses `caches.default` with the configured `Cache-Control` header

## License

BSD-3-Clause
