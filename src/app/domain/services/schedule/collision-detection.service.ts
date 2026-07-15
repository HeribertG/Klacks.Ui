// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for detecting and managing schedule validations via SignalR.
 * Processes collisions (error), rest time/working time violations (warning) via SignalR.
 * Calculates understaffing info (info) locally from the loaded shift schedule data.
 * @param collisions - Map of all received collisions (key: sorted work ID pairs)
 * @param validationEntries - Client-specific validation entries from the backend (warning)
 * @param errorEntries - Combined error entries based on visible clients and date range
 * @param errorCount - Number of currently visible error entries (for tab badge)
 */
import {
  inject,
  Injectable,
  signal,
  computed,
  OnDestroy,
  effect,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import {
  ICollisionListNotification,
  ICollisionNotification,
} from 'src/app/domain/interfaces/collision-notification.interface';
import { IScheduleValidationNotification } from 'src/app/domain/interfaces/schedule-validation-notification.interface';
import { IScheduleValidationListNotification } from 'src/app/domain/interfaces/schedule-validation-list-notification.interface';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';

@Injectable({
  providedIn: 'root',
})
export class CollisionDetectionService implements OnDestroy {
  private signalRService = inject(SCHEDULE_SIGNALR);
  private dataManagement = inject(DataManagementScheduleService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private translate = inject(TranslateService);
  private collisions = new Map<string, ICollisionNotification>();
  private validations = new Map<string, IScheduleValidationNotification>();
  private subscriptions: Subscription[] = [];
  private lastClearedKey = '';
  private _refreshDebounce: ReturnType<typeof setTimeout> | null = null;

  private entriesUpdated = signal(0);
  private readonly emptyGuid = '00000000-0000-0000-0000-000000000000';

  errorEntries = signal<ScheduleErrorEntry[]>([]);

  errorCount = computed(
    () => this.errorEntries().filter((e) => e.type === 'error').length,
  );
  warningCount = computed(
    () => this.errorEntries().filter((e) => e.type === 'warning').length,
  );
  infoCount = computed(
    () => this.errorEntries().filter((e) => e.type === 'info').length,
  );

  constructor() {
    this.subscriptions.push(
      this.signalRService.collisionsDetected$.subscribe((notification) => {
        const notificationToken = notification.analyseToken ?? null;
        const activeToken = this.analyseScenarioService.activeToken() ?? null;
        if (notificationToken !== activeToken) return;

        this.processCollisionNotification(notification);
        this.entriesUpdated.set(this.entriesUpdated() + 1);
      }),
    );

    this.subscriptions.push(
      this.signalRService.scheduleValidationsDetected$.subscribe(
        (notification) => {
          const notificationToken = notification.analyseToken ?? null;
          const activeToken = this.analyseScenarioService.activeToken() ?? null;
          if (notificationToken !== activeToken) return;

          this.processValidationNotification(notification);
          this.entriesUpdated.set(this.entriesUpdated() + 1);
        },
      ),
    );

    effect(() => {
      if (this.dataManagement.isWorkScheduleRead()) {
        const group = this.dataManagement.workFilter.selectedGroup ?? '';
        const token = this.analyseScenarioService.activeToken() ?? 'null';
        const currentKey = `${group}_${this.dataManagement.visibleStartDate?.toISOString()}_${this.dataManagement.visibleEndDate?.toISOString()}_${token}`;
        const changed = currentKey !== this.lastClearedKey;

        if (changed) {
          this.collisions.clear();
          this.validations.clear();
          this.errorEntries.set([]);
          this.lastClearedKey = currentKey;
        }
      }
    });

    effect(() => {
      this.entriesUpdated();
      this.dataManagement.workScheduleChunkLoaded();
      this.dataManagement.isShiftScheduleRead();
      this.scheduleRefresh();
    });
  }

  ngOnDestroy(): void {
    if (this._refreshDebounce) clearTimeout(this._refreshDebounce);
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private scheduleRefresh(): void {
    if (this._refreshDebounce) {
      clearTimeout(this._refreshDebounce);
    }
    this._refreshDebounce = setTimeout(() => {
      this._refreshDebounce = null;
      this.refreshEntries();
    }, 50);
  }

  private refreshEntries(): void {
    const visibleClientIds = new Set(
      this.dataManagement.clients.map((c) => c.id),
    );
    const startDate = this.dataManagement.visibleStartDate
      ? formatDateOnly(this.dataManagement.visibleStartDate)
      : undefined;
    const endDate = this.dataManagement.visibleEndDate
      ? formatDateOnly(this.dataManagement.visibleEndDate)
      : undefined;

    const entries: ScheduleErrorEntry[] = [];

    for (const collision of this.collisions.values()) {
      if (!visibleClientIds.has(collision.clientId)) continue;
      if (startDate && collision.date < startDate) continue;
      if (endDate && collision.date > endDate) continue;

      entries.push({
        type: 'error',
        date: collision.date,
        clientId: collision.clientId,
        clientName: collision.clientName,
        comment: 'schedule.error-list.collision',
        commentParams: {
          type1: this.getBlockTypeLabel(collision.blockType1),
          timeRange1: collision.timeRange1,
          type2: this.getBlockTypeLabel(collision.blockType2),
          timeRange2: collision.timeRange2,
        },
      });
    }

    for (const validation of this.validations.values()) {
      if (validation.clientId === this.emptyGuid) continue;
      if (!visibleClientIds.has(validation.clientId)) continue;
      if (startDate && validation.date < startDate) continue;
      if (endDate && validation.date > endDate) continue;

      entries.push({
        type: validation.type,
        date: validation.date,
        clientId: validation.clientId,
        clientName: validation.clientName,
        comment: validation.comment,
        commentParams: this.localizeCommentParams(validation.commentParams),
      });
    }

    this.addUnderstaffedShiftEntries(entries);

    this.errorEntries.set(entries);
  }

  private localizeCommentParams(
    params: Record<string, string> | undefined
  ): Record<string, string> | undefined {
    const dayOfWeek = params?.['dayOfWeek'];
    if (!dayOfWeek) {
      return params;
    }

    return { ...params, dayOfWeek: this.translate.instant(dayOfWeek.toLowerCase()) };
  }

  private addUnderstaffedShiftEntries(entries: ScheduleErrorEntry[]): void {
    const shifts = this.dataManagement.shiftSchedules;
    if (!shifts || shifts.length === 0) return;

    const understaffedByDate = new Map<string, { abbreviations: Set<string>; needed: number; scheduled: number }>();

    for (const shift of shifts) {
      if (shift.engaged >= shift.sumEmployees * shift.quantity) continue;

      const dateKey = formatDateOnly(new Date(shift.date));
      let group = understaffedByDate.get(dateKey);
      if (!group) {
        group = { abbreviations: new Set<string>(), needed: 0, scheduled: 0 };
        understaffedByDate.set(dateKey, group);
      }

      group.abbreviations.add(shift.abbreviation);
      group.needed += shift.sumEmployees * shift.quantity;
      group.scheduled += shift.engaged;
    }

    for (const [date, group] of understaffedByDate) {
      entries.push({
        type: 'info',
        date,
        clientId: this.emptyGuid,
        clientName: '',
        comment: 'schedule.error-list.understaffed',
        commentParams: {
          shifts: [...group.abbreviations].join(', '),
          needed: group.needed.toString(),
          scheduled: group.scheduled.toString(),
        },
      });
    }
  }

  private processCollisionNotification(
    notification: ICollisionListNotification,
  ): void {
    if (notification.isFullRefresh) {
      this.collisions.clear();
      for (const collision of notification.collisions) {
        const key = this.buildCollisionKey(
          collision.workId1,
          collision.workId2,
        );
        this.collisions.set(key, collision);
      }
      return;
    }

    if (notification.checkedClientId && notification.checkedDate) {
      this.removeCollisionsForClientDate(
        notification.checkedClientId,
        notification.checkedDate,
      );
    }

    for (const collision of notification.collisions) {
      const key = this.buildCollisionKey(collision.workId1, collision.workId2);
      this.collisions.set(key, collision);
    }
  }

  private processValidationNotification(
    notification: IScheduleValidationListNotification,
  ): void {
    if (notification.isFullRefresh) {
      this.validations.clear();
      for (const entry of notification.entries) {
        const key = this.buildValidationKey(entry);
        this.validations.set(key, entry);
      }
      return;
    }

    if (notification.checkedClientId && notification.checkedDate) {
      this.removeValidationsForClientDate(
        notification.checkedClientId,
        notification.checkedDate,
      );
    }

    for (const entry of notification.entries) {
      const key = this.buildValidationKey(entry);
      this.validations.set(key, entry);
    }
  }

  private removeCollisionsForClientDate(clientId: string, date: string): void {
    const keysToRemove: string[] = [];
    for (const [key, collision] of this.collisions) {
      if (collision.clientId === clientId && collision.date === date) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.collisions.delete(key);
    }
  }

  private removeValidationsForClientDate(clientId: string, date: string): void {
    const keysToRemove: string[] = [];
    for (const [key, validation] of this.validations) {
      if (
        validation.date === date &&
        validation.clientId === clientId
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.validations.delete(key);
    }
  }

  private buildCollisionKey(workId1: string, workId2: string): string {
    return workId1 < workId2
      ? `${workId1}_${workId2}`
      : `${workId2}_${workId1}`;
  }

  private buildValidationKey(entry: IScheduleValidationNotification): string {
    return `${entry.type}_${entry.clientId}_${entry.date}_${entry.comment}`;
  }

  private getBlockTypeLabel(blockType: string): string {
    const keyMap: Record<string, string> = {
      Work: 'schedule.entryType.work',
      Correction: 'schedule.entryType.workChange',
      Replacement: 'schedule.entryType.workChange',
      Break: 'schedule.entryType.break',
    };
    const i18nKey = keyMap[blockType];
    return i18nKey ? this.translate.instant(i18nKey) : (blockType ?? '');
  }
}
