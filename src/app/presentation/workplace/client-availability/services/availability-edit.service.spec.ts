// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { AvailabilityEditService } from './availability-edit.service';
import { AvailabilitySelectionService } from './availability-selection.service';
import { RenderAvailabilityGridService } from './render-availability-grid';
import { AvailabilityCalculationService } from './render-availability-grid/availability-calculation.service';
import { DrawAvailabilityGridService } from './draw-availability-grid.service';

describe('AvailabilityEditService', () => {
  let service: AvailabilityEditService;
  let authorization: { isAuthorised: boolean };
  let selectedRow: ReturnType<typeof signal<number>>;
  let selectedCol: ReturnType<typeof signal<number>>;
  let dataManagement: { setHourRange: ReturnType<typeof vi.fn> };
  let drawGrid: { drawGrid: ReturnType<typeof vi.fn> };
  let columnToDateHour: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authorization = { isAuthorised: true };
    selectedRow = signal(-1);
    selectedCol = signal(-1);
    dataManagement = { setHourRange: vi.fn() };
    drawGrid = { drawGrid: vi.fn() };
    columnToDateHour = vi.fn((col: number) => ({ dateString: col < 12 ? '2026-11-05' : '2026-11-06', startHour: 6, endHour: 8 }));

    TestBed.configureTestingModule({
      providers: [
        AvailabilityEditService,
        { provide: AuthorizationService, useValue: authorization },
        {
          provide: AvailabilitySelectionService,
          useValue: { selectedRow, selectedCol, hasSelection: () => selectedRow() >= 0 && selectedCol() >= 0 },
        },
        { provide: RenderAvailabilityGridService, useValue: { getClients: () => [{ id: 'mia' }, { id: 'tom' }] } },
        { provide: AvailabilityCalculationService, useValue: { columnToDateHour } },
        { provide: DataManagementClientAvailabilityService, useValue: dataManagement },
        { provide: DrawAvailabilityGridService, useValue: drawGrid },
      ],
    });
    service = TestBed.inject(AvailabilityEditService);
  });

  it('cannot clear a day while no cell is selected', () => {
    expect(service.canClearDay()).toBe(false);
    expect(service.clearSelectedDay()).toBe(false);
    expect(dataManagement.setHourRange).not.toHaveBeenCalled();
  });

  it('clears all 24 hours of the selected client day to no entry and redraws', () => {
    selectedRow.set(1);
    selectedCol.set(13);

    expect(service.canClearDay()).toBe(true);
    expect(service.clearSelectedDay()).toBe(true);

    expect(dataManagement.setHourRange).toHaveBeenCalledTimes(1);
    expect(dataManagement.setHourRange).toHaveBeenCalledWith('tom', '2026-11-06', 0, 24, null);
    expect(drawGrid.drawGrid).toHaveBeenCalledTimes(1);
  });

  it('does nothing without the edit right', () => {
    authorization.isAuthorised = false;
    selectedRow.set(0);
    selectedCol.set(0);

    expect(service.canEditAvailability()).toBe(false);
    expect(service.canClearDay()).toBe(false);
    expect(service.clearSelectedDay()).toBe(false);
    expect(dataManagement.setHourRange).not.toHaveBeenCalled();
  });

  it('does nothing when the selected row has no client', () => {
    selectedRow.set(5);
    selectedCol.set(0);

    expect(service.clearSelectedDay()).toBe(false);
    expect(dataManagement.setHourRange).not.toHaveBeenCalled();
  });
});
