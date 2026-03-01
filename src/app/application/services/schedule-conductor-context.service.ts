// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AgentFactoryService } from 'src/app/domain/services/automation/agent/agent-factory.service';
import { IConductorContext } from 'src/app/domain/models/automation/conductor/conductor-context.model';
import { IShift } from 'src/app/domain/models/automation/conductor/shift.model';
import { IWorkScheduleClient, IPeriodHours } from 'src/app/domain/models/schedule/work-schedule-class';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';

@Injectable({
  providedIn: 'root',
})
export class ScheduleConductorContextService {
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private agentFactory = inject(AgentFactoryService);

  buildContext(): IConductorContext | null {
    const shiftSchedules = this.dataManagementSchedule.shiftSchedules;
    const clients = this.dataManagementSchedule.clients;
    const startDate = this.dataManagementSchedule.visibleStartDate;
    const endDate = this.dataManagementSchedule.visibleEndDate;

    if (!startDate || !endDate || shiftSchedules.length === 0 || clients.length === 0) {
      return null;
    }

    const shifts = this.mapShifts(shiftSchedules);
    const workScheduleClients = this.mapClients(clients);
    const periodHoursRecord = this.convertPeriodHours();
    const periodProgress = this.calculatePeriodProgress(startDate, endDate);
    const agents = this.agentFactory.createAgents(workScheduleClients, periodHoursRecord, periodProgress);

    return { startDate, endDate, shifts, agents };
  }

  private mapShifts(shiftSchedules: IShiftSchedule[]): IShift[] {
    return shiftSchedules.map(s => ({
      id: `${s.shiftId}_${this.formatDate(s.date)}`,
      name: s.shiftName,
      date: s.date instanceof Date ? s.date : new Date(s.date),
      startTime: s.startShift,
      endTime: s.endShift,
      hours: s.workTime,
      requiredAssignments: s.quantity,
      priority: s.isSporadic ? 2 : 1,
    }));
  }

  private mapClients(clients: IClientWork[]): IWorkScheduleClient[] {
    return clients.map(c => ({
      id: c.id,
      company: c.company ?? null,
      firstName: c.firstName ?? null,
      name: c.name ?? null,
      secondName: c.secondName ?? null,
      title: c.title ?? null,
      maidenName: c.maidenName ?? null,
      gender: c.gender,
      idNumber: c.idNumber,
      legalEntity: c.legalEntity,
      type: c.type,
      neededRows: c.neededRows,
      hasContract: c.hasContract,
    }));
  }

  private convertPeriodHours(): Record<string, IPeriodHours> {
    const map = this.dataManagementSchedule.periodHours;
    const record: Record<string, IPeriodHours> = {};
    map.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }

  private calculatePeriodProgress(startDate: Date, endDate: Date): number {
    const now = new Date();
    const totalMs = endDate.getTime() - startDate.getTime();
    if (totalMs <= 0) return 1;
    const elapsedMs = now.getTime() - startDate.getTime();
    return Math.max(0, Math.min(1, elapsedMs / totalMs));
  }

  private formatDate(date: Date): string {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
