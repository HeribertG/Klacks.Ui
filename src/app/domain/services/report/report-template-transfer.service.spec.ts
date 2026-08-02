// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ReportTemplateTransferService } from './report-template-transfer.service';
import {
  DEFAULT_PAGE_SETUP,
  ReportOrientation,
  ReportPageSize,
  ReportTemplate,
  ReportType,
} from 'src/app/domain/models/report/report-template.model';
import { ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { DEFAULT_FIELD_STYLE, ReportFieldType } from 'src/app/domain/models/report/report-field.model';

function buildTemplate(): ReportTemplate {
  return {
    id: 'server-id',
    name: 'Stundenrapport',
    description: 'Monatsübersicht',
    type: ReportType.Schedule,
    sourceId: 'schedule',
    dataSetIds: ['work'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-02-01'),
    isLocal: true,
    pageSetup: {
      orientation: ReportOrientation.Portrait,
      size: ReportPageSize.A3,
      margins: { top: 15, bottom: 15, left: 25, right: 25 },
    },
    sections: [
      {
        id: 'section-id',
        type: ReportSectionType.WorkTable,
        visible: true,
        sortOrder: 1,
        fields: [
          {
            id: 'field-id',
            name: 'Stunden',
            dataBinding: 'entry.hours',
            type: ReportFieldType.Number,
            width: 20,
            height: 0,
            sortOrder: 0,
            style: { ...DEFAULT_FIELD_STYLE },
            styleConditions: [{ expression: 'output 1, hours > 8', textColor: '#c00000', bold: true }],
          },
        ],
        tableFooterFields: [
          {
            id: 'footer-field-id',
            name: 'Summe',
            dataBinding: 'sum.hours',
            type: ReportFieldType.Number,
            width: 20,
            height: 0,
            sortOrder: 0,
            style: { ...DEFAULT_FIELD_STYLE },
          },
        ],
      },
    ],
  };
}

describe('ReportTemplateTransferService', () => {
  let service: ReportTemplateTransferService;

  beforeEach(() => {
    service = new ReportTemplateTransferService();
  });

  describe('toJson', () => {
    it('keeps the layout but strips server state', () => {
      const exported = JSON.parse(service.toJson(buildTemplate()));

      expect(exported.format).toBe('klacks-report-template');
      expect(exported.template.name).toBe('Stundenrapport');
      expect(exported.template.sections[0].fields[0].dataBinding).toBe('entry.hours');
      expect(exported.template.id).toBeUndefined();
      expect(exported.template.createdAt).toBeUndefined();
      expect(exported.template.updatedAt).toBeUndefined();
      expect(exported.template.isLocal).toBeUndefined();
    });

    it('does not modify the source template', () => {
      const template = buildTemplate();
      service.toJson(template);
      expect(template.id).toBe('server-id');
    });
  });

  describe('buildFileName', () => {
    it('derives a safe file name from the template name', () => {
      expect(service.buildFileName({ ...buildTemplate(), name: 'Stundenrapport Mai 2026' }))
        .toBe('stundenrapport-mai-2026.json');
    });

    it('falls back when the name has no usable characters', () => {
      expect(service.buildFileName({ ...buildTemplate(), name: '///' })).toBe('report-template.json');
    });
  });

  describe('parseJson', () => {
    it('restores an exported template without any identifiers', () => {
      const imported = service.parseJson(service.toJson(buildTemplate()));

      expect(imported.name).toBe('Stundenrapport');
      expect(imported.id).toBeUndefined();
      expect(imported.sections[0].id).toBeUndefined();
      expect(imported.sections[0].fields[0].id).toBeUndefined();
      expect(imported.sections[0].tableFooterFields?.[0].id).toBeUndefined();
    });

    it('survives a full export-import round trip without losing settings', () => {
      const imported = service.parseJson(service.toJson(buildTemplate()));

      expect(imported.pageSetup.orientation).toBe(ReportOrientation.Portrait);
      expect(imported.pageSetup.size).toBe(ReportPageSize.A3);
      expect(imported.pageSetup.margins).toEqual({ top: 15, bottom: 15, left: 25, right: 25 });
      expect(imported.sourceId).toBe('schedule');
      expect(imported.dataSetIds).toEqual(['work']);
      expect(imported.sections[0].fields[0].styleConditions).toEqual([
        { expression: 'output 1, hours > 8', textColor: '#c00000', bold: true },
      ]);
    });

    it('accepts a bare template object without the file envelope', () => {
      const bare = JSON.stringify({ name: 'Direkt', sections: [], pageSetup: undefined });
      const imported = service.parseJson(bare);

      expect(imported.name).toBe('Direkt');
      expect(imported.pageSetup.margins).toEqual(DEFAULT_PAGE_SETUP.margins);
      expect(imported.type).toBe(ReportType.Schedule);
    });

    it('rejects files that are not a report template', () => {
      expect(() => service.parseJson('{"foo":"bar"}')).toThrow();
      expect(() => service.parseJson('[]')).toThrow();
      expect(() => service.parseJson('not json')).toThrow();
    });
  });
});
