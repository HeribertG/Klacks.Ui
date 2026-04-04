# Frontend Plugin Contracts Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ng build klacks-plugin-messaging` work standalone by eliminating all `src/app/...` imports from the plugin via a shared contracts library and InjectionTokens.

**Architecture:** Create `klacks-plugin-contracts` as a minimal Angular library containing only interfaces and InjectionTokens. The messaging plugin depends on contracts (not the main app). The main app provides concrete implementations via route-level providers when lazy-loading the plugin.

**Tech Stack:** Angular 21, InjectionToken, ng-packagr, TypeScript interfaces

---

## File Structure

### New: `projects/klacks-plugin-contracts/`
```
projects/klacks-plugin-contracts/
├── ng-package.json
├── package.json
├── tsconfig.lib.json
├── src/
│   ├── public-api.ts
│   └── lib/
│       ├── tokens.ts                    — All InjectionTokens
│       ├── plugin-workplace-host.ts     — IPluginWorkplaceHost interface
│       ├── plugin-toast.ts              — IPluginToastService interface
│       ├── plugin-manual-loader.ts      — IPluginManualLoader interface
│       ├── plugin-client.ts             — IPluginClient interface (slim)
│       ├── plugin-voice.ts              — IPluginVoiceService + IPluginSpeechService
│       └── plugin-event-stream.ts       — Event stream type
```

### New in messaging plugin:
```
projects/klacks-plugin-messaging/src/lib/shared/
├── settings-list-card/
│   ├── settings-list-card.component.ts
│   ├── settings-list-card.component.html
│   └── settings-list-card.component.scss
└── icons/
    └── trash-icon-red.component.ts
```

### Modified in messaging plugin:
- `src/lib/services/data-messaging.service.ts`
- `src/lib/components/messaging-home/messaging-home.component.ts`
- `src/lib/components/messaging-chat/messaging-chat.component.ts`
- `src/lib/settings/messaging-inbox/messaging-inbox.component.ts`
- `src/lib/settings/messaging-providers/messaging-providers.component.ts`
- `src/lib/settings/messaging-providers/messaging-providers-row/messaging-providers-row.component.ts`
- `ng-package.json`
- `tsconfig.lib.json`
- `src/public-api.ts`

### Modified in main app:
- `angular.json` — add contracts library project
- `tsconfig.json` — add contracts path mapping
- `src/app/app-routing.module.ts` — add providers to messaging route
- New: `src/app/infrastructure/plugins/provide-plugin-host.ts` — host provider factory

---

### Task 1: Create klacks-plugin-contracts library scaffolding

**Files:**
- Create: `projects/klacks-plugin-contracts/ng-package.json`
- Create: `projects/klacks-plugin-contracts/package.json`
- Create: `projects/klacks-plugin-contracts/tsconfig.lib.json`
- Create: `projects/klacks-plugin-contracts/src/public-api.ts` (empty placeholder)
- Modify: `angular.json` — add `klacks-plugin-contracts` project
- Modify: `tsconfig.json` — add path mapping

- [ ] **Step 1: Create ng-package.json**

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/klacks-plugin-contracts",
  "lib": {
    "entryFile": "src/public-api.ts"
  }
}
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "klacks-plugin-contracts",
  "version": "0.0.1",
  "peerDependencies": {
    "@angular/common": "^21.0.0",
    "@angular/core": "^21.0.0",
    "rxjs": "~7.8.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.lib.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/lib",
    "declaration": true,
    "declarationMap": true,
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.spec.ts"]
}
```

- [ ] **Step 4: Create empty public-api.ts placeholder**

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Public API for klacks-plugin-contracts.
 * Defines shared interfaces and InjectionTokens for plugin-host communication.
 */
```

- [ ] **Step 5: Add project to angular.json**

Add to `projects` object in `angular.json`:

```json
"klacks-plugin-contracts": {
  "projectType": "library",
  "root": "projects/klacks-plugin-contracts",
  "sourceRoot": "projects/klacks-plugin-contracts/src",
  "prefix": "lib",
  "architect": {
    "build": {
      "builder": "ng-packagr:build",
      "options": {
        "project": "projects/klacks-plugin-contracts/ng-package.json"
      },
      "configurations": {
        "production": {
          "tsConfig": "projects/klacks-plugin-contracts/tsconfig.lib.json"
        }
      }
    }
  }
}
```

- [ ] **Step 6: Add path mapping to tsconfig.json**

Add to `compilerOptions.paths`:

```json
"klacks-plugin-contracts": [
  "./projects/klacks-plugin-contracts/src/public-api.ts",
  "./dist/klacks-plugin-contracts"
]
```

- [ ] **Step 7: Add tsconfig references**

Add to `references` array in `tsconfig.json`:

```json
{
  "path": "./projects/klacks-plugin-contracts/tsconfig.lib.json"
}
```

- [ ] **Step 8: Verify contracts library builds**

Run: `cd Klacks.Ui && npx ng build klacks-plugin-contracts`
Expected: Build succeeds (empty library)

- [ ] **Step 9: Commit**

```bash
git add projects/klacks-plugin-contracts/ angular.json tsconfig.json
git commit -m "feat: scaffold klacks-plugin-contracts library"
```

---

### Task 2: Define plugin host interfaces and tokens

**Files:**
- Create: `projects/klacks-plugin-contracts/src/lib/plugin-workplace-host.ts`
- Create: `projects/klacks-plugin-contracts/src/lib/plugin-toast.ts`
- Create: `projects/klacks-plugin-contracts/src/lib/plugin-manual-loader.ts`
- Create: `projects/klacks-plugin-contracts/src/lib/plugin-client.ts`
- Create: `projects/klacks-plugin-contracts/src/lib/plugin-voice.ts`
- Create: `projects/klacks-plugin-contracts/src/lib/plugin-event-stream.ts`
- Create: `projects/klacks-plugin-contracts/src/lib/tokens.ts`
- Modify: `projects/klacks-plugin-contracts/src/public-api.ts`

- [ ] **Step 1: Create IPluginWorkplaceHost interface**

File: `projects/klacks-plugin-contracts/src/lib/plugin-workplace-host.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Abstraction for host workplace services that plugins need for page integration.
 * @param setActiveManagerByRoute - Notifies the host which plugin page is active
 * @param setContainerToNormalSize - Resets the layout container to default size
 * @param setSearchVisibility - Shows or hides the search bar
 * @param setSavebarVisibility - Shows or hides the save bar
 * @param setClientSearchMode - Enables or disables client search mode
 * @param clientSelected$ - Emits when a client is selected in search
 */

import { Observable } from 'rxjs';
import { IPluginClient } from './plugin-client';

export interface IPluginWorkplaceHost {
  setActiveManagerByRoute(route: string): void;
  setContainerToNormalSize(): void;
  setSearchVisibility(visible: boolean): void;
  setSavebarVisibility(visible: boolean): void;
  setClientSearchMode(enabled: boolean): void;
  clientSelected$: Observable<IPluginClient>;
}
```

- [ ] **Step 2: Create IPluginClient interface**

File: `projects/klacks-plugin-contracts/src/lib/plugin-client.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Slim client interface exposed to plugins.
 * Contains only the fields plugins typically need for display.
 */

export interface IPluginClient {
  idNumber: number;
  firstName: string;
  name: string;
}
```

- [ ] **Step 3: Create IPluginToastService interface**

File: `projects/klacks-plugin-contracts/src/lib/plugin-toast.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Toast notification service abstraction for plugins.
 * @param showError - Displays an error toast
 * @param showSuccess - Displays a success toast with header
 */

export interface IPluginToastService {
  showError(message: string): void;
  showSuccess(message: string, header: string): void;
}
```

- [ ] **Step 4: Create IPluginManualLoader interface**

File: `projects/klacks-plugin-contracts/src/lib/plugin-manual-loader.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Manual/help documentation loader abstraction for plugins.
 * @param loadManual - Loads a help document by name and language
 */

import { Observable } from 'rxjs';

export interface IPluginManualLoader {
  loadManual(manualName: string, lang: string): Observable<string>;
}
```

- [ ] **Step 5: Create voice/speech interfaces**

File: `projects/klacks-plugin-contracts/src/lib/plugin-voice.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Voice and speech service abstractions for plugins with voice input.
 * @param IPluginVoiceService - Controls voice mode (toggle, status, initialization)
 * @param IPluginSpeechService - Provides speech recognition state
 */

import { Subject } from 'rxjs';

export interface IPluginVoiceCallbacks {
  getInputText: () => string;
  setInputText: (text: string) => void;
  sendMessage: () => Promise<void> | void;
  getIsProcessing: () => boolean;
  detectChanges: () => void;
}

export interface IPluginVoiceService {
  voiceModeEnabled: boolean;
  isListening: boolean;
  isTranscribing: boolean;
  initialize(callbacks: IPluginVoiceCallbacks, destroy$: Subject<void>): void;
  toggleVoiceMode(): Promise<void>;
  disableVoiceMode(): void;
  isUsingWhisper(): boolean;
}

export interface IPluginSpeechService {
  readonly isListening: boolean;
}
```

- [ ] **Step 6: Create event stream type**

File: `projects/klacks-plugin-contracts/src/lib/plugin-event-stream.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Type definition for the plugin event stream (SignalR events from host).
 */

import { Observable } from 'rxjs';

export type PluginEventStream = Observable<unknown>;
```

- [ ] **Step 7: Create all InjectionTokens**

File: `projects/klacks-plugin-contracts/src/lib/tokens.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * InjectionTokens for plugin-host communication.
 * Host app provides concrete implementations via route-level providers.
 */

import { InjectionToken } from '@angular/core';
import { IPluginWorkplaceHost } from './plugin-workplace-host';
import { IPluginToastService } from './plugin-toast';
import { IPluginManualLoader } from './plugin-manual-loader';
import { IPluginVoiceService, IPluginSpeechService } from './plugin-voice';
import { PluginEventStream } from './plugin-event-stream';

export const PLUGIN_WORKPLACE_HOST = new InjectionToken<IPluginWorkplaceHost>('PLUGIN_WORKPLACE_HOST');
export const PLUGIN_TOAST_SERVICE = new InjectionToken<IPluginToastService>('PLUGIN_TOAST_SERVICE');
export const PLUGIN_MANUAL_LOADER = new InjectionToken<IPluginManualLoader>('PLUGIN_MANUAL_LOADER');
export const PLUGIN_EVENT_STREAM = new InjectionToken<PluginEventStream>('PLUGIN_EVENT_STREAM');
export const PLUGIN_API_BASE_URL = new InjectionToken<string>('PLUGIN_API_BASE_URL');
export const PLUGIN_VOICE_SERVICE = new InjectionToken<IPluginVoiceService>('PLUGIN_VOICE_SERVICE');
export const PLUGIN_SPEECH_SERVICE = new InjectionToken<IPluginSpeechService>('PLUGIN_SPEECH_SERVICE');
```

- [ ] **Step 8: Update public-api.ts with all exports**

File: `projects/klacks-plugin-contracts/src/public-api.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Public API for klacks-plugin-contracts.
 * Defines shared interfaces and InjectionTokens for plugin-host communication.
 */

export { IPluginWorkplaceHost } from './lib/plugin-workplace-host';
export { IPluginClient } from './lib/plugin-client';
export { IPluginToastService } from './lib/plugin-toast';
export { IPluginManualLoader } from './lib/plugin-manual-loader';
export { IPluginVoiceService, IPluginSpeechService, IPluginVoiceCallbacks } from './lib/plugin-voice';
export { PluginEventStream } from './lib/plugin-event-stream';
export {
  PLUGIN_WORKPLACE_HOST,
  PLUGIN_TOAST_SERVICE,
  PLUGIN_MANUAL_LOADER,
  PLUGIN_EVENT_STREAM,
  PLUGIN_API_BASE_URL,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
} from './lib/tokens';
```

- [ ] **Step 9: Verify contracts library builds**

Run: `cd Klacks.Ui && npx ng build klacks-plugin-contracts`
Expected: Build succeeds

- [ ] **Step 10: Commit**

```bash
git add projects/klacks-plugin-contracts/
git commit -m "feat: define plugin host interfaces and tokens in contracts library"
```

---

### Task 3: Copy shared components into messaging plugin

**Files:**
- Create: `projects/klacks-plugin-messaging/src/lib/shared/settings-list-card/settings-list-card.component.ts`
- Create: `projects/klacks-plugin-messaging/src/lib/shared/settings-list-card/settings-list-card.component.html`
- Create: `projects/klacks-plugin-messaging/src/lib/shared/settings-list-card/settings-list-card.component.scss`
- Create: `projects/klacks-plugin-messaging/src/lib/shared/icons/trash-icon-red.component.ts`
- Modify: `projects/klacks-plugin-messaging/ng-package.json` — add styleIncludePaths

- [ ] **Step 1: Update ng-package.json with styleIncludePaths**

The SettingsListCardComponent SCSS imports from `src/assets/standard-styles/`. Add this as an include path.

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/klacks-plugin-messaging",
  "lib": {
    "entryFile": "src/public-api.ts",
    "styleIncludePaths": ["../../src/assets/standard-styles"]
  }
}
```

- [ ] **Step 2: Create SettingsListCardComponent .ts**

File: `projects/klacks-plugin-messaging/src/lib/shared/settings-list-card/settings-list-card.component.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Card wrapper for settings list views within plugins.
 * Provides headline, scrollable content area, and optional add button.
 * @param headline - Card heading text (required)
 * @param addLabel - Label for the add button
 * @param showAddButton - Whether to show the add button
 * @param showHeader - Whether to show the header content slot
 * @param idPrefix - DOM ID prefix for test selectors
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'lib-settings-list-card',
  templateUrl: './settings-list-card.component.html',
  styleUrls: ['./settings-list-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginSettingsListCardComponent {
  @Input({ required: true }) headline!: string;
  @Input() addLabel = 'Hinzufuegen';
  @Input() showAddButton = true;
  @Input() showHeader = false;
  @Input() idPrefix = 'settings-list';
  @Output() addClick = new EventEmitter<void>();

  onAddClick(): void {
    this.addClick.emit();
  }
}
```

- [ ] **Step 3: Create SettingsListCardComponent .html**

File: `projects/klacks-plugin-messaging/src/lib/shared/settings-list-card/settings-list-card.component.html`

```html
<div [id]="idPrefix + '-card'" class="settings-list-card">
  <div [id]="idPrefix + '-header'" class="container-header">{{ headline }}</div>
  <div class="container-line"></div>

  @if (showHeader) {
    <ng-content select="[header]"></ng-content>
  }

  <div [id]="idPrefix + '-rows'" class="container-box">
    <ng-content select="[rows]"></ng-content>
  </div>

  @if (showAddButton) {
    <div class="add-row">
      <span
        [id]="idPrefix + '-add-btn'"
        class="add-button"
        tabindex="0"
        (click)="onAddClick()"
        (keydown.enter)="onAddClick()"
      >{{ addLabel }}</span>
    </div>
  }
</div>
```

- [ ] **Step 4: Create SettingsListCardComponent .scss**

File: `projects/klacks-plugin-messaging/src/lib/shared/settings-list-card/settings-list-card.component.scss`

Because `styleIncludePaths` includes `../../src/assets/standard-styles`, SCSS imports simplify:

```scss
@use "sass:color";
@use "standard-card-interior";
@use "colors" as colors;

.settings-list-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.container-box {
  height: 242px;
  box-sizing: content-box;
  overflow-x: hidden;
  overflow-y: auto;
  margin: 0;

  ::ng-deep > div {
    > * {
      display: block;
      margin-bottom: 0;
    }

    .first {
      margin-inline-start: 30px;
      height: 40px;
    }

    .custom-control-inline {
      display: flex;
      align-items: center;
      padding-top: 6px;
      padding-bottom: 6px;
    }

    .attribute-name {
      width: 250px;
      margin-inline-end: 10px;
      background-color: var(--standartGreenColor) !important;
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }

    .delete-button {
      margin-top: 5px;
      margin-inline-start: 20px;
      color: var(--standartRedColor);
      cursor: pointer;

      &.disabled {
        color: var(--colorLabel);
        cursor: not-allowed;
      }
    }
  }
}

.add-row {
  padding-top: 5px;
  text-align: center;
}

.add-button {
  font-size: 13px;
  text-decoration: underline;
  color: colors.$standartGreenColor;
  cursor: pointer;

  &:hover {
    color: color.adjust(colors.$standartGreenColor, $lightness: -10%);
  }
}
```

- [ ] **Step 5: Create TrashIconRedComponent**

File: `projects/klacks-plugin-messaging/src/lib/shared/icons/trash-icon-red.component.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Red trash icon SVG component for delete actions in plugin settings.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'lib-icon-trash-red',
  template: `<svg
    version="1.2"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    overflow="visible"
    preserveAspectRatio="none"
    viewBox="0 0 24 24"
    width="24"
    height="24"
  >
    <g>
      <path
        d="M9.91,17.24c-0.06,0.06-0.15,0.09-0.24,0.09H9c-0.18,0.01-0.32-0.13-0.33-0.31c0-0.01,0-0.01,0-0.02V9.67  c-0.01-0.18,0.12-0.33,0.3-0.34c0.01,0,0.02,0,0.03,0h0.67C9.85,9.32,9.99,9.46,10,9.64c0,0.01,0,0.01,0,0.02V17  C10,17.09,9.97,17.18,9.91,17.24z M12.58,17.24c-0.06,0.06-0.15,0.09-0.24,0.09h-0.67c-0.18,0.01-0.33-0.12-0.34-0.3  c0-0.01,0-0.02,0-0.03V9.67c-0.01-0.18,0.13-0.32,0.31-0.33c0.01,0,0.01,0,0.02,0h0.67c0.18-0.01,0.32,0.13,0.33,0.31  c0,0.01,0,0.01,0,0.02V17c0,0.09-0.03,0.18-0.09,0.24H12.58z M15.25,17.24c-0.06,0.06-0.15,0.09-0.24,0.09h-0.68  c-0.18,0.01-0.32-0.13-0.33-0.31c0-0.01,0-0.01,0-0.02V9.67c-0.01-0.18,0.13-0.32,0.31-0.33c0.01,0,0.01,0,0.02,0H15  c0.18-0.01,0.32,0.13,0.33,0.31c0,0.01,0,0.01,0,0.02V17c0,0.09-0.03,0.18-0.09,0.24H15.25z M10.18,5.45  c0.04-0.06,0.11-0.1,0.18-0.11h3.3c0.07,0.01,0.14,0.05,0.18,0.11l0.5,1.22H9.67L10.18,5.45z M19.33,7  c0.01-0.18-0.13-0.32-0.31-0.33c-0.01,0-0.01,0-0.02,0h-3.22l-0.73-1.74c-0.11-0.27-0.31-0.5-0.56-0.66  C14.25,4.1,13.96,4.01,13.67,4h-3.34c-0.29,0.01-0.58,0.1-0.82,0.27C9.26,4.43,9.06,4.66,8.95,4.93L8.22,6.67H5  C4.82,6.66,4.68,6.8,4.67,6.98c0,0.01,0,0.01,0,0.02v0.67C4.66,7.85,4.8,7.99,4.98,8C4.99,8,4.99,8,5,8h1v9.91  c-0.01,0.53,0.16,1.05,0.49,1.47C6.76,19.76,7.2,19.99,7.67,20h8.66c0.47-0.01,0.91-0.24,1.18-0.63c0.33-0.43,0.5-0.96,0.49-1.5V8h1  c0.18,0.01,0.32-0.13,0.33-0.31c0-0.01,0-0.01,0-0.02V7L19.33,7z"
        style="fill: #f45b69;"
        vector-effect="non-scaling-stroke"
      />
    </g>
  </svg>`,
  styles: [''],
  standalone: true,
})
export class PluginTrashIconRedComponent {}
```

- [ ] **Step 6: Commit**

```bash
git add projects/klacks-plugin-messaging/src/lib/shared/ projects/klacks-plugin-messaging/ng-package.json
git commit -m "feat: add shared components to messaging plugin (SettingsListCard, TrashIcon)"
```

---

### Task 4: Update DataMessagingService — replace environment import

**Files:**
- Modify: `projects/klacks-plugin-messaging/src/lib/services/data-messaging.service.ts`

- [ ] **Step 1: Read the current file**

Read `projects/klacks-plugin-messaging/src/lib/services/data-messaging.service.ts` completely. Note the `environment.baseUrl` usage and construct the replacement.

- [ ] **Step 2: Replace environment import with PLUGIN_API_BASE_URL token**

Replace the `import { environment } from 'src/environments/environment';` with the token injection. Replace `environment.baseUrl.replace('backend/', '')` with the injected value.

The import changes to:
```typescript
import { PLUGIN_API_BASE_URL } from 'klacks-plugin-contracts';
```

Inject the token:
```typescript
private apiUrl = inject(PLUGIN_API_BASE_URL);
```

Remove the old `environment.baseUrl` line and use `this.apiUrl` directly for URL construction.

- [ ] **Step 3: Commit**

```bash
git add projects/klacks-plugin-messaging/src/lib/services/data-messaging.service.ts
git commit -m "refactor: replace environment import with PLUGIN_API_BASE_URL token"
```

---

### Task 5: Update MessagingHomeComponent — replace 5 host services

**Files:**
- Modify: `projects/klacks-plugin-messaging/src/lib/components/messaging-home/messaging-home.component.ts`

- [ ] **Step 1: Read the current file**

Read `projects/klacks-plugin-messaging/src/lib/components/messaging-home/messaging-home.component.ts` completely.

- [ ] **Step 2: Replace imports and injections**

Remove these imports:
```typescript
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { IClient } from 'src/app/domain/models/client/client-class';
```

Replace with:
```typescript
import { PLUGIN_WORKPLACE_HOST, IPluginClient } from 'klacks-plugin-contracts';
```

Replace the 5 service injections:
```typescript
// OLD:
private workplaceState = inject(WorkplaceStateService);
private layoutService = inject(LayoutService);
private searchService = inject(SearchService);
private savebarService = inject(SavebarService);
private navigationService = inject(NavigationService);

// NEW:
private host = inject(PLUGIN_WORKPLACE_HOST);
```

Update all method calls:
- `this.workplaceState.setActiveManagerByRoute(...)` → `this.host.setActiveManagerByRoute(...)`
- `this.layoutService.setContainerToNormalSize()` → `this.host.setContainerToNormalSize()`
- `this.searchService.setSearchVisibility(...)` → `this.host.setSearchVisibility(...)`
- `this.searchService.setClientSearchMode(...)` → `this.host.setClientSearchMode(...)`
- `this.savebarService.setSavebarVisibility(...)` → `this.host.setSavebarVisibility(...)`
- `this.searchService.clientSelected$` → `this.host.clientSelected$`
- Type `IClient` → `IPluginClient`

Remove `NavigationService` injection entirely (unused).

- [ ] **Step 3: Commit**

```bash
git add projects/klacks-plugin-messaging/src/lib/components/messaging-home/messaging-home.component.ts
git commit -m "refactor: replace host service imports with PLUGIN_WORKPLACE_HOST token"
```

---

### Task 6: Update MessagingChatComponent — replace SignalR, Voice, Speech

**Files:**
- Modify: `projects/klacks-plugin-messaging/src/lib/components/messaging-chat/messaging-chat.component.ts`

- [ ] **Step 1: Read the current file**

Read `projects/klacks-plugin-messaging/src/lib/components/messaging-chat/messaging-chat.component.ts` completely.

- [ ] **Step 2: Replace imports and injections**

Remove these imports:
```typescript
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { SpeechRecognitionService } from 'src/app/presentation/aside/assistant-chat/services/speech-recognition.service';
import { VoiceModeService } from 'src/app/presentation/aside/assistant-chat/services/voice-mode.service';
```

Replace with:
```typescript
import {
  PLUGIN_EVENT_STREAM,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
  IPluginVoiceService,
  IPluginSpeechService,
  PluginEventStream,
} from 'klacks-plugin-contracts';
```

Replace injections:
```typescript
// OLD:
private signalRService = inject(AssistantSignalRService);
public speechService = inject(SpeechRecognitionService);
private voiceModeService = inject(VoiceModeService);
// Also remove VoiceModeService from providers array

// NEW:
private pluginEvents = inject(PLUGIN_EVENT_STREAM);
public speechService = inject(PLUGIN_SPEECH_SERVICE);
private voiceModeService = inject(PLUGIN_VOICE_SERVICE);
```

Update `subscribeToIncomingMessages()`:
```typescript
// OLD:
this.signalRService.incomingMessage$

// NEW:
this.pluginEvents
```

Remove `VoiceModeService` from the `providers: [VoiceModeService]` array in the `@Component` decorator (it's now provided by the host at route level).

- [ ] **Step 3: Commit**

```bash
git add projects/klacks-plugin-messaging/src/lib/components/messaging-chat/messaging-chat.component.ts
git commit -m "refactor: replace SignalR/Voice/Speech imports with plugin contract tokens"
```

---

### Task 7: Update MessagingInboxComponent — replace SignalR + SettingsListCard

**Files:**
- Modify: `projects/klacks-plugin-messaging/src/lib/settings/messaging-inbox/messaging-inbox.component.ts`

- [ ] **Step 1: Read the current file**

Read `projects/klacks-plugin-messaging/src/lib/settings/messaging-inbox/messaging-inbox.component.ts` completely.

- [ ] **Step 2: Replace imports**

Remove:
```typescript
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
```

Replace with:
```typescript
import { PLUGIN_EVENT_STREAM, PluginEventStream } from 'klacks-plugin-contracts';
import { PluginSettingsListCardComponent } from '../../shared/settings-list-card/settings-list-card.component';
```

Replace injection:
```typescript
// OLD:
private signalRService = inject(AssistantSignalRService);

// NEW:
private pluginEvents = inject(PLUGIN_EVENT_STREAM);
```

Update `subscribeToIncomingMessages()`:
```typescript
// OLD:
this.signalRService.incomingMessage$

// NEW:
this.pluginEvents
```

Update `imports` array in `@Component`: replace `SettingsListCardComponent` with `PluginSettingsListCardComponent`.

Update the HTML template: change `<app-settings-list-card>` to `<lib-settings-list-card>`.

- [ ] **Step 3: Commit**

```bash
git add projects/klacks-plugin-messaging/src/lib/settings/messaging-inbox/
git commit -m "refactor: replace SignalR + SettingsListCard with plugin contracts"
```

---

### Task 8: Update MessagingProvidersComponent — replace Toast, Loader, SettingsListCard

**Files:**
- Modify: `projects/klacks-plugin-messaging/src/lib/settings/messaging-providers/messaging-providers.component.ts`

- [ ] **Step 1: Read the current file**

Read `projects/klacks-plugin-messaging/src/lib/settings/messaging-providers/messaging-providers.component.ts` completely.

- [ ] **Step 2: Replace imports and injections**

Remove:
```typescript
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
```

Replace with:
```typescript
import { PLUGIN_TOAST_SERVICE, PLUGIN_MANUAL_LOADER, IPluginToastService, IPluginManualLoader } from 'klacks-plugin-contracts';
import { PluginSettingsListCardComponent } from '../../shared/settings-list-card/settings-list-card.component';
```

Replace injections:
```typescript
// OLD:
private toastService = inject(ToastShowService);
private manualLoaderService = inject(ManualLoaderService);

// NEW:
private toastService = inject(PLUGIN_TOAST_SERVICE);
private manualLoaderService = inject(PLUGIN_MANUAL_LOADER);
```

Update `imports` array in `@Component`: replace `SettingsListCardComponent` with `PluginSettingsListCardComponent`.

Update the HTML template: change `<app-settings-list-card>` to `<lib-settings-list-card>`.

- [ ] **Step 3: Commit**

```bash
git add projects/klacks-plugin-messaging/src/lib/settings/messaging-providers/messaging-providers.component.ts
git commit -m "refactor: replace Toast + Loader + SettingsListCard with plugin contracts"
```

---

### Task 9: Update MessagingProvidersRowComponent — replace TrashIcon

**Files:**
- Modify: `projects/klacks-plugin-messaging/src/lib/settings/messaging-providers/messaging-providers-row/messaging-providers-row.component.ts`

- [ ] **Step 1: Read the current file**

Read the component file completely.

- [ ] **Step 2: Replace import**

Remove:
```typescript
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
```

Replace with:
```typescript
import { PluginTrashIconRedComponent } from '../../../shared/icons/trash-icon-red.component';
```

Update `imports` array in `@Component`: replace `TrashIconRedComponent` with `PluginTrashIconRedComponent`.

Update the HTML template: change `<app-icon-trash-red>` to `<lib-icon-trash-red>`.

- [ ] **Step 3: Commit**

```bash
git add projects/klacks-plugin-messaging/src/lib/settings/messaging-providers/messaging-providers-row/
git commit -m "refactor: replace TrashIcon with plugin-local copy"
```

---

### Task 10: Update messaging plugin tsconfig and dependencies

**Files:**
- Modify: `projects/klacks-plugin-messaging/tsconfig.lib.json`
- Modify: `projects/klacks-plugin-messaging/package.json`

- [ ] **Step 1: Update tsconfig.lib.json**

Remove the `src/*` path mapping (no longer needed). Add `klacks-plugin-contracts` path:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "../../out-tsc/lib",
    "declaration": true,
    "declarationMap": true,
    "types": [],
    "paths": {
      "klacks-plugin-contracts": ["../klacks-plugin-contracts/src/public-api.ts"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.spec.ts"]
}
```

- [ ] **Step 2: Add peerDependency on contracts**

Add to `projects/klacks-plugin-messaging/package.json` peerDependencies:

```json
"klacks-plugin-contracts": ">=0.0.1"
```

- [ ] **Step 3: Commit**

```bash
git add projects/klacks-plugin-messaging/tsconfig.lib.json projects/klacks-plugin-messaging/package.json
git commit -m "refactor: update messaging plugin tsconfig to use contracts instead of src paths"
```

---

### Task 11: Create host provider factory in main app

**Files:**
- Create: `src/app/infrastructure/plugins/provide-plugin-host.ts`

- [ ] **Step 1: Create the provider factory**

File: `src/app/infrastructure/plugins/provide-plugin-host.ts`

```typescript
// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Provider factories for plugin host services.
 * Used in route configurations to supply concrete implementations for plugin tokens.
 * @param providePluginHost - Provides generic host services all plugins need
 * @param provideMessagingHost - Provides messaging-specific services (voice, speech)
 */

import { Provider } from '@angular/core';
import {
  PLUGIN_WORKPLACE_HOST,
  PLUGIN_TOAST_SERVICE,
  PLUGIN_MANUAL_LOADER,
  PLUGIN_EVENT_STREAM,
  PLUGIN_API_BASE_URL,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
  IPluginWorkplaceHost,
} from 'klacks-plugin-contracts';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { SpeechRecognitionService } from 'src/app/presentation/aside/assistant-chat/services/speech-recognition.service';
import { VoiceModeService } from 'src/app/presentation/aside/assistant-chat/services/voice-mode.service';
import { environment } from 'src/environments/environment';

export function providePluginHost(): Provider[] {
  return [
    {
      provide: PLUGIN_WORKPLACE_HOST,
      useFactory: (
        workplaceState: WorkplaceStateService,
        layout: LayoutService,
        search: SearchService,
        savebar: SavebarService,
      ): IPluginWorkplaceHost => ({
        setActiveManagerByRoute: (route) => workplaceState.setActiveManagerByRoute(route),
        setContainerToNormalSize: () => layout.setContainerToNormalSize(),
        setSearchVisibility: (v) => search.setSearchVisibility(v),
        setSavebarVisibility: (v) => savebar.setSavebarVisibility(v),
        setClientSearchMode: (e) => search.setClientSearchMode(e),
        clientSelected$: search.clientSelected$,
      }),
      deps: [WorkplaceStateService, LayoutService, SearchService, SavebarService],
    },
    {
      provide: PLUGIN_TOAST_SERVICE,
      useExisting: ToastShowService,
    },
    {
      provide: PLUGIN_MANUAL_LOADER,
      useExisting: ManualLoaderService,
    },
    {
      provide: PLUGIN_EVENT_STREAM,
      useFactory: (signalR: AssistantSignalRService) => signalR.incomingMessage$,
      deps: [AssistantSignalRService],
    },
    {
      provide: PLUGIN_API_BASE_URL,
      useValue: environment.baseUrl.replace('backend/', ''),
    },
  ];
}

export function provideMessagingVoice(): Provider[] {
  return [
    {
      provide: PLUGIN_VOICE_SERVICE,
      useClass: VoiceModeService,
    },
    {
      provide: PLUGIN_SPEECH_SERVICE,
      useExisting: SpeechRecognitionService,
    },
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/infrastructure/plugins/provide-plugin-host.ts
git commit -m "feat: create plugin host provider factories"
```

---

### Task 12: Update main app routing with plugin providers

**Files:**
- Modify: `src/app/app-routing.module.ts`

- [ ] **Step 1: Read the current routing file**

Read `src/app/app-routing.module.ts` and find the messaging route definition.

- [ ] **Step 2: Add providers to messaging route**

Add imports:
```typescript
import { providePluginHost, provideMessagingVoice } from 'src/app/infrastructure/plugins/provide-plugin-host';
```

Update the messaging route to include providers:
```typescript
{
  path: 'messaging',
  loadChildren: () =>
    import('klacks-plugin-messaging').then(
      (m) => m.MESSAGING_ROUTES,
    ),
  canActivate: [AuthGuard, featurePluginGuard(MESSAGING_PLUGIN_NAME)],
  providers: [...providePluginHost(), ...provideMessagingVoice()],
}
```

**IMPORTANT:** Also check `settings-home.component.ts` — it imports `MessagingProvidersComponent` directly (not lazy-loaded). This component uses `PLUGIN_TOAST_SERVICE`, `PLUGIN_MANUAL_LOADER`. These tokens need to be provided at a level above settings-home, or settings-home needs its own providers. Read the settings route config and add `providePluginHost()` providers there too.

- [ ] **Step 3: Commit**

```bash
git add src/app/app-routing.module.ts
git commit -m "feat: wire plugin host providers into messaging route"
```

---

### Task 13: Update messaging plugin HTML templates for renamed selectors

**Files:**
- Modify: Template files that reference `app-settings-list-card` or `app-icon-trash-red`

- [ ] **Step 1: Search and update all template references**

Search all `.html` files in `projects/klacks-plugin-messaging/` for:
- `app-settings-list-card` → `lib-settings-list-card`
- `app-icon-trash-red` → `lib-icon-trash-red`

Read each template, apply the replacements.

- [ ] **Step 2: Commit**

```bash
git add projects/klacks-plugin-messaging/
git commit -m "refactor: update template selectors for plugin-local components"
```

---

### Task 14: Verify all three builds

- [ ] **Step 1: Build contracts library**

Run: `cd Klacks.Ui && npx ng build klacks-plugin-contracts`
Expected: Build succeeds

- [ ] **Step 2: Build messaging plugin library**

Run: `cd Klacks.Ui && npx ng build klacks-plugin-messaging`
Expected: Build succeeds — no `src/app/...` imports remaining

- [ ] **Step 3: Build main app**

Run: `cd Klacks.Ui && npx ng build`
Expected: Build succeeds — all providers correctly wired

- [ ] **Step 4: Run lint**

Run: `cd Klacks.Ui && npx ng lint`
Expected: No new errors

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build/lint issues from plugin contracts migration"
```
