// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service facade for reading an industry template preview and the customer-owned
 * scheduling rules summary. Wraps DataIndustryTemplateService so presentation components do
 * not depend on infrastructure.
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IIndustryTemplate } from 'src/app/domain/models/settings/industry-template.interface';
import { IIndustryCustomRulesSummary } from 'src/app/domain/models/settings/industry-custom-rules-summary.interface';
import { DataIndustryTemplateService } from 'src/app/infrastructure/api/settings/data-industry-template.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementIndustryTemplateService {
  private dataIndustryTemplateService = inject(DataIndustryTemplateService);

  getIndustryTemplate(slug: string): Observable<IIndustryTemplate> {
    return this.dataIndustryTemplateService.getIndustryTemplate(slug);
  }

  getCustomRulesSummary(): Observable<IIndustryCustomRulesSummary> {
    return this.dataIndustryTemplateService.getCustomRulesSummary();
  }
}
