import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DataSkillService } from '../../../infrastructure/api/skills/data-skill.service';
import { SkillRegistryService } from './skill-registry.service';
import {
  ISkillExecuteRequest,
  ISkillExecuteResponse,
  ISkillInvocation,
  SkillResultType
} from './skill.interface';
import { EVENT_BUS_TOKEN } from '../../interfaces/event-bus.interface';
import { DomainEventType } from '../../events/domain-events';

@Injectable()
export class SkillExecutionService {
  private dataSkillService = inject(DataSkillService);
  private skillRegistry = inject(SkillRegistryService);
  private router = inject(Router);
  private eventBus = inject(EVENT_BUS_TOKEN);

  public isExecuting = signal<boolean>(false);
  public lastResult = signal<ISkillExecuteResponse | null>(null);

  async execute(skillName: string, parameters: Record<string, unknown>): Promise<ISkillExecuteResponse> {
    this.isExecuting.set(true);

    try {
      const skill = this.skillRegistry.getSkill(skillName);

      if (skill?.implementation) {
        const result = await skill.implementation.execute(parameters);
        this.handleResult(result);
        this.lastResult.set(result);
        return result;
      }

      const request: ISkillExecuteRequest = { skillName, parameters };
      const result = await firstValueFrom(this.dataSkillService.executeSkill(request));

      this.handleResult(result);
      this.lastResult.set(result);

      return result;
    } catch (error) {
      const errorResult: ISkillExecuteResponse = {
        success: false,
        message: `Error executing skill: ${error}`,
        resultType: SkillResultType.Error
      };
      this.lastResult.set(errorResult);
      return errorResult;
    } finally {
      this.isExecuting.set(false);
    }
  }

  async executeChain(invocations: ISkillInvocation[]): Promise<ISkillExecuteResponse[]> {
    this.isExecuting.set(true);

    try {
      const results = await firstValueFrom(
        this.dataSkillService.executeSkillChain({ invocations })
      );

      for (const result of results) {
        this.handleResult(result);
      }

      if (results.length > 0) {
        this.lastResult.set(results[results.length - 1]);
      }

      return results;
    } catch (error) {
      const errorResult: ISkillExecuteResponse = {
        success: false,
        message: `Error executing skill chain: ${error}`,
        resultType: SkillResultType.Error
      };
      return [errorResult];
    } finally {
      this.isExecuting.set(false);
    }
  }

  async executeFromLLMResponse(functionCalls: { name: string; arguments: Record<string, unknown> }[]): Promise<ISkillExecuteResponse[]> {
    const results: ISkillExecuteResponse[] = [];

    for (const call of functionCalls) {
      const result = await this.execute(call.name, call.arguments);
      results.push(result);

      this.eventBus.emit(DomainEventType.SKILL_EXECUTED, {
        skillName: call.name,
        result
      });

      if (!result.success) {
        break;
      }
    }

    return results;
  }

  private handleResult(result: ISkillExecuteResponse): void {
    if (result.resultType === SkillResultType.Navigation && result.data) {
      const navData = result.data as { Route?: string; route?: string };
      const route = navData.Route || navData.route;
      if (route) {
        this.router.navigateByUrl(route);
      }
    }

    if (result.resultType === SkillResultType.UI) {
      this.eventBus.emit(DomainEventType.SKILL_UI_ACTION, result);
    }
  }
}
