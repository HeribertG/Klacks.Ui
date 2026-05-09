// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  inject,
  Injectable,
  signal,
  effect,
  Injector,
  runInInjectionContext,
  WritableSignal,
  DestroyRef,
} from '@angular/core';
import { Subject, timer } from 'rxjs';
import { debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IClientWork,
  IWork,
  IWorkFilter,
  WorkFilter,
} from 'src/app/domain/models/schedule/schedule-class';
import {
  IShiftSchedule,
  IShiftScheduleFilter,
} from 'src/app/domain/models/schedule/shift-schedule-class';
import {
  IPeriodHours,
  IScheduleCell,
  WorkScheduleByClientAndDate,
} from 'src/app/domain/models/schedule/work-schedule-class';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/shared/helpers/object.helper';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { BreakPlaceholderScheduleLoaderService } from './break-placeholder-schedule-loader.service';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { WorkScheduleLoaderService } from './work-schedule-loader.service';
import { DataManagementWorkService } from '../work/data-management-work.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import {
  ScheduleEntryCrudService,
  DeleteWorkScheduleEntryParams,
  ScheduleCellParams,
  BreakCellParams,
} from './schedule-entry-crud.service';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { ClientSortPreferenceService } from './client-sort-preference.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementScheduleService implements ILoadable {
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private injector = inject(Injector);

  private breakPlaceholderLoader = inject(BreakPlaceholderScheduleLoaderService);
  private shiftLoader = inject(ShiftScheduleLoaderService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private workCrud = inject(DataManagementWorkService);
  private availableShiftsCalc = inject(AvailableShiftsCalculatorService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private readonly clientSortPreference = inject(ClientSortPreferenceService);

  private _lastAnalyseToken: string | null = this.analyseScenarioService.activeToken();

  private readonly READ_DATAS_DEBOUNCE_MS = 300;
  private readonly SPINNER_SAFETY_TIMEOUT_MS = 30_000;

  private readDatasTrigger$ = new Subject<boolean>();
  private spinnerSafetyCancel$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.registry.register(RouteName.SCHEDULE, DataManagementScheduleService);
    this.setupCrudEffects();
    this.setupReadDatasPipeline();
    this.setupSpinnerSafetyPipeline();
  }

  private setupReadDatasPipeline(): void {
    this.readDatasTrigger$
      .pipe(
        debounceTime(this.READ_DATAS_DEBOUNCE_MS),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resetScroll) => this.executeReadDatas(resetScroll));
  }

  private setupSpinnerSafetyPipeline(): void {
    this.spinnerSafetyCancel$
      .pipe(
        switchMap(() => timer(this.SPINNER_SAFETY_TIMEOUT_MS).pipe(takeUntil(this.spinnerSafetyCancel$))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this._showProgressSpinner()) {
          this._showProgressSpinner.set(false);
        }
      });
  }

  private setupCrudEffects(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        if (this.scheduleEntryCrud.scheduleRefreshed())
          this.bumpReadCounter(this.isRead);
      });

      effect(() => {
        if (this.scheduleEntryCrud.shiftScheduleRefreshed())
          this.bumpReadCounter(this.isShiftScheduleRead);
      });

      effect(() => {
        if (!this.breakPlaceholderLoader.isLoaded()) return;
        if (!this.showBreakPlaceholders()) return;

        this.workScheduleLoader.applyBreakPlaceholderRows();
        this.bumpReadCounter(this.isRead);
      });

      effect(() => {
        const token = this.analyseScenarioService.activeToken();
        if (token === this._lastAnalyseToken) return;
        this._lastAnalyseToken = token;
        this.readDatas(false);
      });
    });
  }

  private bumpReadCounter(target: WritableSignal<{ count: number; resetScroll: boolean }>): void {
    target.update(v => ({ count: v.count + 1, resetScroll: false }));
  }

  public showBreakPlaceholders = signal(false);
  public showAvailability = signal(false);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isRead = signal<{ count: number; resetScroll: boolean }>({
    count: 0,
    resetScroll: true,
  });
  public isShiftScheduleRead = signal<{ count: number; resetScroll: boolean }>(
    { count: 0, resetScroll: true },
  );
  public isWorkScheduleRead = signal(0);

  get workScheduleChunkLoaded() {
    return this.workScheduleLoader.isRead;
  }

  public workFilter: IWorkFilter = new WorkFilter();
  public get currentFilter(): IWorkFilter {
    return this.workFilter;
  }
  public holidayDates: Date[] = [];

  private _cachedStartDate: Date | null = null;
  private _cachedEndDate: Date | null = null;

  private _restoreSearchSignal = signal('');
  public restoreSearch = {
    set: (value: string) => this._restoreSearchSignal.set(value),
  };
  public onExternalFilterChange?: () => void;

  private workFilterDummy: IWorkFilter | undefined = undefined;

  get isUpdate() {
    return this.workCrud.isUpdate;
  }

  get shiftScheduleFilter(): IShiftScheduleFilter {
    return this.shiftLoader.shiftScheduleFilter;
  }

  get shiftSchedules(): IShiftSchedule[] {
    return this.shiftLoader.shiftSchedules;
  }

  get clients(): IClientWork[] {
    if (this.workScheduleLoader.individualSortActive) {
      return this.clientSortPreference.applyTo(this.workScheduleLoader.clients);
    }
    return this.workScheduleLoader.clients;
  }

  get workScheduleEntries(): IScheduleCell[] {
    return this.workScheduleLoader.workScheduleEntries;
  }

  get workScheduleByClientAndDate(): WorkScheduleByClientAndDate {
    return this.workScheduleLoader.workScheduleByClientAndDate;
  }

  get periodHours(): Map<string, IPeriodHours> {
    return this.workScheduleLoader.periodHours;
  }

  get clientAvailabilities(): Map<string, Map<string, string>> {
    return this.workScheduleLoader.clientAvailabilities;
  }

  get visibleStartDate(): Date | null {
    return this.workScheduleLoader.startDate ?? this._cachedStartDate;
  }

  get visibleEndDate(): Date | null {
    return this.workScheduleLoader.endDate ?? this._cachedEndDate;
  }

  get periodStartDate(): Date | null {
    if (!this.workFilter) return null;
    return this.workScheduleLoader.getPeriodStartDate(this.workFilter);
  }

  get periodEndDate(): Date | null {
    if (!this.workFilter) return null;
    return this.workScheduleLoader.getPeriodEndDate(this.workFilter);
  }

  get sealedDates(): Set<string> {
    return this.workScheduleLoader.sealedDates;
  }

  get availableShiftsByDay(): readonly (readonly string[])[] {
    return this.availableShiftsCalc.availableShiftsByDay;
  }

  get overbookedShiftsByDay(): readonly (readonly string[])[] {
    return this.availableShiftsCalc.overbookedShiftsByDay;
  }

  get hasAvailabilityData(): boolean {
    return this.workScheduleLoader.clientAvailabilities.size > 0;
  }

  get isLoadingMore(): boolean {
    return this.shiftLoader.isLoadingMore;
  }

  get hasMoreShifts(): boolean {
    return this.shiftLoader.hasMoreShifts;
  }

  get shiftLoadingProgress(): number {
    return this.shiftLoader.shiftLoadingProgress;
  }

  get totalAvailableShifts(): number {
    return this.shiftLoader.totalAvailableShifts;
  }

  get rows(): number {
    return this.clients.length;
  }

  readDatas(resetScroll = true) {
    const groupId = this.workFilter.selectedGroup;
    if (groupId) {
      void this.clientSortPreference.loadForGroup(groupId);
    }
    this._showProgressSpinner.set(true);
    this.spinnerSafetyCancel$.next();
    this.readDatasTrigger$.next(resetScroll);
  }

  private executeReadDatas(resetScroll: boolean): void {
    const dates = this.workScheduleLoader.calculateVisibleDates(this.workFilter);
    this._cachedStartDate = new Date(dates.startDate);
    this._cachedEndDate = new Date(dates.endDate);
    this.readWorkSchedule(resetScroll);
    this.readShiftSchedule(resetScroll, dates.startDate, dates.endDate);
    this.breakPlaceholderLoader.load(
      dates.startDate,
      dates.endDate,
      this.workFilter,
    );
  }

  readShiftSchedule(resetScroll = true, startDate?: string, endDate?: string) {
    const dates =
      startDate && endDate
        ? { startDate, endDate }
        : this.workScheduleLoader.calculateVisibleDates(this.workFilter);

    this.shiftLoader.load(
      dates.startDate,
      dates.endDate,
      this.workFilter,
      this.holidayDates,
      () => {
        this.availableShiftsCalc.calculate(
          this.shiftSchedules,
          this.workFilter,
        );
        this.isShiftScheduleRead.update(v => ({ count: v.count + 1, resetScroll }));
      },
    );
  }

  readWorkSchedule(resetScroll = true, onComplete?: () => void) {
    this.workScheduleLoader.load(this.workFilter, () => {
      this.workFilterDummy = cloneObject<IWorkFilter>(this.workFilter);
      this._showProgressSpinner.set(false);
      this.spinnerSafetyCancel$.next();
      this.isRead.update(v => ({ count: v.count + 1, resetScroll }));
      this.isWorkScheduleRead.update(v => v + 1);
      if (onComplete) {
        setTimeout(onComplete, 0);
      }
    });
  }

  readData(index: number): IWork[] | undefined {
    if (index < this.clients.length) {
      const client = this.clients[index];
      if (client && client.works) {
        return client.works;
      }
    }
    return undefined;
  }

  readClientId(index: number): string | undefined {
    if (index < this.clients.length) {
      const client = this.clients[index];
      if (client) {
        return client.id;
      }
    }
    return undefined;
  }

  getWorkScheduleForClientAndDate(
    clientId: string,
    date: Date,
  ): IScheduleCell[] {
    return this.workScheduleLoader.getWorkScheduleForClientAndDate(
      clientId,
      date,
    );
  }

  getMaxEntriesPerClientAndDate(): Map<string, number> {
    return this.workScheduleLoader.getMaxEntriesPerClientAndDate();
  }

  addWork(index: number, value: IWork) {
    this.workCrud.addWork(this.workScheduleLoader.clients, index, value);
  }

  deleteWork(index: number, value: IWork) {
    this.workCrud.deleteWork(this.workScheduleLoader.clients, index, value);
  }

  async updateWork(index: number, value: IWork) {
    this.workCrud.updateWork(this.workScheduleLoader.clients, index, value);
  }

  indexOfWork(value: IWork): number {
    return this.workCrud.indexOfWork(this.workScheduleLoader.clients, value);
  }

  addWorkScheduleEntry(params: {
    clientId: string;
    date: Date;
    shiftId: string;
    workTime: number;
    startTime: string;
    endTime: string;
  }): Promise<void> {
    return this.scheduleEntryCrud.addWorkScheduleEntry(params, this.workFilter);
  }

  deleteWorkScheduleEntry(
    id: string,
    sourceId: string,
    clientId: string,
    date: Date,
    entryId: string,
    entryType: number,
  ): void {
    this.scheduleEntryCrud.deleteWorkScheduleEntry(
      { id, sourceId, clientId, date, entryId, entryType },
      this.workFilter,
    );
  }

  bulkDeleteWorkScheduleEntries(
    entries: DeleteWorkScheduleEntryParams[],
  ): void {
    this.scheduleEntryCrud.bulkDeleteWorkScheduleEntries(
      entries,
      this.workFilter,
    );
  }

  bulkAddWorkScheduleEntries(entries: ScheduleCellParams[]): Promise<void> {
    return this.scheduleEntryCrud.bulkAddWorkScheduleEntries(
      entries,
      this.workFilter,
    );
  }

  bulkAddBreakScheduleEntries(entries: BreakCellParams[]): Promise<void> {
    return this.scheduleEntryCrud.bulkAddBreakScheduleEntries(entries);
  }

  refreshClientScheduleForDays(
    clientId: string,
    centerDate: Date,
  ): Promise<void> {
    return this.scheduleEntryCrud.refreshClientScheduleForDays(
      clientId,
      centerDate,
    );
  }

  refreshClientScheduleForDateRange(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    return this.scheduleEntryCrud.refreshClientScheduleForDateRange(clientId, startDate, endDate);
  }

  private isFilter_Dirty(): boolean {
    const a = this.workFilter as IWorkFilter;
    const b = this.workFilterDummy as IWorkFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  toggleAvailability(): void {
    this.showAvailability.update(v => !v);
    this.isRead.update(v => ({ count: v.count + 1, resetScroll: false }));
  }

  toggleBreakPlaceholders(): void {
    const newValue = !this.showBreakPlaceholders();
    this.showBreakPlaceholders.set(newValue);
    this.breakPlaceholderLoader.visible = newValue;

    if (newValue) {
      this.workScheduleLoader.applyBreakPlaceholderRows();
    } else {
      this.workScheduleLoader.resetToNeededRows();
    }

    this.isRead.update(v => ({ count: v.count + 1, resetScroll: false }));
  }

  public destroy(): void {
    this.workCrud.destroy();
  }
}
