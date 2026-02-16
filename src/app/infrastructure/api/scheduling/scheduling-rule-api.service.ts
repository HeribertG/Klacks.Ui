import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ISchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';

@Injectable({
  providedIn: 'root'
})
export class SchedulingRuleApiService {
  private http = inject(HttpClient);

  getAll(): Promise<ISchedulingRule[]> {
    return firstValueFrom(this.http.get<ISchedulingRule[]>(`${environment.baseUrl}schedulingrules`));
  }

  getById(id: string): Promise<ISchedulingRule> {
    return firstValueFrom(this.http.get<ISchedulingRule>(`${environment.baseUrl}schedulingrules/${id}`));
  }

  create(rule: ISchedulingRule): Promise<ISchedulingRule> {
    const { id, ...payload } = rule;
    return firstValueFrom(this.http.post<ISchedulingRule>(`${environment.baseUrl}schedulingrules`, payload));
  }

  update(rule: ISchedulingRule): Promise<ISchedulingRule> {
    return firstValueFrom(this.http.put<ISchedulingRule>(`${environment.baseUrl}schedulingrules`, rule));
  }

  delete(id: string): Promise<ISchedulingRule> {
    return firstValueFrom(this.http.delete<ISchedulingRule>(`${environment.baseUrl}schedulingrules/${id}`));
  }
}
