import { Injectable, inject } from '@angular/core';
import {
  IScheduleAgent,
  IAgentState
} from '../../../models/automation/agent/schedule-agent.model';
import { IRuleViolation, IScheduleContext, IShiftAssignment } from '../../../models/automation/rules/rule.model';
import { RulesEngineService } from '../rules/rules-engine.service';

@Injectable({
  providedIn: 'root'
})
export class AgentStateService {

  private rulesEngine = inject(RulesEngineService);

  calculateState(
    agent: IScheduleAgent,
    shiftId: string,
    shiftName: string,
    proposedHours: number,
    ruleViolations: IRuleViolation[]
  ): IAgentState {
    const hunger = this.calculateHunger(agent);
    const satiety = Math.max(0, 1 - hunger);
    const greed = this.calculateGreed(agent, shiftId);
    const disgust = this.calculateDisgust(ruleViolations);
    const motivation = this.calculateMotivation(hunger, satiety, greed, disgust);

    return {
      physiology: { hunger, satiety },
      psychology: { greed, disgust },
      motivation
    };
  }

  calculateStateWithRules(
    agent: IScheduleAgent,
    shiftId: string,
    shiftName: string,
    date: Date,
    startTime: string,
    endTime: string,
    proposedHours: number
  ): IAgentState {
    const context = this.buildScheduleContext(agent, shiftId, shiftName, date, startTime, endTime, proposedHours);
    const { violations } = this.rulesEngine.evaluate(context);
    return this.calculateState(agent, shiftId, shiftName, proposedHours, violations);
  }

  calculateHunger(agent: IScheduleAgent): number {
    if (agent.guaranteedHours === 0) return 0;

    const hourDeficit = Math.max(0, 1 - agent.currentHours / agent.guaranteedHours);
    const timePressure = this.calculateTimePressure(agent);

    return Math.min(1, hourDeficit * (1 + timePressure));
  }

  calculateGreed(agent: IScheduleAgent, shiftId: string): number {
    const history = agent.getShiftHistory(shiftId);
    if (!history || history.count === 0) return 0;

    const frequencyFactor = Math.min(1, history.count / 10);
    const recencyFactor = this.calculateRecencyFactor(history.lastDate);
    const satisfactionFactor = history.averageSatisfaction;

    return Math.min(1, frequencyFactor * 0.4 + recencyFactor * 0.3 + satisfactionFactor * 0.3);
  }

  calculateDisgust(ruleViolations: IRuleViolation[]): number {
    if (ruleViolations.length === 0) return 0;

    const maxSeverity = Math.max(...ruleViolations.map(v => v.severity));
    const avgSeverity = ruleViolations.reduce((sum, v) => sum + v.severity, 0) / ruleViolations.length;

    return Math.min(1, maxSeverity * 0.7 + avgSeverity * 0.3);
  }

  // Disgust suppresses hunger and greed entirely
  calculateMotivation(hunger: number, satiety: number, greed: number, disgust: number): number {
    const disgustSuppression = 1 - disgust;
    const baseMotivation = hunger * 0.6 + greed * 0.3 + (1 - satiety) * 0.1;

    return Math.min(1, Math.max(0, baseMotivation * disgustSuppression));
  }

  private calculateTimePressure(agent: IScheduleAgent): number {
    const remainingRatio = agent.guaranteedHours > 0
      ? agent.getRemainingHours() / agent.guaranteedHours
      : 0;

    if (agent.periodProgress < 0.5) {
      return remainingRatio * 0.5;
    }

    const progressFactor = (agent.periodProgress - 0.5) * 2;
    return Math.min(1, remainingRatio * (0.5 + progressFactor));
  }

  private calculateRecencyFactor(lastDate: Date | null): number {
    if (!lastDate) return 0;

    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince < 7) return 0;
    if (daysSince < 14) return 0.3;
    if (daysSince < 30) return 0.6;
    return 1;
  }

  private buildScheduleContext(
    agent: IScheduleAgent,
    shiftId: string,
    shiftName: string,
    date: Date,
    startTime: string,
    endTime: string,
    hours: number
  ): IScheduleContext {
    const existingAssignments: IShiftAssignment[] = [];

    for (const block of agent.workBlocks) {
      for (let i = 0; i < block.shiftIds.length; i++) {
        existingAssignments.push({
          shiftId: block.shiftIds[i],
          shiftName: '',
          date: new Date(block.startDate.getTime() + i * 24 * 60 * 60 * 1000),
          startTime: '00:00',
          endTime: '00:00',
          hours: block.hours / block.shiftIds.length
        });
      }
    }

    return {
      agentId: agent.id,
      currentDate: date,
      proposedAssignment: { shiftId, shiftName, date, startTime, endTime, hours },
      existingAssignments,
      workQuants: []
    };
  }
}
