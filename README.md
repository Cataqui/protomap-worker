<div align="center">
  <br/>
  <h1>🗺️ Protomap Worker</h1>
  <p><strong>Self-hosted Protomaps tile server on Cloudflare Workers, as easy as Mapbox, but yours.</strong></p>
  <p>
    <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick_Start-30_seconds-73DC8C?style=flat" alt="Quick Start"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-BSD--3--Clause-blue?style=flat" alt="License"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://biomejs.dev/"><img src="https://img.shields.io/badge/code_style-Biome-60A5FA?style=flat" alt="Biome"></a>
    <a href="https://protomaps.com/"><img src="https://img.shields.io/badge/powered_by-Protomaps-FF6B35?style=flat" alt="Protomaps"></a>
    <a href="https://workers.cloudflare.com/"><img src="https://img.shields.io/badge/runtime-Cloudflare_Workers-F38020?style=flat&logo=cloudflare&logoColor=white" alt="Cloudflare Workers"></a>
  </p>
  <br/>
</div>

Deploy a production-ready **Protomaps** tile worker in under 5 minutes. No servers to manage, no CDN config, no complex infrastructure. Upload your `.pmtiles` file, deploy the worker, and get a map on screen, it's that simple.

```bash
# 1. Deploy the worker
npx wrangler deploy

# 2. Upload your map data
npx wrangler r2 object put protomap-development/my-map.pmtiles --file ./map.pmtiles

# 3. Open in your app
https://protomap-worker.example.com/my-map/{z}/{x}/{y}.mvt
```

---

## ✨ Features

- **⚡ Edge-native:** Built for Cloudflare Workers, deployed globally in seconds
- **🗂️ PMTiles:** Serves vector and raster tiles directly from `.pmtiles` archives
- **🔐 Optional auth:** HMAC-SHA256 signed URL protection when you need it
- **🚀 Production-ready:** Caching, CORS, input validation, and structured errors
- **📦 Zero infra:** No servers, no Kubernetes, no CDN configuration
- **🎯 Framework-agnostic:** Works with Leaflet, MapLibre, OpenLayers, MapKit, Flutter, React Native, and more
- **📋 TileJSON:** Built-in metadata endpoint for compliant map clients
- **🔒 Security by default:** No stack traces, path traversal protection, strict input validation

---

## 📖 Table of Contents

- [Quick Start](#-quick-start)
- [What & Why](#-what--why)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Authentication (Signed URLs)](#-authentication-signed-urls)
- [Client Integration](#-client-integration)
- [Deployment](#-deployment)
- [Local Development](#-local-development)
- [Scripts](#-scripts)
- [Architecture](#-architecture)
- [Security](#-security)
- [Limitations](#-limitations)
- [Contributing](#-contributing)
- [License](#-license)

---

## ⚡ Quick Start

Get a tile server running in 3 steps:

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/installation)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/Cataqui/protomap-worker.git
cd protomap-worker
pnpm install
```

### 2. Create an R2 bucket

```bash
npx wrangler r2 bucket create protomap-development
```

### 3. Deploy & upload a map

```bash
# Deploy the worker
pnpm deploy

# Upload a .pmtiles file
npx wrangler r2 object put protomap-development/my-map.pmtiles --file ./path/to/your-map.pmtiles
```

**Your map is live.** Point your map library at:

```
https://protomap-worker.example.com/my-map/{z}/{x}/{y}.mvt
```

> 💡 **Don't have a `.pmtiles` file?** Download a sample from [Protomaps Downloads](https://protomaps.com/downloads) or build one with [Planetiler](https://github.com/onthegomap/planetiler).

---

## 🧭 What & Why

### What is Protomap Worker?

A **Cloudflare Worker** that serves map tiles from [PMTiles](https://protomaps.com/) archives stored in **Cloudflare R2**. It wraps the [`pmtiles`](https://github.com/protomaps/PMTiles) library in a secure, cacheable, production-grade HTTP interface.

### Why not just use Mapbox?

| | Protomap Worker | Mapbox |
|---|---|---|
| **Cost** | Pay only for R2 storage + Worker requests | Usage-based pricing, can get expensive |
| **Data control** | Your data, your bucket | Data lives on Mapbox servers |
| **Privacy** | No third-party tile server | Analytics & tracking built in |
| **Self-sovereignty** | Full control over deployment | Vendor lock-in |
| **Global edge** | Cloudflare's global network | Their own CDN |
| **Setup time** | ~5 minutes | Registration + API keys + billing |

Protomap Worker gives you **Mapbox-like ease** with **self-hosted control**.

---

## 📦 Installation

```bash
pnpm install
```

This installs the worker, CLI tooling (Wrangler), and all dependencies.

---

## ⚙️ Configuration

### Environment Variables

Set in `wrangler.jsonc` (non-secret) or as Cloudflare secrets:

| Variable | Default | Secret? | Description |
|---|---|---|---|
| `AUTH_SECRET` | — | ✅ | HMAC-SHA256 secret for signed URL authentication. When unset, auth is disabled. |
| `ALLOWED_ORIGINS` | `*` | ❌ | Comma-separated list of allowed CORS origins. Set to specific domains in production. |
| `CACHE_CONTROL` | `public, max-age=86400` | ❌ | `Cache-Control` header value for tile responses. |
| `PMTILES_PATH` | `{name}.pmtiles` | ❌ | Template for R2 key resolution. Supports `{name}` placeholder. Example: `folder/{name}/archive.pmtiles` |
| `PUBLIC_HOSTNAME` | — | ❌ | Public hostname used in TileJSON responses. Auto-detected from request when unset. |

### Local Development

Copy the example env file:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` to set `AUTH_SECRET` if you need auth locally:

```env
AUTH_SECRET=your-local-secret
```

> `ALLOWED_ORIGINS` and `CACHE_CONTROL` are already set in `wrangler.jsonc` — no need to duplicate them.

### R2 Buckets

Configured in `wrangler.jsonc` under each environment:

| Environment | Bucket Name | Worker Name |
|---|---|---|
| Development | `protomap-development` | `protomap-worker` |
| Staging | `protomap-staging` | `protomap-worker-staging` |
| Production | `protomap-production` | `protomap-worker-production` |

The worker expects a single R2 bucket binding named `BUCKET`.

---

## 📡 API Reference

### Serve a tile

```
GET /{name}/{z}/{x}/{y}.{ext}
```

| Param | Description |
|---|---|
| `name` | Map identifier. Resolves to an R2 object key using `PMTILES_PATH` template (default: `{name}.pmtiles`). |
| `z` | Zoom level. `0` (single world tile) through `20+`. |
| `x` | Tile column. Range: `0` to `2^z - 1`, left to right. |
| `y` | Tile row. Range: `0` to `2^z - 1`, top to bottom (TMS). |
| `ext` | File extension. Must match the archive's tile type (see table below). |

**Extension to tile type mapping:**

| Extension | Content Type |
|---|---|
| `mvt`, `pbf` | `application/x-protobuf` (vector tiles) |
| `png` | `image/png` |
| `jpg`, `jpeg` | `image/jpeg` |
| `webp` | `image/webp` |
| `avif` | `image/avif` |

> ⚠️ Using a mismatched extension (e.g., `.png` on an MVT archive) returns `400 Bad Request`.
>
> 💡 **How to check your archive's type:** Run `pmtiles show file.pmtiles` and check the tile type in the header, or request `/{name}.json` to see the TileJSON response.

**Example:**

```http
GET /brazil/12/1516/2021.mvt
```

```http
HTTP/1.1 200 OK
Content-Type: application/x-protobuf
Cache-Control: public, max-age=86400
Access-Control-Allow-Origin: *
```

### Get TileJSON metadata

```
GET /{name}.json
```

Returns a [TileJSON](https://github.com/mapbox/tilejson-spec) description of the tileset — useful for MapLibre, Mapbox GL, and other TileJSON-aware clients.

**Example:**

```http
GET /brazil.json
```

```json
{
  "tilejson": "3.0.0",
  "name": "brazil",
  "scheme": "xyz",
  "tiles": [
    "https://your-worker.example.com/brazil/{z}/{x}/{y}.mvt"
  ],
  "vector_layers": [...],
  "maxzoom": 14,
  "minzoom": 0
}
```

### Cache behavior

- **Local dev:** Caching is disabled
- **Production:** Uses `caches.default` with `Cache-Control` from configuration
- **Cache key:** Based on URL with auth params stripped (so signed URLs still cache effectively)

---

## 🔐 Authentication (Signed URLs)

Optional HMAC-SHA256 signed URL protection. When `AUTH_SECRET` is set, every request must include valid `v`, `sig`, and `exp` query parameters. When unset, all requests pass through unauthenticated.

### How it works

1. A **backend service** signs tile URLs using your `AUTH_SECRET`
2. The **frontend** receives a fully signed URL template
3. The **worker** verifies each request before serving tile data

No secrets ever reach the client.

### URL format

```
GET /{name}/{z}/{x}/{y}.{ext}?v=1&sig={hex_signature}&exp={unix_timestamp}
```

| Param | Description |
|---|---|
| `v` | Signature version. Currently `1`. |
| `sig` | Hex-encoded HMAC-SHA256 signature of the message. |
| `exp` | Unix timestamp (seconds) when this URL expires. |

### Signing (Node.js backend example)

```javascript
import { createHmac } from "node:crypto";

const secret = process.env.AUTH_SECRET;
const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour
const message = `v1:${exp}`;
const sig = createHmac("sha256", secret).update(message).digest("hex");

const url = `https://your-worker.example.com/my-map/{z}/{x}/{y}.mvt?v=1&sig=${sig}&exp=${exp}`;
```

> The message format is versioned for future extensibility:
> - **v1:** `v1:{exp}`
> - **v2 (future):** `v2:{mapName}:{exp}`

### Setting the secret

```bash
# Generate a secret
openssl rand -hex 32

# Set in production
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_SECRET --env staging
npx wrangler secret put AUTH_SECRET --env production
```

For local development, add to `.dev.vars`:

```env
AUTH_SECRET=your-generated-secret
```

### Verify with curl

```bash
SECRET="your-auth-secret"
EXP=$(($(date +%s) + 3600))
SIG=$(echo -n "v1:$EXP" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

curl "https://your-worker.example.com/my-map/12/1516/2021.mvt?v=1&sig=$SIG&exp=$EXP" -o tile.mvt
```

---

## 🎨 Client Integration

Protomap Worker works with any map library that supports HTTP tile sources. All examples use the tile URL pattern `https://your-worker.example.com/{mapName}/{z}/{x}/{y}.mvt`.

<details>
<summary><b>Leaflet (JavaScript)</b></summary>

```html
<script>
const map = L.map('map').setView([-23.55, -46.63], 12);

L.tileLayer('https://your-worker.example.com/{mapName}/{z}/{x}/{y}.mvt', {
  mapName: 'your-map',
  tileSize: 512,
}).addTo(map);
</script>
```

</details>

<details>
<summary><b>MapLibre GL JS</b></summary>

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

</details>

<details>
<summary><b>OpenLayers</b></summary>

```javascript
import TileLayer from 'ol/layer/Tile.js';
import XYZ from 'ol/source/XYZ.js';

const layer = new TileLayer({
  source: new XYZ({
    url: 'https://your-worker.example.com/your-map/{z}/{x}/{y}.mvt',
  }),
});
```

</details>

<details>
<summary><b>Flutter (flutter_map)</b></summary>

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

</details>

<details>
<summary><b>React Native (react-native-maps)</b></summary>

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

</details>

<details>
<summary><b>iOS (MapKit)</b></summary>

```swift
import MapKit

let tileOverlay = MKTileOverlay(
  urlTemplate: "https://your-worker.example.com/your-map/{z}/{x}/{y}.mvt"
)
tileOverlay.canReplaceMapContent = true
mapView.addOverlay(tileOverlay, level: .aboveLabels)
```

</details>

<details>
<summary><b>Android (Mapbox / osmdroid)</b></summary>

```kotlin
// Mapbox GL — use TileJSON
val styleUrl = "https://your-worker.example.com/your-map.json"
mapboxMap.loadStyleUri(styleUrl)

// osmdroid
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

</details>

<details>
<summary><b>Testing with curl</b></summary>

```bash
# Fetch a tile
curl https://your-worker.example.com/your-map/12/1516/2021.mvt -o tile.mvt

# Fetch TileJSON metadata
curl https://your-worker.example.com/your-map.json
```

</details>

---

## 🚀 Deployment

### Deploy to Cloudflare Workers

```bash
# Development (default)
pnpm deploy

# Staging
pnpm deploy --env staging

# Production
pnpm deploy --env production
```

### Deploy to production with auth

```bash
# 1. Generate a secret
openssl rand -hex 32

# 2. Set it in your environment
npx wrangler secret put AUTH_SECRET --env production

# 3. Create the production bucket
npx wrangler r2 bucket create protomap-production

# 4. Upload your map
npx wrangler r2 object put protomap-production/my-map.pmtiles --file ./map.pmtiles

# 5. Deploy
pnpm deploy --env production
```

### Custom domain

In your Cloudflare dashboard, add a route or custom domain to your worker for a clean URL like `tiles.yourdomain.com`.

---

## 💻 Local Development

### Option A: Local mode (no Cloudflare login)

```bash
pnpm start
```

The R2 bucket is simulated in-memory and starts empty. Use this for code changes and testing — tile requests return 404 until you upload data.

### Option B: Remote mode (real R2 bucket)

```bash
npx wrangler login           # One-time auth
pnpm start -- --remote       # Or: npx wrangler dev --remote
```

Connects to your `protomap-development` R2 bucket on Cloudflare's edge. Upload data first:

```bash
npx wrangler r2 object put protomap-development/my-map.pmtiles --file ./map.pmtiles
```

The worker serves at **http://localhost:8787**.

---

## 📜 Scripts

| Command | Description |
|---|---|
| `pnpm start` | Run worker locally at `localhost:8787` |
| `pnpm deploy` | Deploy to Cloudflare Workers |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | Check for lint issues with Biome |
| `pnpm format` | Format source files with Biome |
| `pnpm build` | Validate Worker config (dry-run deploy) |

---

## 🏗️ Architecture

```
Request  →  index.ts (fetch handler)
               ├── Validate method          ← 405 if not GET
               ├── Parse URL path            ← 404 if invalid route
               ├── Authenticate              ← 401/403 if AUTH_SECRET set
               ├── Check edge cache          ← caches.default
               ├── Read from R2              ← R2Source → PMTiles archive
               ├── Serve tile or TileJSON    ← servePmtilesRequest()
               ├── Store in cache            ← ctx.waitUntil()
               └── Return response           ← with CORS + security headers
```

The worker is intentionally minimal — a single `fetch` handler that delegates to focused modules:

| Module | Responsibility |
|---|---|
| `src/index.ts` | Request routing, orchestration, caching |
| `src/auth/` | HMAC-SHA256 signed URL verification (pluggable version handlers) |
| `src/pmtiles/` | PMTiles parsing, tile serving, content-type mapping |
| `src/storage/` | R2 bucket access implementing pmtiles `Source` interface |
| `src/shared/` | URL parsing, hex encoding, map tile coordinate utilities |
| `src/error/` | Structured error classes with typed codes and HTTP status mapping |

---

## 🔒 Security

- **CORS** — Controlled by `ALLOWED_ORIGINS` env var. Use specific origins in production, never `*` for sensitive data.
- **Method restriction** — Only `GET` is accepted. All other methods return `405 Method Not Allowed`.
- **Input validation** — Paths, tile coordinates, and query parameters are validated before any R2 access.
- **Path traversal protection** — Map names and keys are validated against traversal patterns.
- **No secret leakage** — Secrets are Cloudflare-bound via `wrangler secret put`, never in source.
- **No stack traces** — Production errors return structured JSON without internal details.
- **Constant-time comparison** — HMAC verification uses `timingSafeEqual` to prevent timing attacks.
- **Rate limiting** — For production, configure [Cloudflare Rate Limiting Rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) at the zone level to protect against excessive requests and control R2 egress costs.

---

## ⚠️ Limitations

- **CORS preflight** — `OPTIONS` requests are not handled. Tile requests are simple `GET` requests that do not trigger preflight in browsers.
- **Auth disabled by default** — Signed URL authentication must be explicitly enabled by setting `AUTH_SECRET`.
- **Cache in dev** — Edge caching is disabled during local development. Production automatically uses `caches.default`.
- **Compression** — Gzip-deflated tiles are supported. Brotli and Zstd are not currently supported (return `501 Not Implemented`).
- **No analytics** — This worker does not collect usage data. Monitor via Cloudflare dashboard and R2 logs.

---

## 🤝 Contributing

Contributions are welcome! This project follows [Conventional Commits](https://www.conventionalcommits.org/) — commit messages are linted via commitlint + husky.

```bash
# Before pushing, make sure checks pass
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

- **Bug reports & feature requests** — Open a [GitHub issue](https://github.com/your-org/protomap-worker/issues/new)
- **Pull requests** — Please open an issue first to discuss significant changes, and keep tests updated
- **Code style** — [Biome](https://biomejs.dev/) handles formatting and linting. Run `pnpm biome` to auto-fix.
- **Testing** — We use [Vitest](https://vitest.dev/) with `@cloudflare/vitest-pool-workers`. Every meaningful change should include tests.

---

## 📄 License

[BSD-3-Clause](./LICENSE)

© 2021 Protomaps LLC, © 2026 Ventairy Inc.

The PMTiles specification is public domain / CC0. Sample tilesets have their own license terms. The reference implementation and this worker are BSD-3-Clause.

---

<div align="center">
  <sub>Built with ❤️ for self-sovereign map infrastructure.</sub>
</div>
