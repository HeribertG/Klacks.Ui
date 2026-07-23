// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DataIndustryTemplateService } from './data-industry-template.service';
import { IIndustryTemplate } from 'src/app/domain/models/settings/industry-template.interface';

describe('DataIndustryTemplateService', () => {
  let service: DataIndustryTemplateService;
  let httpMock: HttpTestingController;
  const base = `${environment.baseUrl}IndustryTemplates/GetPreview`;
  const summaryUrl = `${environment.baseUrl}IndustryTemplates/GetCustomRulesSummary`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataIndustryTemplateService,
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DataIndustryTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches the industry template preview by slug', () => {
    const template: IIndustryTemplate = {
      industry: 'homecare',
      schedulingRules: [{ name: 'Max daily hours', description: null }],
      qualifications: [{ name: { en: 'First aid' }, description: { en: 'Basic first aid certificate.' } }],
    };

    service.getIndustryTemplate('homecare').subscribe((result) => {
      expect(result).toEqual(template);
    });

    const req = httpMock.expectOne(`${base}/homecare`);
    expect(req.request.method).toBe('GET');
    req.flush(template);
  });

  it('propagates a 404 error when the template is not (yet) available', () => {
    let receivedNext = false;
    let receivedError: unknown;

    service.getIndustryTemplate('security').subscribe({
      next: () => (receivedNext = true),
      error: (error) => (receivedError = error),
    });

    for (let attempt = 0; attempt < 4; attempt++) {
      httpMock.expectOne(`${base}/security`).flush('Not Found', { status: 404, statusText: 'Not Found' });
    }

    expect(receivedNext).toBe(false);
    expect(receivedError).toBeDefined();
  });

  it('fetches the custom scheduling rules summary', () => {
    service.getCustomRulesSummary().subscribe((result) => {
      expect(result).toEqual({ customSchedulingRuleCount: 3 });
    });

    const req = httpMock.expectOne(summaryUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ customSchedulingRuleCount: 3 });
  });

  it('resolves a 404 from the custom rules summary endpoint to a zero count instead of erroring', () => {
    let received: unknown;

    service.getCustomRulesSummary().subscribe({
      next: (result) => (received = result),
      error: () => (received = 'error'),
    });

    httpMock.expectOne(summaryUrl).flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(received).toEqual({ customSchedulingRuleCount: 0 });
  });

  it('resolves any other error from the custom rules summary endpoint to a zero count instead of erroring', () => {
    let received: unknown;

    service.getCustomRulesSummary().subscribe({
      next: (result) => (received = result),
      error: () => (received = 'error'),
    });

    httpMock.expectOne(summaryUrl).flush('Server Error', { status: 500, statusText: 'Server Error' });

    expect(received).toEqual({ customSchedulingRuleCount: 0 });
  });
});
