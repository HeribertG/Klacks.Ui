# Klacks.UI

[DeepWiki documentation for this repository](https://deepwiki.com/HeribertG/Klacks.Ui)
[![Tests](https://github.com/HeribertG/Klacks.Ui/actions/workflows/tests.yml/badge.svg)](https://github.com/HeribertG/Klacks.Ui/actions/workflows/tests.yml)
[![CodeQL](https://github.com/HeribertG/Klacks.Ui/actions/workflows/codeql.yml/badge.svg)](https://github.com/HeribertG/Klacks.Ui/actions/workflows/codeql.yml)

Web frontend of the Klacks ecosystem for workforce scheduling and deployment planning
(Personaleinsatzplanung). Built with **Angular 22**, **TypeScript 6** and **Angular Signals**,
rendering the large grids on **HTML5 Canvas** and receiving live updates over **SignalR**.

The application is structured in four layers (presentation / application / domain /
infrastructure), talks to the Klacks backend over a REST API, and ships two optional feature
plugins as separate Angular libraries.

> Architecture documentation lives in the **DeepWiki** linked above, which is generated from
> this repository. To steer what it documents, see [`.devin/wiki.json`](.devin/wiki.json).

## Tech stack

Versions as declared in `package.json`.

| Area | Technology |
| --- | --- |
| Framework | Angular 22 (`@angular/core` `^22.0.2`, CLI / build `^22.0.3`) |
| Language | TypeScript `^6.0.2` |
| Reactivity | Angular Signals (plus zone-based change detection via `provideZoneChangeDetection()`) |
| Real-time | `@microsoft/signalr` `^8.0.7` |
| Grid rendering | HTML5 Canvas 2D |
| UI / styling | Bootstrap `^5.3.3`, `@ng-bootstrap/ng-bootstrap` `^21.0.0`, SCSS (`sass` `^1.85.0`) |
| i18n | `@ngx-translate/core` `^15.0.0` with runtime JSON loading |
| Diagrams / editor | `fabric` `^7.4.0` (floor plan plugin), `jspdf` `^4.2.0`, `file-saver` `^2.0.5` |
| Speech | `@huggingface/transformers` `^3.8.1` (local Whisper STT) |
| Dates | `date-fns` `^4.1.0` |
| Sanitizing | `dompurify` `^3.4.12` |
| Tests | Vitest `^4.0.14` with jsdom `^27.2.0` |
| Lint | ESLint `^9.28.0` with `angular-eslint` `^22.0.0` |

## Requirements

- **Node.js 22.x** — the version pinned by CI (`.github/workflows/tests.yml`) and by the Docker
  build (`node:22-alpine`). There is no `engines` field and no `.nvmrc`; Node 22 is the reference.
- npm (the repo commits a `package-lock.json`).
- A running Klacks backend for real data. Default local endpoints are in
  `src/environments/environment.ts`.

`.npmrc` sets `legacy-peer-deps=true` (one peer dependency has no Angular 22 release yet).

## Getting started

```bash
npm ci                      # install from the lockfile
npm start                   # dev server (ng serve)
npm run start:ssl           # dev server with TLS on 127.0.0.1
npm run build               # production build -> dist/klacks.ui
npm run watch               # development build in watch mode
```

## Testing

```bash
npm run test:no-report      # ng test --watch=false (cross-platform)
npm run test:watch          # watch mode
npm run test                # full suite + test-results/report.html, opened via explorer.exe (Windows only)
```

Vitest is configured in `vitest.config.ts`: `environment: 'jsdom'`, `pool: 'forks'`, global
setup in `src/test-setup.ts`, 10 s test and hook timeouts. The suite currently holds **402 spec
files** and needs no browser install on CI.

## Project layout

```
src/app/
  presentation/     Angular components, directives, pipes, guards
  application/      orchestration services, cross-cutting concerns, pipes, translate helpers
  domain/           models, enums, interfaces, constants, domain services
  infrastructure/   API clients, SignalR, storage, i18n, scripting, speech
  shared/           shared helpers and pipes
projects/
  klacks-plugin-contracts/    public plugin API (tokens, host interfaces, event stream)
  klacks-plugin-messaging/    messaging plugin
  klacks-plugin-floor-plan/   floor plan editor plugin
src/assets/
  i18n/             de / en / fr / it translation JSON
  docs/             33 in-app manuals, each in all four locales
tools/              build, synonym and wake-word maintenance scripts
scripts/            test runner and HTML test report generator
```

## Architecture

The app bootstraps standalone in `src/main.ts` (`bootstrapApplication` with `appConfig`), while
routing is still NgModule-based: `src/app/app-routing.module.ts` calls
`RouterModule.forRoot(routes, { urlUpdateStrategy: 'eager', preloadingStrategy: PreloadAllModules })`.
Nearly every route is lazy via `loadComponent` / `loadChildren`.

`src/app/app.config.ts` wires the providers, among them:

- `EVENT_BUS_TOKEN` → `EventBus` for decoupled inter-service communication, with
  `DomainEventHandler` bridging domain events.
- `MANAGEABLE_SERVICE_REGISTRY_TOKEN` → `ManageableServiceRegistry` for services with a
  save/reset lifecycle (drives the save bar).
- `ENTITY_STATE_PROVIDER_TOKEN` → `WorkplaceStateService` for workplace state.
- `FILTER_STORAGE_TOKEN` → session-scoped storage implementation.
- `LOADING_INDICATOR_TOKEN` plus `LoadingInterceptor` / `ResponseInterceptor` and a global
  `AppErrorHandler`.

### Authentication and permissions

- JWT handling with `AuthInterceptor` and `TokenRefreshInterceptor`; `SetupRequiredInterceptor`
  redirects to the first-run setup route.
- `AuthGuard`, `permissionGuard` (reads `ROUTE_DATA_REQUIRED_PERMISSION` and the `PERMISSIONS`
  constants / `ROLE_ADMIN`), `InboxGuard`, `featurePluginGuard` (route gated on an enabled
  feature plugin) and `CanDeactivateGuard`.
- OAuth2 login callback at `/oauth2/callback`. See the identity-provider and personal-access-token
  manuals under `src/assets/docs/`.

### Routes

Public: `/login`, `/oauth2/callback`, `/imprint`, `/privacy`, `/error`, `/no-access`,
`/page-not-found`, and the guarded setup route.

Under `/workplace` (shell `HomeComponent`, `AuthGuard` on the parent):

| Route | Purpose |
| --- | --- |
| `/workplace/dashboard` | Dashboard |
| `/workplace/schedule` | Shift planning grid |
| `/workplace/shift`, `/new-shift`, `/edit-shift/:id`, `/cut-shift/:id`, `/container-template/:id` | Shift management, shift cuts, container templates |
| `/workplace/absence` | Absence Gantt |
| `/workplace/client-availability` | Client availability grid |
| `/workplace/client`, `/edit-address[/:id]` | Client address book |
| `/workplace/group`, `/edit-group[/:id]` | Group hierarchy |
| `/workplace/inbox` | Inbox (email module, `InboxGuard`) |
| `/workplace/messaging` | Messaging plugin |
| `/workplace/floor-plan` | Floor plan plugin |
| `/workplace/escalations` | Escalation interventions (admin) |
| `/workplace/period-closing` | Period closing (admin) |
| `/workplace/klacksy-training` | Klacksy training review (admin) |
| `/workplace/profile`, `/workplace/settings` | User profile, settings |

### Canvas rendering

The grids are drawn on a Canvas 2D context rather than in the DOM, which keeps large schedules
responsive. Render services live next to their features, for example
`presentation/shared/grid/` (body cells, row headers), `presentation/shared/time-ruler/`,
`presentation/workplace/schedule/schedule-section/`,
`presentation/workplace/absence-gantt/`,
`presentation/workplace/client-availability/` and the container template map
(`presentation/workplace/shift/container-template/services/map-rendering.service.ts`).

### Real-time communication

`src/app/infrastructure/signalr/` contains the connection layer: `signalr.service.ts`,
`signalr-connection.helper.ts`, `signalr-connection-state.ts`, `signalr-connection-status.service.ts`,
`signalr-group.helper.ts`, `signalr-token.helper.ts`, plus dedicated hubs for email
(`email-signalr.service.ts`) and the assistant (`assistant-signalr.service.ts`).

### KlacksScript

`src/app/infrastructure/scripting/` implements an in-app scripting language: lexer
(`lexicalAnalyser.ts`), syntax analysers split by concern (declarations, control flow,
expressions, statements, built-ins), an opcode set (`opcodes.ts`), scope handling and an
execution context. Run and debug entry point is `script.service.ts`. The language and its
built-ins are documented in the macro and formula manuals under `src/assets/docs/`.

### Klacksy assistant and voice

- Chat assistant: `presentation/aside/assistant-chat/`, service in `presentation/aside/aside.service.ts`,
  navigation control in `domain/services/klacksy/klacksy-navigation.service.ts`, telemetry in
  `klacksy-telemetry.service.ts`.
- Voice shell: `presentation/voice-shell/` (transcript overlay, mic selection).
- Local speech-to-text: `infrastructure/services/speech/whisper-streaming.service.ts` runs the
  ONNX `whisper-tiny` model in the browser through `@huggingface/transformers`, with
  silence-based chunking and earcon feedback — audio is transcribed locally, no audio leaves the
  browser. See the Klacksy training and LLM provider manuals.

### Feature plugins

Two optional features ship as separate Angular libraries and are wired into the shell by name
(`MESSAGING_PLUGIN_NAME`, `FLOOR_PLAN_PLUGIN_NAME` in `domain/constants/feature-plugin.constants.ts`),
loaded via `loadChildren` and gated by `featurePluginGuard`:

- **Messaging** (`projects/klacks-plugin-messaging`)
- **Floor plan editor** (`projects/klacks-plugin-floor-plan`), built on Fabric.js

Both depend on **`projects/klacks-plugin-contracts`**, which exposes the public plugin surface
(`tokens.ts`, `plugin-client.ts`, `plugin-workplace-host.ts`, `plugin-event-stream.ts`,
`plugin-manual-loader.ts`, `plugin-voice.ts`, `plugin-toast.ts`, `plugin-group-selection.ts`).
Contracts must be built before the plugins and the app:

```bash
npx ng build klacks-plugin-contracts
```

## Internationalization

Four locales — **de, en, fr, it** — served as runtime JSON from `src/assets/i18n/` and loaded by
`KlacksTranslateLoader` (`infrastructure/i18n/`). Locale handling additionally covers Angular
locale data (`locale-data-loader.service.ts`), a custom datepicker i18n and week start
(`custom-datepicker-i18n.service.ts`, `datepicker-week-start.service.ts`) and text direction
(`presentation/services/direction.service.ts`).

## In-app manuals

`src/assets/docs/` holds 33 manuals, each as `de.html` / `en.html` / `fr.html` / `it.html`
(132 files), loaded at runtime. Topics include scheduling rules, calendar rules, surcharge modes,
overtime, compensatory rest, period caps, restricted time windows, counter rules, compliance
enforcement, formulas, macros, reports, resource monitor, ERP import, active industries, skill
relations, user administration, identity provider, personal access tokens, LLM providers,
Klacksy training, and one manual per messaging channel: Telegram, WhatsApp, Signal, Slack, Teams,
SMS, Viber, WeChat, LINE, Zalo, Threema and KakaoTalk.

## Build and deployment

Production build output is `dist/klacks.ui`. The `production` configuration sets
`outputHashing: "all"`, swaps in `src/environments/environment.prod.ts`, and enforces budgets
(initial 3 MB warn / 5 MB error, component styles 100 KB warn / 300 KB error).

`Dockerfile` builds in two stages:

1. `node:22-alpine`, pinned to `$BUILDPLATFORM`, installing with `npm ci --legacy-peer-deps`.
2. `nginx:alpine` serving `dist/klacks.ui/browser` with `nginx.conf`.

Build identity is stamped twice via `tools/write-build-info.ts` (`ARG KLACKS_VERSION`,
`ARG KLACKS_BUILD_KEY`): into the bundle (`src/build-info.ts`) and next to `index.html`
(`version.json`). Open tabs poll `version.json` to detect a newer deployment
(`app-version-watch.service.ts`). `nginx.conf` therefore sets `no-cache` for `index.html`,
`/assets/i18n/*.json` and `/assets/docs/*.html`, `no-store` for `version.json`, and immutable
one-year caching for hashed assets.

### CI/CD

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `tests.yml` | push / PR to `main` | Node 22, Vitest headless in jsdom |
| `deploy.yml` | push to `main`, tags `v*`, manual | tests, then build and deploy to Hetzner |
| `codeql.yml` | push / PR to `main`, weekly | CodeQL analysis for JavaScript/TypeScript |

`deploy.yml` ignores changes to `README.md` and `docs/**`, so documentation-only commits do not
trigger a deployment.

## Maintenance tooling

`tools/` contains Node/`tsx` scripts driven from npm, covering build info, wake-word analysis and
the translation synonym pipeline (`scan:targets`, `generate:synonyms`, `generate:declines`,
`validate:synonyms`, `gate:synonyms`, `backtranslate:synonyms`, `wake-word-lint`).

Git hooks run through Husky (`prepare` → `husky`), with a `pre-commit` hook.

## Security

Please report vulnerabilities through GitHub Security Advisories, not public issues — see
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) — Copyright (c) 2025-2026 Heribert Gasparoli.
