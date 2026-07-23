// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for fetching a read-only industry template preview (scheduling rules and
 * qualifications shipped with one industry preset) from the backend API, and a summary of
 * how many customer-owned scheduling rules currently exist.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IIndustryTemplate } from 'src/app/domain/models/settings/industry-template.interface';
import { IIndustryCustomRulesSummary } from 'src/app/domain/models/settings/industry-custom-rules-summary.interface';

const NO_CUSTOM_SCHEDULING_RULES: IIndustryCustomRulesSummary = { customSchedulingRuleCount: 0 };

@Injectable({
  providedIn: 'root',
})
export class DataIndustryTemplateService {
  private httpClient = inject(HttpClient);

  getIndustryTemplate(slug: string): Observable<IIndustryTemplate> {
    return this.httpClient
      .get<IIndustryTemplate>(`${environment.baseUrl}IndustryTemplates/GetPreview/${slug}`)
      .pipe(retry(3));
  }

  getCustomRulesSummary(): Observable<IIndustryCustomRulesSummary> {
    return this.httpClient
      .get<IIndustryCustomRulesSummary>(`${environment.baseUrl}IndustryTemplates/GetCustomRulesSummary`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status !== HttpStatusCode.NotFound) {
            console.error('Failed to load the custom scheduling rules summary:', error);
          }
          return of(NO_CUSTOM_SCHEDULING_RULES);
        }),
      );
  }
}
