// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP access to the scheduling rules endpoint and the two lists that hang off it: the holiday
 * work exemptions and the contracts left on rules of a no longer active industry.
 * @param page - Zero-based page index of the paged rule list
 * @param pageSize - Number of rules requested per page
 * @param assignments - Contract-to-rule moves an admin confirmed in the migration list
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ISchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';
import { IHolidayWorkExemption } from 'src/app/domain/models/scheduling/holiday-work-exemption.model';
import { IIndustryMigrationCandidate } from 'src/app/domain/models/scheduling/industry-migration-candidate.model';
import { IContractSchedulingRuleAssignment } from 'src/app/domain/models/scheduling/contract-scheduling-rule-assignment.model';

@Injectable({
  providedIn: 'root'
})
export class SchedulingRuleApiService {
  private http = inject(HttpClient);

  getAll(page = 0, pageSize = 1000): Promise<ISchedulingRule[]> {
    return firstValueFrom(this.http.get<ISchedulingRule[]>(`${environment.baseUrl}schedulingrules?page=${page}&pageSize=${pageSize}`).pipe(retry(3)));
  }

  getSelectable(): Promise<ISchedulingRule[]> {
    return firstValueFrom(this.http.get<ISchedulingRule[]>(`${environment.baseUrl}schedulingrules?activeIndustriesOnly=true`).pipe(retry(3)));
  }

  getById(id: string): Promise<ISchedulingRule> {
    return firstValueFrom(this.http.get<ISchedulingRule>(`${environment.baseUrl}schedulingrules/${id}`).pipe(retry(3)));
  }

  create(rule: ISchedulingRule): Promise<ISchedulingRule> {
    const { id: _id, ...payload } = rule;
    return firstValueFrom(this.http.post<ISchedulingRule>(`${environment.baseUrl}schedulingrules`, payload));
  }

  update(rule: ISchedulingRule): Promise<ISchedulingRule> {
    return firstValueFrom(this.http.put<ISchedulingRule>(`${environment.baseUrl}schedulingrules`, rule).pipe(retry(3)));
  }

  delete(id: string): Promise<ISchedulingRule> {
    return firstValueFrom(this.http.delete<ISchedulingRule>(`${environment.baseUrl}schedulingrules/${id}`));
  }

  getHolidayWorkExemptions(): Promise<IHolidayWorkExemption[]> {
    return firstValueFrom(this.http.get<IHolidayWorkExemption[]>(`${environment.baseUrl}schedulingrules/HolidayWorkExemptions`).pipe(retry(3)));
  }

  createHolidayWorkExemption(exemption: IHolidayWorkExemption): Promise<IHolidayWorkExemption> {
    const { id: _id, importSourceKey: _importSourceKey, ...payload } = exemption;
    return firstValueFrom(this.http.post<IHolidayWorkExemption>(`${environment.baseUrl}schedulingrules/HolidayWorkExemptions`, payload));
  }

  deleteHolidayWorkExemption(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${environment.baseUrl}schedulingrules/HolidayWorkExemptions/${id}`));
  }

  getIndustryMigrationList(): Promise<IIndustryMigrationCandidate[]> {
    return firstValueFrom(this.http.get<IIndustryMigrationCandidate[]>(`${environment.baseUrl}schedulingrules/IndustryMigration`).pipe(retry(3)));
  }

  migrateContracts(assignments: IContractSchedulingRuleAssignment[]): Promise<number> {
    return firstValueFrom(this.http.put<number>(`${environment.baseUrl}schedulingrules/IndustryMigration`, assignments));
  }
}
