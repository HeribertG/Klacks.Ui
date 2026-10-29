// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { buildShiftListPlannableViewUrl } from 'src/app/domain/helpers/shift-list-view-url.helper';
import { AllShiftStateService } from './all-shift-state.service';
import { ShiftListViewRequestService } from './shift-list-view-request.service';

describe('ShiftListViewRequestService', () => {
  let service: ShiftListViewRequestService;
  let state: { applyTransientOverride: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let granted: Set<string>;

  const request = (params: Record<string, string>) => service.apply(convertToParamMap(params));
  const appliedChanges = () => state.applyTransientOverride.mock.calls[0][0];

  beforeEach(() => {
    granted = new Set([PERMISSIONS.CanEditShifts]);
    state = { applyTransientOverride: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };

    TestBed.configureTestingModule({
      providers: [
        ShiftListViewRequestService,
        { provide: AllShiftStateService, useValue: state },
        { provide: AuthorizationService, useValue: { hasPermission: (p: string) => granted.has(p) } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
    service = TestBed.inject(ShiftListViewRequestService);
  });

  describe('view=orders', () => {
    it('selects the unsealed orders for a user who may edit shifts and removes the parameters', () => {
      // Arrange / Act
      const applied = request({ view: 'orders' });

      // Assert
      expect(applied).toBe(true);
      expect(appliedChanges()).toEqual({ filterType: ShiftFilterType.Original, isSealedOrder: false });
      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { view: null, from: null, until: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );
    });

    it('leaves the filter alone for a user without CanEditShifts but still removes the parameters', () => {
      // Arrange
      granted = new Set([PERMISSIONS.CanViewShifts]);

      // Act
      const applied = request({ view: 'orders' });

      // Assert
      expect(applied).toBe(false);
      expect(state.applyTransientOverride).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('view=plannable', () => {
    it('selects the plannable shifts and opens all date ranges so that the validity window alone decides', () => {
      // Arrange / Act
      const applied = request({ view: 'plannable', from: '2026-11-01', until: '2026-11-30' });

      // Assert
      expect(applied).toBe(true);
      expect(appliedChanges()).toEqual({
        filterType: ShiftFilterType.Shift,
        isTimeRange: true,
        isSporadic: true,
        activeDateRange: true,
        formerDateRange: true,
        futureDateRange: true,
        validFrom: new Date(2026, 10, 1),
        validUntil: new Date(2026, 10, 30),
      });
      expect(router.navigate).toHaveBeenCalledTimes(1);
    });

    it('needs no permission', () => {
      // Arrange
      granted = new Set();

      // Act / Assert
      expect(request({ view: 'plannable', from: '2026-11-01' })).toBe(true);
    });

    it('accepts a window with only one bound', () => {
      // Arrange / Act
      request({ view: 'plannable', until: '2026-11-30' });

      // Assert
      expect(appliedChanges()).toMatchObject({
        futureDateRange: true,
        validFrom: undefined,
        validUntil: new Date(2026, 10, 30),
      });
    });

    it('falls back to the default active shifts without a window', () => {
      // Arrange / Act
      request({ view: 'plannable' });

      // Assert
      expect(appliedChanges()).toEqual({
        filterType: ShiftFilterType.Shift,
        isTimeRange: true,
        isSporadic: true,
        activeDateRange: true,
        formerDateRange: false,
        futureDateRange: false,
        validFrom: undefined,
        validUntil: undefined,
      });
    });

    it('ignores an unparsable date and keeps the valid one', () => {
      // Arrange / Act
      request({ view: 'plannable', from: 'not-a-date', until: '2026-02-30' });
      const first = appliedChanges();
      state.applyTransientOverride.mockClear();
      request({ view: 'plannable', from: '2026-11-01', until: '2026-13-01' });
      const second = appliedChanges();

      // Assert
      expect(first).toMatchObject({ formerDateRange: false, validFrom: undefined, validUntil: undefined });
      expect(second).toMatchObject({ futureDateRange: true, validFrom: new Date(2026, 10, 1), validUntil: undefined });
    });

    it('ignores both dates of a reversed window', () => {
      // Arrange / Act
      request({ view: 'plannable', from: '2026-11-30', until: '2026-11-01' });

      // Assert
      expect(appliedChanges()).toMatchObject({ futureDateRange: false, validFrom: undefined, validUntil: undefined });
    });

    it('parses the URL built by buildShiftListPlannableViewUrl', () => {
      // Arrange
      const url = buildShiftListPlannableViewUrl('2026-11-01', '2026-11-30');
      const query = new URL(url, 'http://localhost').searchParams;

      // Act
      request(Object.fromEntries(query.entries()));

      // Assert
      expect(url).toBe('/workplace/shift?view=plannable&from=2026-11-01&until=2026-11-30');
      expect(appliedChanges()).toMatchObject({ validFrom: new Date(2026, 10, 1), validUntil: new Date(2026, 10, 30) });
    });
  });

  it('ignores a navigation without a known view and leaves the URL alone', () => {
    // Arrange / Act
    const applied = request({ view: 'other', from: '2026-11-01' });

    // Assert
    expect(applied).toBe(false);
    expect(state.applyTransientOverride).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('buildShiftListPlannableViewUrl', () => {
  it('leaves out the bounds that are not given', () => {
    // Arrange / Act / Assert
    expect(buildShiftListPlannableViewUrl()).toBe('/workplace/shift?view=plannable');
    expect(buildShiftListPlannableViewUrl('2026-11-01')).toBe('/workplace/shift?view=plannable&from=2026-11-01');
    expect(buildShiftListPlannableViewUrl(undefined, '2026-11-30')).toBe('/workplace/shift?view=plannable&until=2026-11-30');
  });
});
