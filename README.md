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
wrangler r2 bucket create cataqui-map-development
```

For staging and production, create additional buckets and configure them in `wrangler.jsonc`:

```bash
wrangler r2 bucket create cataqui-map-staging
wrangler r2 bucket create cataqui-map-production
```

Upload your `.pmtiles` files to the bucket:

```bash
wrangler r2 object put cataqui-map-[ENV]/map.pmtiles --file ./path/to/map.pmtiles
```

## Local Development

```bash
pnpm start
```

The worker serves at http://localhost:8787. The cache is not active in local development.

## Configuration

### Environment Variables (`wrangler.jsonc`)

| Variable         | Default                    | Description                          |
|------------------|----------------------------|--------------------------------------|
| `ALLOWED_ORIGINS`| `*`                        | Comma-separated CORS origins         |
| `CACHE_CONTROL`  | `public, max-age=86400`    | Cache-Control header for responses   |

### R2 Buckets (`wrangler.jsonc`)

| Environment   | Bucket Name                  |
|---------------|------------------------------|
| Development   | `cataqui-map-development`    |
| Staging       | `cataqui-map-staging`        |
| Production    | `cataqui-map-production`     |

### Cloudflare Bindings

The worker expects a single R2 bucket binding named `BUCKET`. The bucket name varies by environment (see above).

## API

### Tile Endpoint

```
GET /{name}/{z}/{x}/{y}.{ext}
```

- `name` — Map name (corresponds to the `.pmtiles` file name in R2)
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

### Example

Request:

```http
GET /my-map/10/5/12.mvt
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

## Limitations

- CORS preflight (`OPTIONS`) requests are not handled; tile requests are simple GET requests that do not trigger preflight
- The Worker does not support signed URLs or authentication — access control is managed through Cloudflare's WAF, Access, or other edge security features
- Cache is disabled in local development; production uses `caches.default` with the configured `Cache-Control` header

## License

BSD-3-Clause
