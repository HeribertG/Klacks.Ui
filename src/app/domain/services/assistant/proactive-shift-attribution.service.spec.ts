// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { IProactiveShiftAttribution } from 'src/app/domain/models/assistant/proactive-shift-attribution.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataProactiveAttributionService } from 'src/app/infrastructure/api/assistant/data-proactive-attribution.service';
import { ProactiveShiftAttributionService } from './proactive-shift-attribution.service';

const attribution = (entityId: string, triggerKind: string): IProactiveShiftAttribution => ({
  entityId,
  handledAtUtc: null,
  triggerKind,
});

describe('ProactiveShiftAttributionService', () => {
  let getByEntityIds: ReturnType<typeof vi.fn>;
  let service: ProactiveShiftAttributionService;

  beforeEach(() => {
    getByEntityIds = vi.fn(() => of([attribution('s1', 'empty_container'), attribution('s2', 'open_order')]));
    TestBed.configureTestingModule({
      providers: [
        ProactiveShiftAttributionService,
        { provide: DataProactiveAttributionService, useValue: { getByEntityIds } },
      ],
    });
    service = TestBed.inject(ProactiveShiftAttributionService);
  });

  it('asks only for shifts that carry an id', () => {
    service.loadByShift([{ id: 's1' }, { id: undefined }, { id: '' }, { id: 's2' }] as IShift[]).subscribe();

    expect(getByEntityIds).toHaveBeenCalledWith(['s1', 's2']);
  });

  it('keys the answers by entity id', () => {
    let result: ReadonlyMap<string, IProactiveShiftAttribution> | undefined;

    service.loadByShift([{ id: 's1' }, { id: 's2' }] as IShift[]).subscribe((map) => (result = map));

    expect(result?.get('s1')?.triggerKind).toBe('empty_container');
    expect(result?.get('s2')?.triggerKind).toBe('open_order');
    expect(result?.size).toBe(2);
  });
});
