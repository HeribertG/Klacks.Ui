// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Lifecycle service for the container work edit modal dialog.
 * @param workId - The ID of the parent container work entry
 * @param currentDate - The date context for shift operations
 * @param weekday - Derived weekday string from currentDate
 */
import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { AvailableShift } from 'src/app/domain/models/schedule/available-shift';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { ContainerWorkChildrenService, ContainerWorkChildren, SubWorkResource, SubBreakResource, WorkChangeResource } from 'src/app/domain/services/schedule/container-work-children.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerTemplateRouteService } from 'src/app/presentation/workplace/shift/container-template/services/container-template-route.service';
import { ContainerTransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { sortContainerItemsChronologically } from 'src/app/shared/helpers/container-template-sort.helper';

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DEFAULT_TIME_FROM_HOURS = '06';
const DEFAULT_TIME_FROM_MINUTES = '00';
const DEFAULT_TIME_TO_HOURS = '18';
const DEFAULT_TIME_TO_MINUTES = '00';
const MAX_MINUTES_IN_DAY = 1440;
const DESCRIPTION_BRIEFING = 'briefing_time';
const DESCRIPTION_DEBRIEFING = 'debriefing_time';
const DESCRIPTION_TRAVEL_BEFORE = 'travel_time_before';
const DESCRIPTION_TRAVEL_AFTER = 'travel_time_after';
const WORK_CHANGE_TYPE_CORRECTION_END = 0;
const WORK_CHANGE_TYPE_CORRECTION_START = 1;
const MINUTES_PER_HOUR = 60;
const EMPTY_TIME = '00:00';
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class ContainerWorkModalLifecycleService {
  private childrenService = inject(ContainerWorkChildrenService);
  private shiftService = inject(ContainerTemplateShiftService);
  private routeService = inject(ContainerTemplateRouteService);
  private dataShiftService = inject(DataShiftService);
  private dataAbsenceService = inject(DataAbsenceService);
  private destroyRef = inject(DestroyRef);

  readonly isDirty = signal(false);
  readonly isLoading = signal(false);
  readonly isAvailableShiftsLoading = signal(false);
  readonly availableShiftsVersion = signal(0);
  readonly selectedTabIndex = signal(0);
  readonly isEmploymentTabActive = signal(false);
  readonly containerAbsences = signal<IAbsence[]>([]);
  readonly isReadOnly = signal(false);
  readonly readOnlyReason = signal<string>('');
  private originalChildShiftIds = signal<ReadonlySet<string>>(new Set());

  workId = '';
  containerShiftId = '';
  currentDate: Date | null = null;
  weekday = 'monday';
  isHoliday = false;

  private containerStartTime: string | null = null;
  private containerEndTime: string | null = null;
  private availableShiftsAsIShift: IShift[] = [];

  get crossesMidnight(): boolean {
    if (!this.containerStartTime || !this.containerEndTime) return false;
    const startMinutes = this.parseTimeToMinutes(this.containerStartTime);
    const endMinutes = this.parseTimeToMinutes(this.containerEndTime);
    return endMinutes < startMinutes;
  }

  get tabs(): { date: Date; label: string }[] {
    if (!this.currentDate) return [];
    const base = this.currentDate;
    const parentLabel = this.formatTabLabel(base);

    if (this.isReverseMidnightCorrection) {
      const prev = new Date(base);
      prev.setDate(prev.getDate() - 1);
      return [
        { date: prev, label: this.formatTabLabel(prev) },
        { date: base, label: parentLabel },
      ];
    }

    if (this.crossesMidnight) {
      const next = new Date(base);
      next.setDate(next.getDate() + 1);
      return [
        { date: base, label: parentLabel },
        { date: next, label: this.formatTabLabel(next) },
      ];
    }

    return [{ date: base, label: parentLabel }];
  }

  private get isReverseMidnightCorrection(): boolean {
    if (!this.containerStartTime) return false;
    const containerStart = this.parseTimeToMinutes(this.containerStartTime);
    if (containerStart === 0) return false;
    const items = this.shiftService.selectedContainerTemplateItemsSignal();
    return items.some(item => {
      const start = item.startItem ? this.parseTimeToMinutes(item.startItem) : -1;
      return start >= 0 && start < containerStart;
    });
  }

  private formatTabLabel(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  }

  getUnassignedOriginalChildIds(): string[] {
    const originals = this.originalChildShiftIds();
    if (originals.size === 0) return [];
    const currentShiftIds = new Set(
      this.shiftService
        .selectedContainerTemplateItemsSignal()
        .map(item => item.shiftId)
        .filter((id): id is string => id != null),
    );
    const result: string[] = [];
    for (const id of originals) {
      if (!currentShiftIds.has(id)) result.push(id);
    }
    return result;
  }

  get availableTasks(): IShift[] {
    const selectedShiftIds = this.shiftService
      .selectedContainerTemplateItemsSignal()
      .map(item => item.shiftId)
      .filter((id): id is string => id != null);

    return this.availableShiftsAsIShift.filter(
      shift => !selectedShiftIds.includes(shift.id!),
    );
  }

  initialize(workId: string, containerShiftId: string, currentDate: Date, availableShifts: AvailableShift[], containerStartTime?: string, containerEndTime?: string): void {
    this.containerStartTime = containerStartTime ?? null;
    this.containerEndTime = containerEndTime ?? null;
    this.workId = workId;
    this.containerShiftId = containerShiftId;
    this.currentDate = currentDate;
    this.weekday = WEEKDAY_NAMES[currentDate.getDay()];
    this.isDirty.set(false);
    this.isLoading.set(true);
    this.isAvailableShiftsLoading.set(true);
    this.isEmploymentTabActive.set(false);
    this.selectedTabIndex.set(0);
    this.containerAbsences.set([]);
    this.isReadOnly.set(false);
    this.readOnlyReason.set('');

    this.availableShiftsAsIShift = availableShifts.map(s => this.convertAvailableShiftToIShift(s));

    this.childrenService.loadChildren(workId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: children => {
          this.initializeItemsFromChildren(children);
          this.applyParentRouteValues(children);
          const originalIds = new Set<string>();
          for (const subWork of children.subWorks) {
            if (subWork.shiftId) originalIds.add(subWork.shiftId);
          }
          this.originalChildShiftIds.set(originalIds);
          this.isLoading.set(false);
          const inputIds = availableShifts.map(s => s.id);
          const combinedIds = Array.from(new Set([...inputIds, ...originalIds]));
          this.loadAvailableShiftsWithClient(combinedIds);
          this.loadContainerAbsences();
        },
        error: () => {
          this.isLoading.set(false);
          this.isAvailableShiftsLoading.set(false);
        },
      });
  }

  private loadAvailableShiftsWithClient(shiftIds: string[]): void {
    if (shiftIds.length === 0) {
      this.isAvailableShiftsLoading.set(false);
      return;
    }
    const uniqueIds = Array.from(new Set(shiftIds));
    this.dataShiftService.getShiftsByIds(uniqueIds)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([] as IShift[])),
      )
      .subscribe(fullShifts => {
        const byId = new Map<string, IShift>();
        for (const s of fullShifts) {
          if (s?.id) byId.set(s.id, s);
        }
        const merged = new Map<string, IShift>();
        for (const shift of this.availableShiftsAsIShift) {
          if (!shift.id) continue;
          const full = byId.get(shift.id);
          merged.set(shift.id, full ? { ...full } : shift);
        }
        for (const [id, shift] of byId) {
          if (!merged.has(id)) merged.set(id, shift);
        }
        this.availableShiftsAsIShift = Array.from(merged.values());
        this.availableShiftsVersion.update(v => v + 1);
        this.isAvailableShiftsLoading.set(false);
      });
  }

  private loadContainerAbsences(): void {
    this.dataAbsenceService.readAbsenceList()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([] as IAbsence[])),
      )
      .subscribe(absences => {
        this.containerAbsences.set(absences.filter(a => a.appliesToContainer));
      });
  }

  selectEmploymentTab(): void {
    this.isEmploymentTabActive.set(true);
    this.shiftService.setSelectedShift(null);
  }

  selectDayTab(index: number): void {
    this.selectedTabIndex.set(index);
    this.isEmploymentTabActive.set(false);
    this.shiftService.setSelectedShift(null);
  }

  save(): Observable<ContainerWorkChildren> {
    const items = this.shiftService.selectedContainerTemplateItemsSignal();
    const children = this.buildChildrenFromItems(items);
    children.parentStartBase = this.routeService.selectedStartBase || null;
    children.parentEndBase = this.routeService.selectedEndBase || null;
    return this.childrenService.saveChildren(this.workId, children);
  }

  private applyParentRouteValues(children: ContainerWorkChildren): void {
    this.routeService.selectedStartBase = children.parentStartBase ?? '';
    this.routeService.selectedEndBase = children.parentEndBase ?? '';
    this.routeService.selectedTransportMode =
      (children.parentTransportMode as ContainerTransportModeEnum | null | undefined) ??
      ContainerTransportModeEnum.byCar;
  }

  markDirty(): void {
    this.isDirty.set(true);
  }

  reset(): void {
    if (!this.workId) return;
    this.shiftService.setSelectedShift(null);
    this.isLoading.set(true);
    this.childrenService.loadChildren(this.workId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: children => {
          this.initializeItemsFromChildren(children);
          this.applyParentRouteValues(children);
          this.isDirty.set(false);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  getTimeFrom(): OwnTime {
    if (this.containerStartTime) {
      const parts = this.containerStartTime.split(':');
      return OwnTime.forTime(
        (parts[0] || DEFAULT_TIME_FROM_HOURS).padStart(2, '0'),
        (parts[1] || DEFAULT_TIME_FROM_MINUTES).padStart(2, '0'),
      );
    }
    return OwnTime.forTime(DEFAULT_TIME_FROM_HOURS, DEFAULT_TIME_FROM_MINUTES);
  }

  getTimeTo(): OwnTime {
    if (this.containerEndTime) {
      const parts = this.containerEndTime.split(':');
      return OwnTime.forTime(
        (parts[0] || DEFAULT_TIME_TO_HOURS).padStart(2, '0'),
        (parts[1] || DEFAULT_TIME_TO_MINUTES).padStart(2, '0'),
      );
    }
    return OwnTime.forTime(DEFAULT_TIME_TO_HOURS, DEFAULT_TIME_TO_MINUTES);
  }

  private initializeItemsFromChildren(children: ContainerWorkChildren): void {
    const items: IContainerTemplateItem[] = [];
    const workChangesByWorkId = this.groupWorkChangesByWorkId(children.subWorkChanges ?? []);

    for (const subWork of children.subWorks) {
      const shift = subWork.shift
        ? (subWork.shift as unknown as IShift)
        : this.availableShiftsAsIShift.find(s => s.id === subWork.shiftId);
      const workChanges = workChangesByWorkId.get(subWork.id) ?? [];

      items.push({
        id: subWork.id,
        shiftId: subWork.shiftId,
        shift: shift || undefined,
        absenceId: undefined,
        startItem: subWork.startTime,
        endItem: subWork.endTime,
        briefingTime: this.getWorkChangeTime(workChanges, DESCRIPTION_BRIEFING),
        debriefingTime: this.getWorkChangeTime(workChanges, DESCRIPTION_DEBRIEFING),
        travelTimeBefore: this.getWorkChangeTime(workChanges, DESCRIPTION_TRAVEL_BEFORE),
        travelTimeAfter: this.getWorkChangeTime(workChanges, DESCRIPTION_TRAVEL_AFTER),
        timeRangeStartItem: shift?.isTimeRange ? subWork.startTime : '',
        timeRangeEndItem: shift?.isTimeRange ? subWork.endTime : '',
        transportMode: subWork.transportMode ?? undefined,
      });
    }

    for (const subBreak of children.subBreaks) {
      items.push({
        id: subBreak.id,
        absenceId: subBreak.absenceId,
        absence: subBreak.absence as any,
        shiftId: undefined,
        startItem: subBreak.startTime,
        endItem: subBreak.endTime,
        briefingTime: EMPTY_TIME,
        debriefingTime: EMPTY_TIME,
        travelTimeBefore: EMPTY_TIME,
        travelTimeAfter: EMPTY_TIME,
        timeRangeStartItem: '',
        timeRangeEndItem: '',
      });
    }

    const sortedItems = this.containerStartTime && this.containerEndTime
      ? sortContainerItemsChronologically(items, this.containerStartTime, this.containerEndTime)
      : items;

    this.shiftService.setSelectedContainerTemplateItems(sortedItems);
  }

  private buildChildrenFromItems(items: IContainerTemplateItem[]): ContainerWorkChildren {
    const subWorks: SubWorkResource[] = [];
    const subBreaks: SubBreakResource[] = [];
    const subWorkChanges: WorkChangeResource[] = [];

    for (const item of items) {
      if (item.shiftId) {
        const workId = item.id || crypto.randomUUID();

        subWorks.push({
          id: workId,
          shiftId: item.shiftId,
          clientId: item.shift?.clientId || '',
          currentDate: this.currentDate ? formatDateOnly(this.currentDate) : '',
          startTime: item.shift?.isTimeRange ? (item.timeRangeStartItem || item.startItem || '') : (item.startItem || ''),
          endTime: item.shift?.isTimeRange ? (item.timeRangeEndItem || item.endItem || '') : (item.endItem || ''),
          workTime: item.shift?.workTime || 0,
          parentWorkId: this.workId,
          information: null,
          transportMode: item.transportMode ?? null,
          startBase: null,
          endBase: null,
        });

        this.addWorkChangesForItem(subWorkChanges, item, workId);
      } else if (item.absenceId) {
        subBreaks.push({
          id: item.id || crypto.randomUUID(),
          absenceId: item.absenceId,
          clientId: '',
          currentDate: this.currentDate ? formatDateOnly(this.currentDate) : '',
          startTime: item.startItem || '',
          endTime: item.endItem || '',
          workTime: 0,
          parentWorkId: this.workId,
        });
      }
    }

    return { subWorks, subBreaks, subWorkChanges };
  }

  private addWorkChangesForItem(workChanges: WorkChangeResource[], item: IContainerTemplateItem, workId: string): void {
    const startTime = item.shift?.isTimeRange ? (item.timeRangeStartItem || item.startItem || '') : (item.startItem || '');
    const endTime = item.shift?.isTimeRange ? (item.timeRangeEndItem || item.endItem || '') : (item.endItem || '');

    if (item.briefingTime && item.briefingTime !== EMPTY_TIME) {
      const durationMinutes = this.parseTimeToMinutes(item.briefingTime);
      const briefingStart = this.subtractMinutes(startTime, durationMinutes);
      workChanges.push(this.createWorkChange(workId, WORK_CHANGE_TYPE_CORRECTION_START, DESCRIPTION_BRIEFING, briefingStart, startTime, durationMinutes));
    }

    if (item.debriefingTime && item.debriefingTime !== EMPTY_TIME) {
      const durationMinutes = this.parseTimeToMinutes(item.debriefingTime);
      const debriefingEnd = this.addMinutesToTime(endTime, durationMinutes);
      workChanges.push(this.createWorkChange(workId, WORK_CHANGE_TYPE_CORRECTION_END, DESCRIPTION_DEBRIEFING, endTime, debriefingEnd, durationMinutes));
    }

    if (item.travelTimeBefore && item.travelTimeBefore !== EMPTY_TIME) {
      const durationMinutes = this.parseTimeToMinutes(item.travelTimeBefore);
      const briefingDuration = item.briefingTime && item.briefingTime !== EMPTY_TIME ? this.parseTimeToMinutes(item.briefingTime) : 0;
      const briefingStart = this.subtractMinutes(startTime, briefingDuration);
      const travelStart = this.subtractMinutes(briefingStart, durationMinutes);
      workChanges.push(this.createWorkChange(workId, WORK_CHANGE_TYPE_CORRECTION_START, DESCRIPTION_TRAVEL_BEFORE, travelStart, briefingStart, durationMinutes));
    }

    if (item.travelTimeAfter && item.travelTimeAfter !== EMPTY_TIME) {
      const durationMinutes = this.parseTimeToMinutes(item.travelTimeAfter);
      const debriefingDuration = item.debriefingTime && item.debriefingTime !== EMPTY_TIME ? this.parseTimeToMinutes(item.debriefingTime) : 0;
      const debriefingEnd = this.addMinutesToTime(endTime, debriefingDuration);
      const travelEnd = this.addMinutesToTime(debriefingEnd, durationMinutes);
      workChanges.push(this.createWorkChange(workId, WORK_CHANGE_TYPE_CORRECTION_END, DESCRIPTION_TRAVEL_AFTER, debriefingEnd, travelEnd, durationMinutes));
    }
  }

  private createWorkChange(workId: string, type: number, description: string, startTime: string, endTime: string, durationMinutes: number): WorkChangeResource {
    return {
      id: EMPTY_GUID,
      workId,
      changeTime: durationMinutes / MINUTES_PER_HOUR,
      surcharges: 0,
      startTime,
      endTime,
      type,
      replaceClientId: null,
      description,
      toInvoice: false,
    };
  }

  private groupWorkChangesByWorkId(workChanges: WorkChangeResource[]): Map<string, WorkChangeResource[]> {
    const map = new Map<string, WorkChangeResource[]>();
    for (const wc of workChanges) {
      const list = map.get(wc.workId) ?? [];
      list.push(wc);
      map.set(wc.workId, list);
    }
    return map;
  }

  private getWorkChangeTime(workChanges: WorkChangeResource[], description: string): string {
    const wc = workChanges.find(w => w.description === description);
    if (!wc) return EMPTY_TIME;
    const minutes = Math.abs(wc.changeTime * MINUTES_PER_HOUR);
    const h = Math.floor(minutes / MINUTES_PER_HOUR);
    const m = Math.round(minutes % MINUTES_PER_HOUR);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private parseTimeToMinutes(time: string): number {
    const parts = time.split(':');
    return (parseInt(parts[0] || '0', 10) * MINUTES_PER_HOUR) + parseInt(parts[1] || '0', 10);
  }

  private subtractMinutes(time: string, minutes: number): string {
    const totalMinutes = this.parseTimeToMinutes(time) - minutes;
    const normalized = ((totalMinutes % MAX_MINUTES_IN_DAY) + MAX_MINUTES_IN_DAY) % MAX_MINUTES_IN_DAY;
    const h = Math.floor(normalized / MINUTES_PER_HOUR);
    const m = normalized % MINUTES_PER_HOUR;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
  }

  private addMinutesToTime(time: string, minutes: number): string {
    const totalMinutes = this.parseTimeToMinutes(time) + minutes;
    const normalized = totalMinutes % MAX_MINUTES_IN_DAY;
    const h = Math.floor(normalized / MINUTES_PER_HOUR);
    const m = normalized % MINUTES_PER_HOUR;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
  }

  private convertAvailableShiftToIShift(shift: AvailableShift): IShift {
    return {
      id: shift.id,
      name: shift.name,
      abbreviation: shift.abbreviation,
      startShift: shift.startShift,
      endShift: shift.endShift,
      workTime: shift.workTime,
      clientId: shift.clientId,
      isTimeRange: false,
      isSporadic: false,
    } as IShift;
  }
}
