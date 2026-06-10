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
npx wrangler deploy --env production

# 2. Upload your map data
npx wrangler r2 object put protomap-production/my-map.pmtiles --file ./map.pmtiles

# 3. Open in your app
https://protomap-worker-production.example.com/my-map/{z}/{x}/{y}.mvt
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
- [GitHub Actions (CI/CD)](#-github-actions-cicd)
- [Local Development](#-local-development)
- [Scripts](#-scripts)
- [Architecture](#-architecture)
- [Security](#-security)
- [Limitations](#-limitations)
- [Contributing](#-contributing)
- [License](#-license)

---

## ⚡ Quick Start

Choose your deployment path:

### 🖥️ CLI

Run commands locally to deploy.

#### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/installation)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)

#### 1. Clone & install

```bash
git clone https://github.com/Cataqui/protomap-worker.git
cd protomap-worker
pnpm install
```

#### 2. Create R2 buckets

Create the buckets for each environment you plan to use:

```bash
npx wrangler r2 bucket create protomap-development
npx wrangler r2 bucket create protomap-staging
npx wrangler r2 bucket create protomap-production
```

> If wrangler prompts **"Would you like to add this bucket to your wrangler.jsonc?"**, answer **n** (no) — the buckets are already pre-configured there.

Or create all at once:

```bash
pnpm r2:bucket:create:all
```

#### 3. Deploy the worker

`pnpm deploy` deploys to **development** by default (`protomap-worker-development`). Pass `--env` to target a different environment:

```bash
# Development (default)
pnpm deploy

# Staging
pnpm deploy --env staging

# Production
pnpm deploy --env production
```

#### 4. Set environment secrets (optional)

Secrets like `AUTH_SECRET` must be set per environment before they take effect:

```bash
openssl rand -hex 32                      # Generate a secret
npx wrangler secret put AUTH_SECRET        # Development
npx wrangler secret put AUTH_SECRET --env staging
npx wrangler secret put AUTH_SECRET --env production
```

Non-sensitive variables (`ALLOWED_ORIGINS`, `CACHE_CONTROL`) are pre-configured in `wrangler.jsonc`.

#### 5. Upload a map

```bash
# Development
npx wrangler r2 object put protomap-development/my-map.pmtiles --file ./path/to/your-map.pmtiles
# Staging
npx wrangler r2 object put protomap-staging/my-map.pmtiles --file ./path/to/your-map.pmtiles
# Production
npx wrangler r2 object put protomap-production/my-map.pmtiles --file ./path/to/your-map.pmtiles
```

**Your map is live.** The worker is automatically available at a `*.workers.dev` URL:

```
https://protomap-worker-<environment>.<your-subdomain>.workers.dev/my-map/{z}/{x}/{y}.mvt
```

For a custom domain, see [Custom domain](#custom-domain) in the Deployment section.

> 💡 **Don't have a `.pmtiles` file?** Download a sample from [Protomaps Downloads](https://maps.protomaps.com/builds/) or build one with [Planetiler](https://github.com/onthegomap/planetiler).

---

### 🤖 GitHub Actions

Fork, configure in your browser, run the workflow — your map is live.

#### Prerequisites

- A [GitHub account](https://github.com)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works — R2 includes 5GB free)

---

#### 1. Fork the repository

Go to [Cataqui/protomap-worker](https://github.com/Cataqui/protomap-worker) and click **Fork** in the top-right corner. This creates a copy under your GitHub account.

---

#### 2. Create R2 buckets in Cloudflare

Cloudflare R2 is where your map files are stored. You need one bucket per environment.

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. In the left sidebar, go to **R2** → **Overview**
3. Click **Create bucket** and create `protomap-staging`
4. Click **Create bucket** again and create `protomap-production`

The bucket names must match exactly — the worker looks for these names at deploy time.

---

#### 3. Add a Cloudflare API token

The workflow needs an API token to deploy the worker and manage secrets.

1. In the Cloudflare Dashboard, go to **My Profile** (top right) → **API Tokens**
2. Click **Create Token**
3. Select the **Edit Cloudflare Workers** template
4. Click **Continue to summary**, then **Create Token**
5. **Copy the token now** — you won't see it again

Now go to your fork on GitHub:

1. Open **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token from the step above. |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID. Find it at Dashboard → **Workers & Pages** → look in the right sidebar, or from your R2 endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. |

---

#### 4. Set up GitHub environments and secrets

Your workflow needs GitHub environments with secrets for each target. These give the workflow permission to deploy and sync data.

##### Staging environment

Create the `staging` environment and add secrets:

1. In your fork, go to **Settings** → **Environments**
2. Click **Create environment**, name it `staging`, click **Configure environment**
3. Under **Environment secrets**, click **Add secret** and add:

| Secret | Required? | Description |
|--------|-----------|-------------|
| `AUTH_SECRET` | Optional | HMAC secret for signed URL protection. Generate with `openssl rand -hex 32`. Skip for public tiles. |

##### Production environment

Create the `production` environment and add secrets:

1. In your fork, go to **Settings** → **Environments**
2. Click **Create environment**, name it `production`, click **Configure environment**
3. Under **Environment secrets**, click **Add secret** and add:

| Secret | Required? | Description |
|--------|-----------|-------------|
| `AUTH_SECRET` | Optional | HMAC secret for signed URL protection. Can differ from staging. |
| `R2_ACCESS_KEY_ID` | Required | R2 API access key for cross-bucket sync (staging → production). Create at Cloudflare Dashboard → **R2** → **Overview** → **Manage R2 API Tokens** → **Create API token**. Needs **Read** on `protomap-staging` and **Read & Write** on `protomap-production`. |
| `R2_SECRET_ACCESS_KEY` | Required | Created alongside the access key ID above. |

> **Only deploying to staging?** You only need the staging environment with optional `AUTH_SECRET`. Skip production setup until you're ready.

---

#### 5. Get a .pmtiles file

You need a map file to serve. If you don't have one:

- **Download a sample:** Visit [Protomaps Downloads](https://maps.protomaps.com/builds) and download a small region (e.g., a city or country extract)
- **Or create one:** Use [Planetiler](https://github.com/onthegomap/planetiler) to build from OpenStreetMap data

You'll upload this file in the next step.

---

#### 6. Upload the map to the staging bucket

Upload your `.pmtiles` file to the **staging bucket** — never upload directly to production:

```bash
npx wrangler r2 object put protomap-staging/my-map.pmtiles --file ./map.pmtiles
```

For large files (1 GB+), use rclone or the AWS CLI instead — see [Large file uploads](#large-file-uploads) for details.

If you don't have the CLI available, upload via the Cloudflare dashboard:

1. Go to **R2** → `protomap-staging`
2. Click **Upload files**
3. Select your `.pmtiles` file and upload

> 💡 **Always put data in staging first.** When you deploy to production, the workflow will copy it there automatically.

---

#### 7. Run the workflow

1. In your fork, go to the **Actions** tab
2. Click **Deploy** in the left sidebar
3. Click the **Run workflow** button (dropdown on the right)
4. Choose **staging** or **production** from the dropdown
5. Click **Run workflow**

What happens for each environment:

| Environment | Worker deployed | Data |
|-------------|----------------|------|
| **staging** | `protomap-worker-staging` | Serves from `protomap-staging` bucket directly |
| **production** | `protomap-worker-production` | Syncs `protomap-staging` → `protomap-production`, then serves from production bucket |

The workflow takes about 1–2 minutes. You can watch the live logs in the **Actions** tab.

---

#### 8. (Optional) Add a custom domain

The worker is automatically available at a `*.workers.dev` URL — no dashboard configuration needed. If you want a custom domain instead:

1. Go to [Cloudflare Dashboard → Workers & Pages](https://dash.cloudflare.com/workers)
2. Click your worker (`protomap-worker-staging` or `protomap-worker-production`)
3. Go to **Triggers** → **Add custom domain**
4. Enter a domain like `tiles.yourdomain.com`

---

#### 9. Test your map

The worker is live at:

```
https://protomap-worker-<environment>.<your-subdomain>.workers.dev/my-map/0/0/0.mvt
```

Replace `<your-subdomain>` with your Cloudflare subdomain and `my-map` with your map name (the filename without `.pmtiles`).

> **Can't find your subdomain?** In the Cloudflare Dashboard, go to **Workers & Pages**, click your worker — the URL is shown at the top of the page.

If you set up `AUTH_SECRET`, add the auth query parameters — see the [Authentication](#-authentication-signed-urls) section for how to sign URLs.

**Your map server is live.** Point any map library (Leaflet, MapLibre, etc.) at your worker URL.

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
| `CACHE_CONTROL` | `public, max-age=604800, stale-while-revalidate=86400` | ❌ | `Cache-Control` header value for tile responses. |
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
Cache-Control: public, max-age=604800, stale-while-revalidate=86400
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
# Note: If wrangler prompts **"Would you like to add this bucket to your wrangler.jsonc?"**, answer **n** (no) — the buckets are already pre-configured there.
npx wrangler r2 bucket create protomap-production

# 4. Upload your map
npx wrangler r2 object put protomap-production/my-map.pmtiles --file ./map.pmtiles

# 5. Deploy
pnpm deploy --env production
```

### Custom domain

In your Cloudflare dashboard, add a route or custom domain to your worker for a clean URL like `tiles.yourdomain.com`.

### Large file uploads

For `.pmtiles` files over 1 GB, `npx wrangler r2 object put` lacks progress reporting and cannot resume interrupted uploads. Use `rclone` or the AWS CLI instead — both support multipart uploads, progress bars, and resume.

#### Option 1: rclone

[Install rclone](https://rclone.org/install/) and configure a Cloudflare R2 remote:

```bash
rclone config create r2 s3 \
  provider=Cloudflare \
  access_key_id="<R2_ACCESS_KEY_ID>" \
  secret_access_key="<R2_SECRET_ACCESS_KEY>" \
  endpoint="https://<ACCOUNT_ID>.r2.cloudflarestorage.com" \
  force_path_style=true \
  no_check_bucket=true
```

Then upload a file with progress:

```bash
# Upload to staging
rclone copy ./my-map.pmtiles r2:protomap-staging/ --progress

# Upload to production (not recommended — use the bucket sync instead)
rclone copy ./my-map.pmtiles r2:protomap-production/ --progress
```

To get your R2 credentials: Cloudflare Dashboard → **R2** → **Overview** → **Manage R2 API Tokens** → **Create API token**.

To find your `ACCOUNT_ID`: Cloudflare Dashboard → **Workers & Pages** → look in the right sidebar.

#### Option 2: AWS CLI

[Install the AWS CLI](https://aws.amazon.com/cli/) and configure it for Cloudflare R2:

```bash
aws configure set aws_access_key_id "<R2_ACCESS_KEY_ID>"
aws configure set aws_secret_access_key "<R2_SECRET_ACCESS_KEY>"

aws s3 cp ./my-map.pmtiles s3://protomap-staging/ \
  --endpoint-url "https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
```

AWS CLI shows a progress bar by default.

---

## 🤖 GitHub Actions (CI/CD)

This repository includes two GitHub Actions workflows for automated quality checks and deployment. You don't need to use them — everything works fine with manual `pnpm` commands. But if you want automated testing and deployment on every push, here's how to set them up.

### Workflows overview

| Workflow | File | Runs on | What it does |
|----------|------|---------|--------------|
| **Code Quality** | `.github/workflows/code-quality.yml` | Push/PR to `development`, `staging`, `main` | `typecheck` → `lint` → `test` → `build` — then starts the worker locally with `wrangler dev` and verifies it responds |
| **Deploy** | `.github/workflows/deploy.yml` | Push to `staging`, `main` + `workflow_dispatch` | Deploys Worker code, optionally sets `AUTH_SECRET`, and syncs R2 buckets (staging → production) |

### Branch strategy

The workflows assume a three-branch pipeline, with optional manual dispatch:

```
┌─ workflow_dispatch ─────────────────────────────────────────┐
│  Choose environment (staging/production), click Run — done  │
└──────────────────────────────────────────────────────────────┘

development  →  staging  →  main
     │              │           │
     │              ├── Deploy Worker to staging (protomap-worker-staging)
     │              │
     │              └── Push to main:
     │                   ├── Sync R2 buckets (protomap-staging → protomap-production)
     │                   └── Deploy Worker to production (protomap-worker-production)
     │
     └── Code Quality runs on every branch
```

- **development** — Active development. Code Quality checks run on every push/PR.
- **staging** — Pre-production. Code Quality + Worker deploy to staging environment.
- **main** — Production. Code Quality + bucket sync + Worker deploy to production environment.
- **Manual dispatch** — Triggered from the Actions tab. Select an environment to deploy without pushing code. `AUTH_SECRET` is optional — skip it for a public worker, or set it in the environment secrets for signed URL protection.

### What deploys

The **Deploy** workflow uses [dorny/paths-filter](https://github.com/dorny/paths-filter) to only deploy the Worker when relevant files change:

```yaml
worker:
  - "src/**"
  - "wrangler.jsonc"
  - "package.json"
  - "pnpm-lock.yaml"
  - "tsconfig.json"
```

If only documentation or unrelated files change, the Worker deploy step is skipped. The bucket sync step (on `main`) always runs when there's a push to `main`, regardless of which files changed.

### Required GitHub secrets

Set these in your repository at **Settings → Secrets and variables → Actions**:

| Secret | Scope | Used in | Description |
|--------|-------|---------|-------------|
| `CLOUDFLARE_API_TOKEN` | Repository | Both workflows | Cloudflare API token with Workers + R2 permissions. Create in [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens). Use the "Edit Cloudflare Workers" template, or create a custom token with permissions: `Workers Scripts:Edit`, `Workers Routes:Edit`, `Account Scope`. |
| `CLOUDFLARE_ACCOUNT_ID` | Repository | Deploy workflow (bucket-sync job) | Your Cloudflare account ID. Find it in the Cloudflare Dashboard → Workers & Pages → right sidebar, or from your R2 endpoint URL: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. |
| `AUTH_SECRET` | `staging` environment | Deploy workflow (staging-deploy job) | HMAC secret for staging (optional — skip for a public worker). Generate with `openssl rand -hex 32`. Can differ from production. |
| `AUTH_SECRET` | `production` environment | Deploy workflow (production-deploy job) | HMAC secret for production (optional — skip for a public worker). Generate with `openssl rand -hex 32`. |
| `R2_ACCESS_KEY_ID` | `production` environment | Deploy workflow (bucket-sync job) | R2 API access key ID for cross-bucket sync. Create in Cloudflare Dashboard → R2 → Manage R2 API Tokens. Needs **Read** on `protomap-staging` and **Read & Write** on `protomap-production`. |
| `R2_SECRET_ACCESS_KEY` | `production` environment | Deploy workflow (bucket-sync job) | R2 API secret key, created alongside the access key ID above. |

> **Why are some secrets environment-scoped?** Staging and production should use different `AUTH_SECRET` values. R2 keys are only needed for the bucket-sync job which runs on `main` (production). `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are shared across all workflows and live at the repository level.

### GitHub environments

Create two environments in **Settings → Environments**:

| Environment | Secrets to add | Notes |
|-------------|---------------|-------|
| `staging` | `AUTH_SECRET` (optional) | No protection rules needed |
| `production` | `AUTH_SECRET` (optional), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Optionally add required reviewers for safety |

### Required R2 buckets

The workflows reference these bucket names. Create them manually before your first deploy:

```bash
npx wrangler r2 bucket create protomap-development
npx wrangler r2 bucket create protomap-staging
npx wrangler r2 bucket create protomap-production
```

> If wrangler prompts **"Would you like to add this bucket to your wrangler.jsonc?"**, answer **n** (no) — the buckets are already pre-configured there.

Or using the pnpm scripts:

```bash
pnpm r2:bucket:create:all
```

### Setting up a fork from scratch

#### Quick path (workflow_dispatch)

The simplest way to get started:

1. **Fork** the repository to your GitHub account
2. **Add `CLOUDFLARE_API_TOKEN`** as a repository secret
3. **(Optional)** Create the `staging` environment with `AUTH_SECRET`
4. **Go to Actions → Deploy → Run workflow** — done

No local setup, no branches, no bucket creation. See the [GitHub Actions Quick Start](#-github-actions) for details.

#### Full pipeline (push-based)

For a full three-branch pipeline with automatic deploy on push:

1. **Fork and clone**
   ```bash
   git clone https://github.com/your-username/protomap-worker.git
   cd protomap-worker
   pnpm install
   ```

2. **Create the branches**
   ```bash
   git checkout -b development
   git push -u origin development
   git checkout -b staging
   git push -u origin staging
   git checkout main
   git push -u origin main
   ```

3. **Create R2 buckets** (see above)

4. **Set GitHub secrets** (see table above)

5. **Create GitHub environments** (see above)

6. **Push code** — the first push to each branch triggers the workflows. Monitor them at **Actions** tab.

### Skipping or disabling the workflows

**Don't want CI/CD at all?** Simply delete the workflow files:

```bash
rm -rf .github/workflows/
```

Everything else works fine — deploy manually with `pnpm deploy`.

**Want some workflows but not others?** Delete the file you don't want, or modify the `branches:` filter in the workflow file.

**Want the Deploy workflow but without the bucket sync?** Remove the `bucket-sync` job from `.github/workflows/deploy.yml`.

**Want only Code Quality (no deploy)?** Delete `.github/workflows/deploy.yml` and keep `.github/workflows/code-quality.yml`.

**Want Deploy on your own branch names?** Edit the `branches:` lists in the workflow files. For example, replace `[development, staging, main]` with `[dev, prod]`.

### Production data flow

For security, production data is never written to directly. The flow is always:

1. **Upload your `.pmtiles` files to the staging bucket** (`protomap-staging`)
2. **Run the Deploy workflow** (push to `main` or trigger manually)
3. **The workflow syncs staging → production** via server-side copy

This ensures:
- **No direct production access** — Only the CI/CD pipeline can write to the production bucket
- **Audit trail** — Every production change goes through GitHub, leaving a traceable record
- **Rollback** — Re-upload the previous file to staging and re-run the workflow

### How the bucket sync works

On push to `main`, the Deploy workflow runs an `rclone copy` from the staging R2 bucket to the production R2 bucket:

```bash
rclone copy r2:protomap-staging r2:protomap-production --verbose --transfers 4 --checkers 8
```

- Both buckets are configured under a **single rclone remote**, enabling rclone to use R2's `CopyObject` API (server-side copy). Data stays within Cloudflare's network — no bytes flow through the GitHub Actions runner.
- It skips files that already exist in production (same name, same size) — only new or changed files are transferred.
- Since the copy happens server-side, large `.pmtiles` files (1–30 GB) copy in **seconds** rather than minutes.
- The sync runs on **every push to `main`**, even if only Worker code changed. The scan is fast when nothing new exists (< 1 minute).

If you'd rather promote data manually (e.g., upload directly to both buckets), remove or disable the `bucket-sync` job.

### How the Worker deploy works

Both staging and production deploys use [cloudflare/wrangler-action](https://github.com/cloudflare/wrangler-action). The action:

1. Reads `CLOUDFLARE_API_TOKEN` for authentication
2. Sets `AUTH_SECRET` via the Wrangler `secrets` API (only if the secret is configured)
3. Runs `wrangler deploy --env <environment>` — on push, only when Worker-relevant files have changed; on `workflow_dispatch`, always deploys
4. Deploys to the Worker name defined in `wrangler.jsonc`:
   - Staging: `protomap-worker-staging`
   - Production: `protomap-worker-production`

### Manual Workflow triggers

The Deploy workflow supports `workflow_dispatch` for manual triggers from the **Actions** tab:

```yaml
workflow_dispatch:
  inputs:
    environment:
      description: "Environment to deploy"
      required: true
      default: "staging"
      type: choice
      options:
        - staging
        - production
```

To trigger manually:

1. Go to the **Actions** tab in your repository
2. Select **Deploy** from the left sidebar
3. Click **Run workflow**
4. Pick **staging** or **production**
5. Click **Run workflow**

The workflow sets `AUTH_SECRET` only if configured, and deploys the worker — no code changes needed.

### Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| `Code Quality` fails at `typecheck` | TypeScript error in code. Run `pnpm typecheck` locally to diagnose. |
| `Code Quality` fails at `lint` | Biome lint error. Run `pnpm lint` locally. |
| `Code Quality` fails at `test` | Test failure. Run `pnpm test` locally. |
| `Deploy` fails at "Set AUTH_SECRET" | Missing `AUTH_SECRET` in the environment secrets. Check Settings → Environments. |
| `Deploy` fails at "Deploy Worker" | Missing or invalid `CLOUDFLARE_API_TOKEN`. Verify the token has Workers permissions. |
| `bucket-sync` fails at "Configure rclone remotes" | Missing `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, or `CLOUDFLARE_ACCOUNT_ID`. Check production environment secrets. |
| `bucket-sync` times out | Extremely large files (>5 GB) may still encounter edge-case timeouts. Server-side copy is used by default, which is usually instant. |
| Workflow doesn't run on push | Check that the branch name matches the `branches:` list in the workflow file. |

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
| `pnpm r2:bucket:create:dev` | Create the development R2 bucket |
| `pnpm r2:bucket:create:staging` | Create the staging R2 bucket |
| `pnpm r2:bucket:create:prod` | Create the production R2 bucket |
| `pnpm r2:bucket:create:all` | Create all R2 buckets |

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
