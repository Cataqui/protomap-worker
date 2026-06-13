# AGENTS.md — Protomap Worker

## 0. Mission & Core Philosophy

You are operating inside the **Protomap Worker** repository.

This repository provides a production-ready **Cloudflare Worker** for serving self-hosted vector maps, including [Protomaps](https://protomaps.com/) `.pmtiles` tile data and font glyphs (`.pbf`), based on the default worker patterns from the Protomaps / PMTiles ecosystem, but adapted for a cleaner Cloudflare-native deployment experience.

The goal is to be the go-to self-hosted map server — making it extremely easy to deploy a secure, reliable map-serving worker and start serving tiles, fonts, and metadata with minimal setup.

This project optimizes for:

- **Security by default**
- **Excellent developer experience**
- **Excellent AI agent experience**
- **Strict test coverage**
- **Simple deployment**
- **Low operational complexity**
- **Clear public API behavior**
- **Open-source maintainability**

Every change must preserve those goals.

---

## 1. Repository Identity

This is a **Cloudflare Worker** repository.

It is not a frontend application, mobile app, backend monolith, or general-purpose map-rendering framework. Avoid adding abstractions that make the worker harder to audit, deploy, or operate.

The worker’s primary responsibility is to expose map tiles and font glyphs through Cloudflare’s runtime safely and efficiently.

Expected concerns include:

- Cloudflare Worker request handling
- PMTiles file access
- Tile serving
- Font glyph serving
- TileJSON / metadata serving when supported
- HTTP caching (configurable for tiles, hardcoded immutable for glyphs)
- CORS behavior
- Security headers
- Environment bindings
- Deployment configuration
- Testable edge-runtime logic

---

## 2. Technical Stack & Environment

### Runtime

- **Runtime:** Cloudflare Workers
- **Language:** TypeScript
- **Package manager:** `pnpm`
- **Deployment tool:** Wrangler
- **Primary config:** `wrangler.jsonc`

### Dependency Determinism

`pnpm-lock.yaml` is the absolute source of truth for dependency resolution.

Rules:

- Never add `pnpm-lock.yaml` to `.gitignore`.
- Commit `pnpm-lock.yaml` whenever dependencies change.
- Do not manually edit lockfile contents.
- Do not switch package managers.
- Do not introduce `npm`, `yarn`, or `bun` lockfiles.

### Environment Variables

Local runtime configuration belongs in the root `.dev.vars` file.

Rules:

- `.dev.vars` must remain local-only and uncommitted.
- `.dev.vars.example` is the committed template.
- Any new required environment variable must be added to `.dev.vars.example`.
- Any new required environment variable must be documented in `README.md`.
- Secrets must never be hardcoded in source, tests, examples, or documentation.

### Cloudflare Bindings

Cloudflare bindings must be explicit and documented.

Examples may include:

- R2 buckets
- KV namespaces
- Durable Objects
- service bindings
- environment variables
- compatibility flags

When adding or changing a binding:

1. Update the Worker types.
2. Update Wrangler configuration.
3. Update `.dev.vars.example` when applicable.
4. Update `README.md`.
5. Add or update tests covering the behavior.

---

## 3. Architecture Principles

### Keep the Worker Small

This repository should remain focused on serving `.pmtiles` and font glyphs through Cloudflare Workers.

Do not introduce:

- unnecessary frameworks
- large routing layers
- server-side rendering systems
- database abstractions
- speculative plugin architectures
- unrelated map rendering engines
- frontend build systems unless explicitly required

Prefer simple functions, explicit types, and direct Cloudflare Worker APIs.

### Separate Core Logic from Runtime Glue

Request parsing, validation, PMTiles access, glyph serving, response generation, and cache behavior should be testable without requiring a live Cloudflare deployment.

Prefer this structure when practical:

- Worker entrypoint: minimal `fetch` handler
- Request router: maps requests to actions (`/regions/*`, `/glyphs/*`)
- PMTiles service: reads map data
- Glyph service: reads font files from R2
- Response helpers: headers, errors, caching
- Validation helpers: path, query, method, range handling
- Tests: unit and integration coverage for each behavior

### Public Behavior Is a Contract

Treat the following as public API boundaries:

- URL structure
- HTTP methods
- response status codes
- response headers
- CORS behavior
- cache semantics (configurable for tiles, hardcoded immutable for glyphs)
- TileJSON response shape
- glyph URL structure and response format
- error response shape
- environment variable names
- Cloudflare binding names
- documented deployment commands

Do not rename, remove, or change these without analyzing downstream impact and updating tests and documentation.

---

## 4. Security Requirements

This project is open source and must be secure by default.

### Required Security Posture

All request handling must assume hostile input.

Validate:

- path parameters
- query parameters
- map names
- tile coordinates
- glyph paths
- file keys
- range headers
- origin headers
- content negotiation headers

Do not allow:

- path traversal
- arbitrary bucket key access
- unrestricted proxying
- secret leakage
- stack traces in production responses
- unbounded memory reads
- unbounded remote fetches
- unsafe dynamic imports
- broad CORS defaults without intent
- logging of secrets, tokens, signed URLs, or sensitive request data

### Error Handling

Errors must be safe, structured, and intentional.

Rules:

- Return clear HTTP status codes.
- Avoid leaking internal implementation details.
- Do not expose stack traces to clients.
- Log enough context for debugging without exposing secrets.
- Prefer typed error helpers over ad-hoc thrown strings.

### Headers

When applicable, responses should intentionally define:

- `Content-Type`
- `Cache-Control`
- `ETag` or equivalent cache validators when supported
- `Access-Control-Allow-Origin`
- `Vary`
- security-relevant headers for non-tile responses

CORS must be explicit. Do not use permissive CORS unless the README documents why it is required.

---

## 5. Testing Protocol

Untested business logic is considered broken code.

The test environment must be strict enough to minimize regressions before deployment.

### Required Testing Standards

Every meaningful change must include tests.

At minimum, test:

- request routing
- invalid methods
- invalid paths
- invalid glyph paths (traversal, null bytes, non-.pbf)
- invalid tile coordinates
- missing maps
- malformed range headers
- CORS behavior
- cache headers
- content types
- error responses
- PMTiles metadata access
- tile response behavior
- glyph response behavior (200, 404, 400)
- environment binding failures
- edge cases around empty or missing configuration

### Test Types

Use the smallest useful test type:

- **Unit tests** for pure logic
- **Integration tests** for Worker request/response behavior
- **Fixture-based tests** for PMTiles behavior
- **Regression tests** for every bug fix

Tests should be deterministic and should not require live Cloudflare infrastructure unless explicitly marked as deployment/e2e tests.

### Test Fixtures

Fixtures must be small and intentional.

Rules:

- Do not commit large `.pmtiles` files unless explicitly approved.
- Prefer minimal fixtures.
- Document fixture origin and purpose.
- Avoid copyrighted or unclear-license map data.
- Keep tests fast enough to run locally and in CI.

### Required Checks Before Completion

Before considering a task complete, run the relevant checks from `package.json`.

For typical changes, this should include:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

If one of these scripts does not exist, inspect `package.json` and use the closest available equivalent. Do not invent nonexistent scripts in status reports.

---

## 6. Developer Experience Requirements

This repository must be easy for humans and agents to use.

### README Is Authoritative

The root `README.md` is the authoritative source for:

- project purpose
- prerequisites
- setup
- environment variables
- local development
- testing
- deployment
- Cloudflare configuration
- examples
- troubleshooting

Whenever you modify tooling, dependencies, setup steps, environment variables, deployment behavior, or public API behavior, update `README.md`.

### Commands Must Be Discoverable

All common workflows should be available as `pnpm` scripts when practical:

- install
- dev
- test
- typecheck
- lint
- format
- build
- deploy
- preview

Do not add scripts that are broken, redundant, or undocumented.

### Examples Must Work

Any example in the README, comments, fixtures, or docs must be kept valid.

Broken examples are considered bugs.

---

## 7. Agent Operational Rules

When executing modifications inside this repository as an AI agent, strictly follow these rules.

### 7.1 Context Enforcement

This file takes precedence over generic coding preferences, global model defaults, or speculative architectural habits.

If repository files conflict with this document, inspect the conflict and preserve the safer, more explicit behavior unless the user instructs otherwise.

### 7.2 Inspect Before Editing

Before making non-trivial changes:

1. Inspect the relevant files.
2. Understand the existing structure.
3. Check `package.json` scripts.
4. Check existing tests.
5. Check README requirements.
6. Identify public API boundaries affected by the change.

Do not rewrite large areas of code without first understanding current behavior.

### 7.3 Minimal Diffs

Prefer the smallest correct change.

Do not perform opportunistic refactors, formatting churn, dependency upgrades, or file moves unless they are required for the task.

### 7.4 No Dead Code

Do not leave behind:

- commented-out logic
- unused imports
- unused variables
- unused types
- experimental branches
- speculative abstractions
- TODOs without immediate value
- duplicate helpers

Every line must serve the current objective.

### 7.5 Dependency Lockdown

Do not add external dependencies unless explicitly justified.

Before adding a dependency, verify:

1. The need cannot be met with existing dependencies or native platform APIs.
2. The package is maintained.
3. The package has an acceptable license.
4. The package is appropriate for Cloudflare Workers.
5. The security and bundle-size trade-offs are acceptable.

Any dependency change must update:

- `package.json`
- `pnpm-lock.yaml`
- tests
- README when user-facing or setup-related

### 7.6 No Silent Public Contract Changes

Never modify, rename, or delete public API boundaries without analyzing downstream impact.

This includes:

- routes
- parameters
- response formats
- status codes
- headers
- environment variables
- binding names
- deployment commands
- documented examples

If a breaking change is necessary, document it clearly and update tests and README.

### 7.7 Fail Safely

If a structural change cannot be safely implemented, halt and document:

- the exact technical roadblock
- what was attempted
- why the change is unsafe
- the trade-offs required to move forward

Do not guess through security-sensitive or deployment-sensitive changes.

### 7.8 Keep User-Facing Docs in Sync

Any change affecting setup, scripts, deployment, environment variables, public routes, examples, or troubleshooting must update `README.md`.

If README updates are intentionally not made, explain why.

### 7.9 Prefix Private Functions with Underscore

Functions that are used only within a single module (i.e., not exported) must be prefixed with `_`. This makes it immediately clear which functions are internal implementation details and which are part of the module's public interface. Private functions must be placed at the bottom of the file, after all exported functions and types.

```typescript
// Good: internal helper is prefixed
function _hexToBytes(hex: string): Uint8Array | null { ... }
function _timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean { ... }
export async function authenticateTileRequest(url: URL, secret: string): Promise<AuthResult> { ... }

// Bad: no visual distinction between public and private
function hexToBytes(hex: string): Uint8Array | null { ... }
export async function authenticate(url: URL, secret: string): Promise<AuthResult> { ... }
```

Exceptions:
- Class methods (use TypeScript `private` keyword instead).
- Functions intended to be tested directly (test files import them by name — prefixing with `_` adds friction; prefer testing through the public API or make an exception with a comment).

### 7.10 Prefer Inline Types Over Single-Use Interfaces

Do not define a named `interface` (or `type`) if it is used in only one location. Prefer an inline type literal instead.

This keeps the definition next to its usage and avoids polluting the module's type namespace with single-use names.

```typescript
// Good: inline type literal, used once
async function authenticate(url: URL, secret: string): Promise<
  { ok: true } | { ok: false; status: 401 | 403; message: string }
> { ... }

// Bad: named interface used in exactly one place
interface AuthResult {
  ok: boolean;
  status?: number;
  message?: string;
}
async function authenticate(url: URL, secret: string): Promise<AuthResult> { ... }
```

Exceptions:
- The type is exported and part of the module's public API contract.
- The type is used in two or more distinct locations.
- An inline type would harm readability due to complexity (use judgement — prefer extracting only when it genuinely helps).

### 7.11 Prefix Interfaces with I in Separate Files

When a named interface or type is justified (used in multiple locations per 7.10 exceptions), it must be placed in a dedicated file:

- **Interfaces** (e.g., `AuthHandler`): prefixed with `I`, go in `{domain}.interface.ts`.
- **Types** (e.g., `AuthResult`): no `I` prefix, go in `{domain}.type.ts`.

This makes interface definitions discoverable and signals at a glance that a file contains type contracts, not implementation logic.

```typescript
// src/auth-version-handler.interface.ts
export interface AuthHandler {
  authenticate(url: URL, secret: string): Promise<AuthResult>;
}
```

```typescript
// src/auth-result.type.ts
export type AuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; message: string };
```

```typescript
// src/auth.ts
import type { AuthResult } from "./auth-result.type";
import type { AuthHandler } from "./auth-version-handler.interface";

class V1AuthHandler implements AuthHandler { ... }
```

### 7.12 Use Highly Descriptive Names

Class and function names must be specific enough to identify their domain and purpose without requiring the reader to inspect imports or surrounding context. Names like `Handler`, `Service`, `Manager`, or generic abbreviations are ambiguous and should be avoided.

```typescript
// Good: domain + purpose are clear
class V1AuthHandler implements AuthHandler { ... }
function _computeAuthHmac(secret: string, message: string): Promise<Uint8Array> { ... }
async function authenticateTileRequest(url: URL, secret: string): Promise<AuthResult> { ... }

// Bad: too generic, requires context to understand
class V1Handler implements IVersionHandler { ... }
function _computeHmac(...) { ... }
export async function authenticate(...) { ... }
```

### 7.13 Export Utils as Namespace Objects

Utility modules (files named `*.utils.ts`) must export their functions through a single named namespace object with `as const`, rather than as individual named exports.

This keeps imports clean and predictable — consumers always import the namespace object and access members through it.

```typescript
// Good: namespace object export
function filterUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export const ObjectUtils = {
  filterUndefined,
} as const;

// Usage: import { ObjectUtils } from "./object.utils";
//         ObjectUtils.filterUndefined(obj)
```

```typescript
// Bad: individual named exports
export function filterUndefined() {}
```

Exceptions:
- A utils file that exports only types alongside functions may keep type exports separate (types are not functions and do not belong in the runtime namespace object).
- Re-exports from `index.ts` or barrel files that forward a utils namespace are fine.

---

## 8. Cloudflare Worker Guidelines

### Request Handling

The Worker must handle requests predictably.

Rules:

- Reject unsupported methods.
- Validate route parameters.
- Normalize paths carefully.
- Avoid ambiguous route matching.
- Return explicit `404` responses for missing resources.
- Return explicit `400` responses for invalid input.
- Return explicit `405` responses for unsupported methods.
- Avoid throwing raw runtime errors for expected client mistakes.

### Runtime Compatibility

Cloudflare Workers do not provide a full Node.js runtime by default.

Do not use Node-only APIs unless the repository explicitly enables and tests compatibility.

Be careful with:

- filesystem access
- Node streams
- Buffer usage
- crypto APIs
- process globals
- large in-memory operations

Prefer Web Platform APIs supported by Cloudflare Workers.

### Performance

Map tile serving must be efficient.

Avoid:

- reading entire large PMTiles files when a range read is enough
- unnecessary serialization
- repeated metadata parsing without caching
- unbounded in-memory caches
- blocking operations
- avoidable cold-start overhead

Performance optimizations must preserve correctness and testability.

---

## 9. PMTiles / Protomaps Guidelines

PMTiles behavior must be handled carefully because map clients depend on stable semantics.

When working with PMTiles:

- Preserve correct tile addressing.
- Validate tile coordinate ranges.
- Preserve correct MIME types.
- Preserve metadata behavior.
- Preserve range request behavior where applicable.
- Avoid corrupting binary responses.
- Do not transform tile data unless explicitly required.
- Add regression tests for any PMTiles parsing or serving fix.

Any change to map-serving behavior must include tests using realistic fixtures or mocks.

### Glyph Serving Guidelines

Font glyphs are served directly from R2 with minimal processing:

- Preserve correct `application/x-protobuf` content type.
- Hardcode immutable cache headers — font files never change.
- Validate glyph paths for security (no `..`, null bytes, non-`.pbf` extensions).
- Return `404 Not Found` for missing glyphs (not `204` or `500`).
- Do not transform or re-encode glyph data.

---

## 10. Documentation Standards

Documentation should be clear enough for a first-time user to deploy the Worker successfully.

Prefer documentation that includes:

- prerequisites
- installation steps
- Cloudflare setup
- environment variable table
- local development commands
- test commands
- deployment commands
- example map URL
- example tile URL
- troubleshooting
- security notes
- limitations

Do not document aspirational features as if they already exist.

---

## 11. Open Source Maintenance Standards

This repository should be easy to review and contribute to.

Agent changes should preserve:

- clear commit-sized diffs
- readable code
- meaningful tests
- updated docs
- consistent formatting
- stable public behavior

When adding new files, ensure they have a clear purpose.

When adding comments, explain why the code exists, not what the code mechanically does.

---

## 12. Pull Request Completion Checklist

Before declaring work complete, verify:

- [ ] The change matches the repository mission.
- [ ] The implementation is minimal and focused.
- [ ] Public API behavior is preserved or documented.
- [ ] Security implications were considered.
- [ ] Input validation is covered.
- [ ] Tests were added or updated.
- [ ] Relevant checks were run.
- [ ] README was updated when needed.
- [ ] `.dev.vars.example` was updated when needed.
- [ ] `pnpm-lock.yaml` is updated when dependencies changed.
- [ ] No dead code was left behind.
- [ ] No secrets or sensitive data were introduced.
- [ ] Cloudflare Worker runtime constraints were respected.

---

## 13. Non-Goals

Do not turn this repository into:

- a generic GIS platform
- a full map-rendering engine
- a frontend map viewer
- a tile-generation pipeline
- a data ingestion framework
- a multi-cloud abstraction layer
- a general proxy server

The project should remain a focused, secure, easy-to-deploy Cloudflare Worker for serving Protomaps `.pmtiles` and font glyphs.

---

## 14. Final Principle

Optimize for boring, secure, well-tested infrastructure.

A small, predictable Worker with excellent tests and documentation is better than a clever system that is harder to deploy, audit, or maintain.
