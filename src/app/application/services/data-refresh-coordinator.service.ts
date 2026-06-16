// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Listens for entity-changed pushes from Klacksy (SignalR) and reloads the affected, visible page
 * so the user sees fresh data without a manual refresh. Reloads are debounced over a short window
 * to coalesce multi-skill turns. A dirty edit form is never overwritten — the user gets a
 * "reload?" toast instead.
 * @param bufferWindowMs - Window over which rapid entity-changed events are coalesced
 */

import { inject, Injectable, NgZone } from '@angular/core';
import { bufferTime, filter, map } from 'rxjs';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { WorkplaceStateService } from './workplace-state.service';
import { DataRefreshRegistry } from './data-refresh-registry.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';
import {
  IRefreshable,
  ISaveable,
} from 'src/app/domain/interfaces/manageable.interface';

const BUFFER_WINDOW_MS = 300;
const RELOAD_PROMPT_KEY = 'data-refresh.changed-prompt';
const RELOAD_OPTION_KEY = 'data-refresh.reload';
const RELOAD_OPTION_VALUE = 'reload';

@Injectable({ providedIn: 'root' })
export class DataRefreshCoordinator {
  private signalR = inject(AssistantSignalRService);
  private workplaceState = inject(WorkplaceStateService);
  private registry = inject(DataRefreshRegistry);
  private toast = inject(ToastShowService);
  private translate = inject(TranslateService);
  private ngZone = inject(NgZone);

  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    this.signalR.entityChanged$
      .pipe(
        bufferTime(BUFFER_WINDOW_MS),
        filter((events) => events.length > 0),
        map((events) => [
          ...new Set(events.flatMap((e) => e.entityTypes ?? [])),
        ]),
      )
      .subscribe((entityTypes) => this.ngZone.run(() => this.handle(entityTypes)));
  }

  private handle(entityTypes: string[]): void {
    if (entityTypes.length === 0) {
      return;
    }

    const handled = new Set<IRefreshable>();

    const active = this.workplaceState.activeManager();
    if (isRefreshable(active) && intersects(active.refreshableEntities, entityTypes)) {
      this.reloadOrWarn(active);
      handled.add(active);
    }

    for (const target of this.registry.matching(entityTypes)) {
      if (!handled.has(target)) {
        this.reloadOrWarn(target);
        handled.add(target);
      }
    }
  }

  private reloadOrWarn(target: IRefreshable): void {
    if (isSaveable(target) && target.areObjectsDirty()) {
      this.promptReload(target);
    } else {
      target.reload();
    }
  }

  private promptReload(target: IRefreshable): void {
    this.toast.showInteractiveReply(
      {
        selectionMode: 'single',
        prompt: this.translate.instant(RELOAD_PROMPT_KEY),
        options: [
          {
            label: this.translate.instant(RELOAD_OPTION_KEY),
            value: RELOAD_OPTION_VALUE,
          },
        ],
      },
      (values) => {
        if (values.includes(RELOAD_OPTION_VALUE)) {
          target.reload();
        }
      },
    );
  }
}

function isRefreshable(value: unknown): value is IRefreshable {
  return (
    !!value &&
    typeof (value as IRefreshable).reload === 'function' &&
    Array.isArray((value as IRefreshable).refreshableEntities)
  );
}

function isSaveable(value: unknown): value is ISaveable {
  return !!value && typeof (value as ISaveable).areObjectsDirty === 'function';
}

function intersects(a: readonly string[], b: readonly string[]): boolean {
  return a.some((x) => b.includes(x));
}
