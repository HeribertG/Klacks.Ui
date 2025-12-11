import { inject, Injectable, signal } from '@angular/core';
import {
  IClientWork,
  IWork,
  IWorkFilter,
  Work,
  WorkFilter,
} from 'src/app/domain/models/schedule-class';
import {
  IShiftSchedule,
  IShiftScheduleFilter,
  ShiftScheduleFilter,
} from 'src/app/domain/models/shift-schedule-class';
import { DataScheduleService } from 'src/app/infrastructure/api/data-schedule.service';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/data-shift-schedule.service';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/shared/helpers/object.helper';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataManagementScheduleService implements ILoadable {
  private dataSchedule = inject(DataScheduleService);
  private dataShiftSchedule = inject(DataShiftScheduleService);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroy$ = new Subject<void>();

  constructor() {
    this.registry.register(
      RouteName.SCHEDULE,
      DataManagementScheduleService
    );
  }

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

  public isRead = signal(false);
  public isShiftScheduleRead = signal(false);
  public isUpdate = signal<IWork | undefined>(undefined);

  public workFilter: IWorkFilter = new WorkFilter();
  public get currentFilter(): IWorkFilter { return this.workFilter; }
  public shiftScheduleFilter: IShiftScheduleFilter = new ShiftScheduleFilter();
  public clients: IClientWork[] = [];
  public shiftSchedules: IShiftSchedule[] = [];
  public holidayDates: Date[] = [];
  private _restoreSearchSignal = signal('');
  public restoreSearch = { set: (value: string) => this._restoreSearchSignal.set(value) };
  public onExternalFilterChange?: () => void;

  private workFilterDummy: IWorkFilter | undefined = undefined;

  readDatas() {
    this._showProgressSpinner.set(true);
    this.dataSchedule.getClientList(this.workFilter).pipe(takeUntil(this.destroy$)).subscribe((x) => {
      this.clients = x;
      this.workFilterDummy = cloneObject<IWorkFilter>(this.workFilter);
      this.isRead.set(true);
      this._showProgressSpinner.set(false);
      setTimeout(() => this.isRead.set(false), 100);
    });

    this.readShiftSchedule();
  }

  readShiftSchedule() {
    this.shiftScheduleFilter.dayVisibleBeforeMonth = this.workFilter.dayVisibleBeforeMonth;
    this.shiftScheduleFilter.dayVisibleAfterMonth = this.workFilter.dayVisibleAfterMonth;
    this.shiftScheduleFilter.currentMonth = this.workFilter.currentMonth;
    this.shiftScheduleFilter.currentYear = this.workFilter.currentYear;
    this.shiftScheduleFilter.holidayDates = this.holidayDates.length > 0 ? this.holidayDates : undefined;
    this.shiftScheduleFilter.selectedGroup = this.workFilter.selectedGroup || undefined;

    this.dataShiftSchedule.getShiftSchedule(this.shiftScheduleFilter).pipe(takeUntil(this.destroy$)).subscribe((x) => {
      this.shiftSchedules = x;
      this.isShiftScheduleRead.set(true);
      setTimeout(() => this.isShiftScheduleRead.set(false), 100);
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
  get rows(): number {
    return this.clients.length;
  }

  addWork(index: number, value: IWork) {
    if (index < this.clients.length) {
      const client = this.clients[index];
      const tmp = value as Work;
      value.clientId = client.id!;
      delete tmp.id;
      this.dataSchedule.addWork(tmp).pipe(takeUntil(this.destroy$)).subscribe((x) => {
        client.works.push(x);
        client.works = this.sortWorks(client.works);
        this.isUpdate.set(x);
        setTimeout(() => this.isUpdate.set(undefined), 100);
      });
    }
  }

  deleteWork(index: number, value: IWork) {
    if (value.id) {
      this.dataSchedule.deleteWork(value.id!).pipe(takeUntil(this.destroy$)).subscribe(() => {
        const client = this.clients[index];
        client.works = this.sortWorks(
          client.works.filter((obj) => obj.id !== value.id)
        );
        this.isUpdate.set(value);
        setTimeout(() => this.isUpdate.set(undefined), 100);
      });
    }
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

  async updateWork(index: number, value: IWork) {
    return this.dataSchedule.updateWork(value as Work).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const client = this.clients[index];
      client.works = this.sortWorks(client.works);
      this.isUpdate.set(value);
      setTimeout(() => this.isUpdate.set(undefined), 100);
    });
  }

  indexOfWork(value: IWork): number {
    const client = this.clients.find((x) => x.id === value.clientId);
    if (client) {
      return client.works.findIndex((x) => x.id === value.id);
    }
    return -1;
  }

  private sortWorks(value: IWork[]): IWork[] {
    return value.sort((a: IWork, b: IWork) => {
      const da = new Date(a.from!).getTime();
      const db = new Date(b.from!).getTime();

      return da < db ? -1 : da > db ? 1 : 0;
    });
  }

  private isFilter_Dirty(): boolean {
    const a = this.workFilter as IWorkFilter;
    const b = this.workFilterDummy as IWorkFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
