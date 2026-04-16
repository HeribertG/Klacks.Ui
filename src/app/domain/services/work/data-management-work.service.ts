// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  IClientWork,
  IWork,
  Work,
} from 'src/app/domain/models/schedule/schedule-class';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { BulkAddWorksRequest } from 'src/app/infrastructure/api/dtos/bulk-add-works-request.dto';
import { BulkWorksResponse } from 'src/app/infrastructure/api/dtos/bulk-works-response.dto';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { AnalyseScenarioService } from '../schedule/analyse-scenario.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementWorkService {
  private dataSchedule = inject(DataScheduleService);
  private destroyRef = inject(DestroyRef);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private destroy$ = new Subject<void>();

  private _isUpdate = signal<IWork | undefined>(undefined);

  get isUpdate() {
    return this._isUpdate;
  }

  addWork(clients: IClientWork[], index: number, value: IWork): void {
    if (index < clients.length) {
      const client = clients[index];
      const tmp = value as Work;
      value.clientId = client.id!;
      tmp.analyseToken = tmp.analyseToken ?? this.analyseScenarioService.activeToken() ?? undefined;
      delete tmp.id;
      this.dataSchedule.addWork(tmp).pipe(takeUntil(this.destroy$)).subscribe((x) => {
        client.works.push(x);
        client.works = this.sortWorks(client.works);
        this._isUpdate.set(x);
        setTimeout(() => this._isUpdate.set(undefined), 100);
      });
    }
  }

  deleteWork(clients: IClientWork[], index: number, value: IWork): void {
    if (value.id && value.periodStart && value.periodEnd) {
      this.dataSchedule.deleteWork(value.id, value.periodStart, value.periodEnd).pipe(takeUntil(this.destroy$)).subscribe(() => {
        const client = clients[index];
        client.works = this.sortWorks(
          client.works.filter((obj) => obj.id !== value.id)
        );
        this._isUpdate.set(value);
        setTimeout(() => this._isUpdate.set(undefined), 100);
      });
    }
  }

  updateWork(clients: IClientWork[], index: number, value: IWork): void {
    value.analyseToken = value.analyseToken ?? this.analyseScenarioService.activeToken() ?? undefined;
    this.dataSchedule.updateWork(value as Work).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const client = clients[index];
      client.works = this.sortWorks(client.works);
      this._isUpdate.set(value);
      setTimeout(() => this._isUpdate.set(undefined), 100);
    });
  }

  createWork(params: {
    clientId: string;
    shiftId: string;
    date: Date;
    workTime: number;
    startTime: string;
    endTime: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<IWork> {
    return new Promise((resolve, reject) => {
      const work = new Work();
      work.clientId = params.clientId;
      work.shiftId = params.shiftId;
      work.currentDate = params.date;
      work.workTime = params.workTime;
      work.startTime = params.startTime;
      work.endTime = params.endTime;
      work.periodStart = params.periodStart;
      work.periodEnd = params.periodEnd;
      work.analyseToken = this.analyseScenarioService.activeToken() ?? undefined;

      this.dataSchedule.addWork(work)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => resolve(response),
          error: (err) => {
            console.error('Error creating work entry:', err);
            reject(err);
          },
        });
    });
  }

  deleteWorkById(workId: string, periodStart: string, periodEnd: string): Promise<IWork> {
    return new Promise((resolve, reject) => {
      this.dataSchedule.deleteWork(workId, periodStart, periodEnd)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => resolve(response),
          error: (err) => {
            console.error('Error deleting work entry:', err);
            reject(err);
          },
        });
    });
  }

  bulkDeleteWorks(workIds: string[]): Promise<BulkWorksResponse> {
    return new Promise((resolve, reject) => {
      this.dataSchedule.bulkDeleteWorks(workIds)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => resolve(response),
          error: (err) => {
            console.error('Error bulk deleting works:', err);
            reject(err);
          },
        });
    });
  }

  bulkCreateWorks(params: {
    entries: {
      clientId: string;
      shiftId: string;
      date: Date;
      workTime: number;
      startTime: string;
      endTime: string;
      information?: string;
    }[];
    periodStart: string;
    periodEnd: string;
  }): Promise<BulkWorksResponse> {
    const analyseToken = this.analyseScenarioService.activeToken() ?? undefined;
    const request: BulkAddWorksRequest = {
      works: params.entries.map(e => ({
        clientId: e.clientId,
        shiftId: e.shiftId,
        currentDate: formatDateOnly(e.date),
        workTime: e.workTime,
        startTime: e.startTime,
        endTime: e.endTime,
        information: e.information,
        analyseToken,
      })),
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    };

    return new Promise((resolve, reject) => {
      this.dataSchedule.bulkAddWorks(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => resolve(response),
          error: (err) => {
            console.error('Error bulk creating works:', err);
            reject(err);
          },
        });
    });
  }

  indexOfWork(clients: IClientWork[], value: IWork): number {
    const client = clients.find((x) => x.id === value.clientId);
    if (client) {
      return client.works.findIndex((x) => x.id === value.id);
    }
    return -1;
  }

  private sortWorks(value: IWork[]): IWork[] {
    return value.sort((a: IWork, b: IWork) => {
      const da = new Date(a.currentDate).getTime();
      const db = new Date(b.currentDate).getTime();
      return da < db ? -1 : da > db ? 1 : 0;
    });
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
