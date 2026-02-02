import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  ISkillExecuteResponse,
  ISkillImplementation,
  SkillResultType
} from '../skill.interface';

@Injectable({
  providedIn: 'root',
})
export class NavigationSkillImplementation implements ISkillImplementation {
  private router = inject(Router);

  private routes: Record<string, string> = {
    dashboard: '/dashboard',
    employees: '/employees',
    'employee-details': '/employees',
    schedule: '/schedule',
    absences: '/absences',
    reports: '/reports',
    settings: '/settings',
    groups: '/groups',
    contracts: '/contracts',
    holidays: '/holidays'
  };

  async execute(params: Record<string, unknown>): Promise<ISkillExecuteResponse> {
    const page = params['page'] as string;
    const entityId = params['entityId'] as string | undefined;
    const tab = params['tab'] as string | undefined;

    const baseRoute = this.routes[page?.toLowerCase()];
    if (!baseRoute) {
      return {
        success: false,
        message: `Unknown page: ${page}`,
        resultType: SkillResultType.Error
      };
    }

    let route = baseRoute;
    if (entityId) {
      route += `/${entityId}`;
    }

    const queryParams: Record<string, string> = {};
    if (tab) {
      queryParams['tab'] = tab;
    }

    await this.router.navigate([route], { queryParams });

    return {
      success: true,
      message: `Navigated to ${page}`,
      resultType: SkillResultType.Navigation,
      data: { route, page, entityId, tab }
    };
  }
}
