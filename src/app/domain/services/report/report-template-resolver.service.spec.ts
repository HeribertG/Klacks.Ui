// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ReportTemplateResolverService } from './report-template-resolver.service';
import { DEFAULT_PAGE_SETUP, ReportTemplate, ReportType } from 'src/app/domain/models/report/report-template.model';

function template(partial: Partial<ReportTemplate>): ReportTemplate {
  return {
    name: 'T',
    description: '',
    type: ReportType.Schedule,
    pageSetup: { ...DEFAULT_PAGE_SETUP },
    sections: [],
    ...partial,
  };
}

describe('ReportTemplateResolverService', () => {
  let service: ReportTemplateResolverService;

  beforeEach(() => {
    service = new ReportTemplateResolverService();
  });

  describe('getTemplatesForSource', () => {
    it('returns the templates of a data source', () => {
      const list = [
        template({ id: 'a', sourceId: 'schedule' }),
        template({ id: 'b', sourceId: 'absence-gantt' }),
        template({ id: 'c', sourceId: 'schedule' }),
      ];

      expect(service.getTemplatesForSource(list, 'schedule').map(t => t.id)).toEqual(['a', 'c']);
    });

    it('ignores deleted templates', () => {
      const list = [
        template({ id: 'a', sourceId: 'schedule', isDeleted: true }),
        template({ id: 'b', sourceId: 'schedule' }),
      ];

      expect(service.getTemplatesForSource(list, 'schedule').map(t => t.id)).toEqual(['b']);
    });

    it('falls back to the legacy report type for templates without a source', () => {
      const list = [template({ id: 'legacy', type: ReportType.Absence })];

      expect(service.getTemplatesForSource(list, 'absence-gantt').map(t => t.id)).toEqual(['legacy']);
    });

    it('prefers source-tagged templates over legacy ones', () => {
      const list = [
        template({ id: 'legacy', type: ReportType.Absence }),
        template({ id: 'tagged', sourceId: 'absence-gantt', type: ReportType.Absence }),
      ];

      expect(service.getTemplatesForSource(list, 'absence-gantt').map(t => t.id)).toEqual(['tagged']);
    });

    it('returns nothing for an unknown source without matches', () => {
      expect(service.getTemplatesForSource([template({ id: 'a', sourceId: 'schedule' })], 'shift-table')).toEqual([]);
    });
  });

  describe('resolveForSource', () => {
    it('prefers the configured default template', () => {
      const list = [
        template({ id: 'first', sourceId: 'absence-gantt' }),
        template({ id: 'chosen', sourceId: 'absence-gantt' }),
      ];

      expect(service.resolveForSource(list, 'absence-gantt', 'chosen')?.id).toBe('chosen');
    });

    it('falls back to the first template when no default is set', () => {
      const list = [
        template({ id: 'first', sourceId: 'absence-gantt' }),
        template({ id: 'second', sourceId: 'absence-gantt' }),
      ];

      expect(service.resolveForSource(list, 'absence-gantt')?.id).toBe('first');
    });

    it('falls back to the first template when the default no longer exists', () => {
      const list = [template({ id: 'first', sourceId: 'absence-gantt' })];

      expect(service.resolveForSource(list, 'absence-gantt', 'deleted-id')?.id).toBe('first');
    });

    it('returns undefined when the source has no template at all', () => {
      expect(service.resolveForSource([], 'absence-gantt', 'any')).toBeUndefined();
    });
  });

  describe('resolveReportType', () => {
    it('derives the legacy type from the data source', () => {
      expect(service.resolveReportType('absence-gantt', ReportType.Schedule)).toBe(ReportType.Absence);
      expect(service.resolveReportType('all-address', ReportType.Schedule)).toBe(ReportType.Client);
      expect(service.resolveReportType('schedule', ReportType.Absence)).toBe(ReportType.Schedule);
    });

    it('keeps the current type for sources without a legacy counterpart', () => {
      expect(service.resolveReportType('shift-table', ReportType.Schedule)).toBe(ReportType.Schedule);
      expect(service.resolveReportType(undefined, ReportType.Absence)).toBe(ReportType.Absence);
    });
  });
});
