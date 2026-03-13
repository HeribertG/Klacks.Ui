// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Factory-Service zur Erstellung von Schedule-Agents aus Clients.
 * @param clients - Liste der Clients aus dem Schedule-View
 * @param periodHours - Stunden pro Client aus Verträgen; bei fehlenden Verträgen werden Settings-Defaults verwendet
 */
import { Injectable } from '@angular/core';
import {
  ScheduleAgent,
  IScheduleAgent
} from '../../../models/automation/agent/schedule-agent.model';
import { IAgentFactoryConfig } from '../../../models/automation/agent/agent-factory-config.model';
import {
  IWorkScheduleClient,
  IPeriodHours
} from '../../../models/schedule/work-schedule-class';
import { ISchedulingDefaultSettings } from '../../../models/settings/app-settings.model';

@Injectable({
  providedIn: 'root'
})
export class AgentFactoryService {
  private defaultConfig: IAgentFactoryConfig = {
    maxConsecutiveDays: 5,
    minRestDays: 2,
    minRestHours: 12,
    maxDailyHours: 10,
    maxWeeklyHours: 50,
    maxOptimalGap: 2
  };

  createAgents(
    clients: IWorkScheduleClient[],
    periodHours: Record<string, IPeriodHours>,
    periodProgress: number,
    config?: IAgentFactoryConfig,
    schedulingDefaults?: ISchedulingDefaultSettings
  ): IScheduleAgent[] {
    const mergedConfig = this.mergeConfigWithDefaults(config, schedulingDefaults);

    return clients
      .map(client => this.createAgent(
        client,
        periodHours[client.id],
        periodProgress,
        mergedConfig,
        schedulingDefaults
      ));
  }

  createAgent(
    client: IWorkScheduleClient,
    periodHours: IPeriodHours | undefined,
    periodProgress: number,
    config?: IAgentFactoryConfig,
    schedulingDefaults?: ISchedulingDefaultSettings
  ): IScheduleAgent {
    const mergedConfig = this.mergeConfigWithDefaults(config, schedulingDefaults);

    const agent = new ScheduleAgent(client.id, client);

    agent.maxConsecutiveDays = mergedConfig.maxConsecutiveDays ?? 5;
    agent.minRestDays = mergedConfig.minRestDays ?? 2;
    agent.minRestHours = mergedConfig.minRestHours ?? 12;
    agent.maxDailyHours = mergedConfig.maxDailyHours ?? 10;
    agent.maxWeeklyHours = mergedConfig.maxWeeklyHours ?? 50;
    agent.maxOptimalGap = mergedConfig.maxOptimalGap ?? 2;

    const currentHours = periodHours?.hours ?? 0;
    const guaranteedHours = periodHours?.guaranteedHours
      ?? schedulingDefaults?.guaranteedHours
      ?? 0;
    agent.updateHours(currentHours, guaranteedHours, periodProgress);

    agent.currentState.motivation = guaranteedHours > 0
      ? Math.max(0, (guaranteedHours - currentHours) / guaranteedHours)
      : 0;

    return agent;
  }

  private mergeConfigWithDefaults(
    config?: IAgentFactoryConfig,
    schedulingDefaults?: ISchedulingDefaultSettings
  ): IAgentFactoryConfig {
    return {
      ...this.defaultConfig,
      ...(schedulingDefaults ? {
        maxConsecutiveDays: schedulingDefaults.schedulingMaxConsecutiveDays,
        minRestDays: schedulingDefaults.schedulingMinRestDays,
        minRestHours: schedulingDefaults.schedulingMinPauseHours,
        maxDailyHours: schedulingDefaults.schedulingMaxDailyHours,
        maxWeeklyHours: schedulingDefaults.schedulingMaxWeeklyHours,
        maxOptimalGap: schedulingDefaults.schedulingMaxOptimalGap,
      } : {}),
      ...config,
    };
  }

  updateAgentHours(
    agent: IScheduleAgent,
    periodHours: IPeriodHours | undefined,
    periodProgress: number
  ): void {
    const currentHours = periodHours?.hours ?? 0;
    const guaranteedHours = periodHours?.guaranteedHours ?? 0;
    agent.updateHours(currentHours, guaranteedHours, periodProgress);
  }

  createAgentsWithHistory(
    clients: IWorkScheduleClient[],
    periodHours: Record<string, IPeriodHours>,
    periodProgress: number,
    shiftHistory: Map<string, { shiftId: string; shiftName: string; date: Date; hours: number }[]>,
    config?: IAgentFactoryConfig,
    schedulingDefaults?: ISchedulingDefaultSettings
  ): IScheduleAgent[] {
    const agents = this.createAgents(clients, periodHours, periodProgress, config, schedulingDefaults);

    for (const agent of agents) {
      const history = shiftHistory.get(agent.id);
      if (history) {
        for (const entry of history) {
          agent.addShiftToHistory(entry.shiftId, entry.shiftName, entry.date, entry.hours);
        }
      }
    }

    return agents;
  }
}
