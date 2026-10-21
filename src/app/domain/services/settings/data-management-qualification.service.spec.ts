// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { DataManagementQualificationService } from './data-management-qualification.service';

describe('DataManagementQualificationService', () => {
  let service: DataManagementQualificationService;
  let api: {
    getQualificationList: ReturnType<typeof vi.fn>;
    addQualification: ReturnType<typeof vi.fn>;
    updateQualification: ReturnType<typeof vi.fn>;
    deleteQualification: ReturnType<typeof vi.fn>;
  };
  const qualification = { id: 'q-1' } as IQualification;

  beforeEach(() => {
    api = {
      getQualificationList: vi.fn().mockReturnValue(of([qualification])),
      addQualification: vi.fn().mockReturnValue(of(qualification)),
      updateQualification: vi.fn().mockReturnValue(of(qualification)),
      deleteQualification: vi.fn().mockReturnValue(of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [DataManagementQualificationService, { provide: DataQualificationService, useValue: api }],
    });
    service = TestBed.inject(DataManagementQualificationService);
  });

  it('reads the list with the active-industries filter', async () => {
    const list = await firstValueFrom(service.getQualificationList(true));

    expect(api.getQualificationList).toHaveBeenCalledWith(true);
    expect(list).toEqual([qualification]);
  });

  it('adds a qualification through the API', async () => {
    const created = await firstValueFrom(service.addQualification(qualification));

    expect(api.addQualification).toHaveBeenCalledWith(qualification);
    expect(created).toBe(qualification);
  });

  it('updates a qualification through the API', async () => {
    const updated = await firstValueFrom(service.updateQualification(qualification));

    expect(api.updateQualification).toHaveBeenCalledWith(qualification);
    expect(updated).toBe(qualification);
  });

  it('deletes a qualification by id through the API', async () => {
    await firstValueFrom(service.deleteQualification('q-1'), { defaultValue: undefined });

    expect(api.deleteQualification).toHaveBeenCalledWith('q-1');
  });
});
