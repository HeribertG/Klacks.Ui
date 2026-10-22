// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { ShiftPoolCompletionService } from './shift-pool-completion.service';

describe('ShiftPoolCompletionService', () => {
  let getShiftsByIds: ReturnType<typeof vi.fn>;
  let service: ShiftPoolCompletionService;
  const local = [{ id: 'a' }, { id: 'b' }] as IShift[];

  beforeEach(() => {
    getShiftsByIds = vi.fn();
    TestBed.configureTestingModule({
      providers: [ShiftPoolCompletionService, { provide: DataShiftService, useValue: { getShiftsByIds } }],
    });
    service = TestBed.inject(ShiftPoolCompletionService);
  });

  it('returns the local pool synchronously and calls no API when nothing is missing', () => {
    let result: IShift[] | undefined;

    service.completePool(local, ['a', 'b', 'a']).subscribe((pool) => (result = pool));

    expect(result).toBe(local);
    expect(getShiftsByIds).not.toHaveBeenCalled();
  });

  it('fetches only the missing ids and appends them after the local pool', () => {
    getShiftsByIds.mockReturnValue(of([{ id: 'c' }] as IShift[]));
    let result: IShift[] | undefined;

    service.completePool(local, ['b', 'c']).subscribe((pool) => (result = pool));

    expect(getShiftsByIds).toHaveBeenCalledWith(['c']);
    expect(result?.map((shift) => shift.id)).toEqual(['a', 'b', 'c']);
  });

  it('continues with the local pool when the fetch fails', () => {
    getShiftsByIds.mockReturnValue(throwError(() => new Error('offline')));
    let result: IShift[] | undefined;

    service.completePool(local, ['c']).subscribe((pool) => (result = pool));

    expect(result?.map((shift) => shift.id)).toEqual(['a', 'b']);
  });
});
