// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BreakPlaceholderScheduleLoaderService } from './break-placeholder-schedule-loader.service';
import { DataBreakPlaceholderService } from 'src/app/infrastructure/api/break/data-break-placeholder.service';
import { IClientBreak } from 'src/app/domain/models/client/client-class';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-placeholder.interface';

describe('BreakPlaceholderScheduleLoaderService', () => {
  let service: BreakPlaceholderScheduleLoaderService;
  let api: { deleteBreak: ReturnType<typeof vi.fn>; getScheduleList: ReturnType<typeof vi.fn> };

  function clientWith(...ids: string[]): IClientBreak {
    return { id: `client-${ids.join('-')}`, breakPlaceholders: ids.map((id) => ({ id }) as IBreakPlaceholder) } as IClientBreak;
  }

  beforeEach(() => {
    api = { deleteBreak: vi.fn(), getScheduleList: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: DataBreakPlaceholderService, useValue: api }],
    });
    service = TestBed.inject(BreakPlaceholderScheduleLoaderService);
    service.clients = [clientWith('bp-1', 'bp-2'), clientWith('bp-3')];
  });

  describe('deleteBreakPlaceholder', () => {
    it('deletes through the API and drops the placeholder from the loaded clients before the caller sees the result', () => {
      const deleted = { id: 'bp-1' } as IBreakPlaceholder;
      api.deleteBreak.mockReturnValue(of(deleted));
      const seenByCaller: string[][] = [];

      service.deleteBreakPlaceholder('bp-1').subscribe(() => {
        seenByCaller.push(service.getBreakPlaceholdersForClient('client-bp-1-bp-2').map((bp) => bp.id!));
      });

      expect(api.deleteBreak).toHaveBeenCalledWith('bp-1');
      expect(seenByCaller).toEqual([['bp-2']]);
      expect(service.getBreakPlaceholdersForClient('client-bp-3').map((bp) => bp.id)).toEqual(['bp-3']);
    });

    it('keeps the loaded placeholders when the delete fails', () => {
      api.deleteBreak.mockReturnValue(throwError(() => new Error('delete failed')));
      const error = vi.fn();

      service.deleteBreakPlaceholder('bp-1').subscribe({ error });

      expect(error).toHaveBeenCalledTimes(1);
      expect(service.getBreakPlaceholdersForClient('client-bp-1-bp-2').map((bp) => bp.id)).toEqual(['bp-1', 'bp-2']);
    });

    it('does not call the API before it is subscribed', () => {
      api.deleteBreak.mockReturnValue(of({ id: 'bp-1' }));

      service.deleteBreakPlaceholder('bp-1');

      expect(service.getBreakPlaceholdersForClient('client-bp-1-bp-2').map((bp) => bp.id)).toEqual(['bp-1', 'bp-2']);
    });
  });
});
