// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ReplacementDialogComponent } from './replacement-dialog.component';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataManagementWorkchangeService } from 'src/app/domain/services/workchange/data-management-workchange.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { IClientForReplacement } from 'src/app/domain/models/client/client-for-replacement.interface';

describe('ReplacementDialogComponent', () => {
  let component: ReplacementDialogComponent;
  let getClientsForReplacement: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;

  const CLIENTS = [
    { id: 'client-1', name: 'Current' },
    { id: 'client-2', name: 'Other' },
  ] as unknown as IClientForReplacement[];

  beforeEach(async () => {
    getClientsForReplacement = vi.fn().mockReturnValue(of(CLIENTS));
    open = vi.fn().mockReturnValue({ close: vi.fn(), dismiss: vi.fn() });

    await TestBed.configureTestingModule({
      imports: [ReplacementDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataClientService, useValue: { getClientsForReplacement } },
        { provide: DataManagementWorkchangeService, useValue: {} },
        { provide: WorkScheduleLoaderService, useValue: {} },
        { provide: ScheduleEntryCrudService, useValue: {} },
        { provide: NgbModal, useValue: { open } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReplacementDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the replacement candidates before it opens and offers every client but the current one', () => {
    component.open('work-1', 'client-1', new Date(2026, 7, 15), '08:00:00', '16:00:00');

    expect(getClientsForReplacement).toHaveBeenCalledTimes(1);
    expect(component.clients).toEqual(CLIENTS);
    expect(component.availableClients.map((c) => c.id)).toEqual(['client-2']);
    expect(open).toHaveBeenCalledTimes(1);
    expect(getClientsForReplacement.mock.invocationCallOrder[0]).toBeLessThan(open.mock.invocationCallOrder[0]);
  });

  it('still opens with an empty candidate list when loading the clients fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getClientsForReplacement.mockReturnValue(throwError(() => new Error('load failed')));

    component.open('work-1', 'client-1', new Date(2026, 7, 15), '08:00:00', '16:00:00');

    expect(component.clients).toEqual([]);
    expect(open).toHaveBeenCalledTimes(1);
  });
});
