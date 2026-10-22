// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { IAbsence } from 'src/app/domain/models/absence/absence.interface';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { ContainerAbsenceService } from './container-absence.service';

describe('ContainerAbsenceService', () => {
  let readAbsenceList: ReturnType<typeof vi.fn>;
  let service: ContainerAbsenceService;

  beforeEach(() => {
    readAbsenceList = vi.fn();
    TestBed.configureTestingModule({
      providers: [ContainerAbsenceService, { provide: DataAbsenceService, useValue: { readAbsenceList } }],
    });
    service = TestBed.inject(ContainerAbsenceService);
  });

  it('keeps only the absences that apply to containers, in API order', async () => {
    readAbsenceList.mockReturnValue(
      of([
        { id: 'a', appliesToContainer: true },
        { id: 'b', appliesToContainer: false },
        { id: 'c', appliesToContainer: true },
      ] as IAbsence[])
    );

    const result = await firstValueFrom(service.readContainerAbsences());

    expect(result.map((absence) => absence.id)).toEqual(['a', 'c']);
  });

  it('propagates a failed read instead of swallowing it', async () => {
    readAbsenceList.mockReturnValue(throwError(() => new Error('offline')));

    await expect(firstValueFrom(service.readContainerAbsences())).rejects.toThrow('offline');
  });
});
