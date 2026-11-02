// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Break } from 'src/app/domain/models/break/break-class';
import { RemovableWork } from 'src/app/domain/models/dtos/removable-work.dto';
import { BreakCellParams } from 'src/app/domain/services/schedule/break-cell-params.interface';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { AbsenceTakenWorksConfirmService } from './absence-taken-works-confirm.service';

const ENTRY: BreakCellParams = {
  clientId: 'client-1',
  absenceId: 'absence-1',
  date: new Date(2026, 10, 2),
  workTime: 8,
  startTime: '00:00:00',
  endTime: '00:00:00',
};

function work(id: string): RemovableWork {
  return {
    workId: id,
    clientId: 'client-1',
    shiftId: 'shift-1',
    date: '2026-11-02',
    startTime: '08:00:00',
    endTime: '16:00:00',
  };
}

describe('AbsenceTakenWorksConfirmService', () => {
  let service: AbsenceTakenWorksConfirmService;
  let preview: ReturnType<typeof vi.fn>;
  let openModal: ReturnType<typeof vi.fn>;
  let instant: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    preview = vi.fn().mockResolvedValue([]);
    openModal = vi.fn();
    instant = vi.fn((key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key));
    TestBed.configureTestingModule({
      providers: [
        { provide: ScheduleEntryCrudService, useValue: { previewTakenWorks: preview } },
        { provide: DataManagementScheduleService, useValue: { clients: [{ id: 'client-1', firstName: 'Elsa', name: 'Meier' }] } },
        { provide: ModalService, useValue: { openModal } },
        { provide: TranslateService, useValue: { currentLang: 'de', instant } },
      ],
    });
    service = TestBed.inject(AbsenceTakenWorksConfirmService);
  });

  it('asks nothing when no service falls', async () => {
    await expect(service.confirm([ENTRY])).resolves.toBe(true);

    expect(openModal).not.toHaveBeenCalled();
  });

  it('writes after the planner agreed', async () => {
    preview.mockResolvedValue([work('w1')]);
    openModal.mockImplementation(options => options.onConfirm());

    await expect(service.confirm([ENTRY])).resolves.toBe(true);
  });

  it('writes nothing after the planner declined', async () => {
    preview.mockResolvedValue([work('w1')]);
    openModal.mockImplementation(options => options.onDismiss());

    await expect(service.confirm([ENTRY])).resolves.toBe(false);
  });

  it('names who loses which service', async () => {
    preview.mockResolvedValue([work('w1')]);
    openModal.mockImplementation(options => options.onDismiss());

    await service.confirm([ENTRY]);

    const message = openModal.mock.calls[0][0].message as string;
    expect(message).toContain('"count":1');
    expect(message).toContain('Elsa Meier');
    expect(message).toContain('08:00-16:00');
  });

  it('shortens a long list but keeps the full count', async () => {
    preview.mockResolvedValue(Array.from({ length: 12 }, (_, i) => work(`w${i}`)));
    openModal.mockImplementation(options => options.onDismiss());

    await service.confirm([ENTRY]);

    expect(openModal.mock.calls[0][0].message).toContain('"count":12');
    expect(instant).toHaveBeenCalledWith('schedule.taken-works.more', { count: 2 });
  });

  it('refuses when the preview fails, it never writes blind', async () => {
    preview.mockRejectedValue(new Error('offline'));

    await expect(service.confirm([ENTRY])).resolves.toBe(false);
  });

  it('previews a single break by its own day and times', async () => {
    const entry = new Break();
    entry.clientId = 'client-1';
    entry.absenceId = 'absence-1';
    entry.currentDate = ENTRY.date;
    entry.workTime = 8;
    entry.startTime = '00:00:00';
    entry.endTime = '00:00:00';

    await service.confirmBreak(entry);

    expect(preview).toHaveBeenCalledWith([expect.objectContaining({
      clientId: 'client-1',
      absenceId: 'absence-1',
      date: ENTRY.date,
      startTime: '00:00:00',
      endTime: '00:00:00',
    })]);
  });
});
