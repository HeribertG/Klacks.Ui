// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Registers the low-coupling effects of ScheduleSectionComponent:
 * scrollbar-lock sizing, zoom input, color-reset / schedule-update /
 * period-hours / refresh-trigger surface refreshes, and the showIn
 * navigation effect. Kept separate from the three state-heavy effects
 * (data-read, h-scroll-position, hovered-cell) which remain inline in
 * the component because they mutate component-local state that does
 * not cross this service boundary cleanly.
 *
 * @param scrollService - Lock signals for v/h scrollbars
 * @param settings - Zoom target + timeline mode flag
 * @param facade - Cross-section workNotification, showInSchedule, gridColor, workScheduleLoader
 */
import { effect, EffectRef, inject, Injectable } from '@angular/core';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScheduleSectionFacadeService } from './schedule-section-facade.service';

export interface ScheduleEffectsHost {
  refreshSurface(resetScroll?: boolean): void;
  setVScrollbarSize(size: number): void;
  setHScrollbarSize(size: number): void;
  scrollToClient(clientId: string, date: string): void;
  scrollToScheduleEntry(shiftId: string, column: number): void;
  readonly defaultVScrollbarSize: number;
  readonly defaultHScrollbarSize: number;
  readZoom(): number;
  readRefreshTrigger(): boolean;
}

@Injectable()
export class ScheduleSimpleEffectsService {
  private readonly scrollService = inject(ScrollService);
  private readonly settings = inject(BaseSettingsService);
  private readonly facade = inject(ScheduleSectionFacadeService);

  private effects: EffectRef[] = [];

  register(host: ScheduleEffectsHost): void {
    this.effects.push(
      effect(() => {
        const isLocked = this.scrollService.lockedRows();
        host.setVScrollbarSize(isLocked ? 0 : host.defaultVScrollbarSize);
      }),
      effect(() => {
        const isLocked = this.scrollService.lockedCols();
        host.setHScrollbarSize(isLocked ? 0 : host.defaultHScrollbarSize);
      }),
      effect(() => {
        const updateId = this.facade.workNotification.scheduleUpdateSignal();
        if (updateId) {
          host.refreshSurface(false);
        }
      }),
      effect(() => {
        void this.facade.workScheduleLoader.periodHoursUpdated();
        host.refreshSurface(false);
      }),
      effect(() => {
        if (this.facade.gridColor.isReset()) {
          host.refreshSurface(false);
        }
      }),
      this.buildShowInScheduleEffect(host),
      this.buildZoomEffect(host),
      this.buildRefreshTriggerEffect(host),
    );
  }

  destroy(): void {
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  private buildShowInScheduleEffect(host: ScheduleEffectsHost): EffectRef {
    return effect(() => {
      const request = this.facade.showInSchedule.request();
      if (!request) return;

      if (request.clientId && request.date) {
        host.scrollToClient(request.clientId, request.date);
      } else if (request.shiftId !== undefined && request.column !== undefined) {
        host.scrollToScheduleEntry(request.shiftId, request.column);
      }

      this.facade.showInSchedule.clear();
    });
  }

  private buildZoomEffect(host: ScheduleEffectsHost): EffectRef {
    let initialized = false;
    return effect(() => {
      const zoomValue = host.readZoom();
      if (initialized) {
        this.settings.zoom = zoomValue;
      }
      initialized = true;
    });
  }

  private buildRefreshTriggerEffect(host: ScheduleEffectsHost): EffectRef {
    let initialized = false;
    return effect(() => {
      void host.readRefreshTrigger();
      if (initialized) {
        host.refreshSurface(false);
      }
      initialized = true;
    });
  }
}
