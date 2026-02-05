import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  ISkillDefinition,
  ISkillExecuteRequest,
  ISkillExecuteResponse,
  ISkillChainExecuteRequest,
  ISkillAnalytics
} from '../../domain/services/skills/skill.interface';

@Injectable({
  providedIn: 'root',
})
export class DataSkillService {
  private http = inject(HttpClient);

  getSkills(): Observable<ISkillDefinition[]> {
    return this.http
      .get<ISkillDefinition[]>(`${environment.baseUrl}skills`)
      .pipe(retry(2));
  }

  getSkillByName(name: string): Observable<ISkillDefinition> {
    return this.http
      .get<ISkillDefinition>(`${environment.baseUrl}skills/${name}`)
      .pipe(retry(2));
  }

  executeSkill(request: ISkillExecuteRequest): Observable<ISkillExecuteResponse> {
    return this.http.post<ISkillExecuteResponse>(
      `${environment.baseUrl}skills/execute`,
      request
    );
  }

  executeSkillChain(request: ISkillChainExecuteRequest): Observable<ISkillExecuteResponse[]> {
    return this.http.post<ISkillExecuteResponse[]>(
      `${environment.baseUrl}skills/execute-chain`,
      request
    );
  }

  getAnalytics(days = 30): Observable<ISkillAnalytics> {
    return this.http
      .get<ISkillAnalytics>(`${environment.baseUrl}skills/analytics`, {
        params: { days: days.toString() }
      })
      .pipe(retry(2));
  }
}
