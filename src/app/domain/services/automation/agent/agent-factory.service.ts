import { Injectable } from '@angular/core';
import {
  ScheduleAgent,
  IScheduleAgent
} from '../../../models/automation/agent/schedule-agent.model';
import {
  IWorkScheduleClient,
  IPeriodHours
} from '../../../models/schedule/work-schedule-class';

export interface IAgentFactoryConfig {
  maxConsecutiveDays?: number;
  minRestDays?: number;
  minRestHours?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AgentFactoryService {
  private defaultConfig: IAgentFactoryConfig = {
    maxConsecutiveDays: 5,
    minRestDays: 2,
    minRestHours: 12
  };

  createAgents(
    clients: IWorkScheduleClient[],
    periodHours: Record<string, IPeriodHours>,
    periodProgress: number,
    config?: IAgentFactoryConfig
  ): IScheduleAgent[] {
    const mergedConfig = { ...this.defaultConfig, ...config };

    return clients
      .filter(client => client.hasContract)
      .map(client => this.createAgent(client, periodHours[client.id], periodProgress, mergedConfig));
  }

  createAgent(
    client: IWorkScheduleClient,
    periodHours: IPeriodHours | undefined,
    periodProgress: number,
    config?: IAgentFactoryConfig
  ): IScheduleAgent {
    const mergedConfig = { ...this.defaultConfig, ...config };

    const agent = new ScheduleAgent(client.id, client);

    agent.maxConsecutiveDays = mergedConfig.maxConsecutiveDays ?? 5;
    agent.minRestDays = mergedConfig.minRestDays ?? 2;
    agent.minRestHours = mergedConfig.minRestHours ?? 12;

    const currentHours = periodHours?.hours ?? 0;
    const guaranteedHours = periodHours?.guaranteedHours ?? 0;
    agent.updateHours(currentHours, guaranteedHours, periodProgress);

    return agent;
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
    config?: IAgentFactoryConfig
  ): IScheduleAgent[] {
    const agents = this.createAgents(clients, periodHours, periodProgress, config);

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
