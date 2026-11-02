// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { ScenarioVariantService } from './scenario-variant.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { PERMISSION_CHECKER } from 'src/app/domain/interfaces/permission-checker.interface';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { DataScenarioVariantService } from 'src/app/infrastructure/api/schedule/data-scenario-variant.service';

function createVariant(overrides: Partial<IScenarioVariant> = {}): IScenarioVariant {
  return {
    id: 'variant-1',
    name: 'Winter key',
    groupId: 'group-1',
    fromDate: '2026-11-02',
    untilDate: '2026-11-29',
    token: 'variant-token-1',
    status: AnalyseScenarioStatus.Active,
    isExpired: false,
    shiftCount: 0,
    ...overrides,
  };
}

describe('ScenarioVariantService', () => {
  let service: ScenarioVariantService;
  let permissions: WritableSignal<string[]>;
  let dataService: {
    getByGroup: ReturnType<typeof vi.fn>;
    getShifts: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteShift: ReturnType<typeof vi.fn>;
    copyShifts: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Arrange
    permissions = signal<string[]>([]);
    dataService = {
      getByGroup: vi.fn().mockReturnValue(of([])),
      getShifts: vi.fn().mockReturnValue(of([])),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockReturnValue(of(undefined)),
      deleteShift: vi.fn().mockReturnValue(of(undefined)),
      copyShifts: vi.fn().mockReturnValue(of({ copiedFamilies: 1, skippedFamilies: 0 })),
    };
    TestBed.configureTestingModule({
      providers: [
        ScenarioVariantService,
        { provide: DataScenarioVariantService, useValue: dataService },
        { provide: PERMISSION_CHECKER, useValue: { hasPermission: (p: string) => permissions().includes(p), isAdmin: false } },
      ],
    });
    service = TestBed.inject(ScenarioVariantService);
  });

  describe('initial state', () => {
    it('should start without variants, without an active variant and not in variant mode', () => {
      // Assert
      expect(service.variants()).toEqual([]);
      expect(service.activeVariant()).toBeNull();
      expect(service.isVariantMode()).toBe(false);
    });
  });

  describe('loadVariants', () => {
    it('should request the variants of the group and publish them in the signal', () => {
      // Arrange
      const loaded = [createVariant(), createVariant({ id: 'variant-2', token: 'variant-token-2' })];
      dataService.getByGroup.mockReturnValue(of(loaded));

      // Act
      service.loadVariants('group-1');

      // Assert
      expect(dataService.getByGroup).toHaveBeenCalledWith('group-1');
      expect(service.variants()).toEqual(loaded);
    });

    it('should replace the active variant by its fresh copy from the list', () => {
      // Arrange
      service.enter(createVariant({ shiftCount: 0 }));
      dataService.getByGroup.mockReturnValue(of([createVariant({ shiftCount: 4 })]));

      // Act
      service.loadVariants('group-1');

      // Assert
      expect(service.activeVariant()?.shiftCount).toBe(4);
    });

    it('should leave variant mode when the active variant is gone from its group list', () => {
      // Arrange
      service.enter(createVariant());
      dataService.getByGroup.mockReturnValue(of([]));

      // Act
      service.loadVariants('group-1');

      // Assert
      expect(service.isVariantMode()).toBe(false);
    });

    it('should keep variant mode when another group is loaded', () => {
      // Arrange
      service.enter(createVariant({ groupId: 'group-1' }));
      dataService.getByGroup.mockReturnValue(of([]));

      // Act
      service.loadVariants('group-2');

      // Assert
      expect(service.isVariantMode()).toBe(true);
    });
  });

  describe('loadFailed', () => {
    it('should flag a failed list request and clear the flag on the next successful one', () => {
      // Arrange
      dataService.getByGroup.mockReturnValueOnce(throwError(() => new Error('offline')));

      // Act
      service.loadVariants('group-1');
      const failedAfterError = service.loadFailed();
      service.loadVariants('group-1');

      // Assert
      expect(failedAfterError).toBe(true);
      expect(service.loadFailed()).toBe(false);
    });
  });

  describe('ownsShift', () => {
    it('should own a shift that carries the token of the active variant', () => {
      // Arrange
      service.enter(createVariant({ token: 'key-token' }));

      // Act and assert
      expect(service.ownsShift({ analyseToken: 'key-token' })).toBe(true);
    });

    it('should not own a real shift or a shift of another variant', () => {
      // Arrange
      service.enter(createVariant({ token: 'key-token' }));

      // Act and assert
      expect(service.ownsShift({})).toBe(false);
      expect(service.ownsShift({ analyseToken: 'other-token' })).toBe(false);
    });

    it('should own nothing outside variant mode, not even a shift without a token', () => {
      // Act and assert
      expect(service.ownsShift({})).toBe(false);
      expect(service.ownsShift({ analyseToken: 'key-token' })).toBe(false);
    });
  });

  describe('leaveIfGroupChanged', () => {
    it('should end variant mode when another group was selected', () => {
      // Arrange
      service.enter(createVariant({ groupId: 'group-1' }));

      // Act
      service.leaveIfGroupChanged('group-2');

      // Assert
      expect(service.isVariantMode()).toBe(false);
    });

    it('should end variant mode when the group selection was cleared', () => {
      // Arrange
      service.enter(createVariant({ groupId: 'group-1' }));

      // Act
      service.leaveIfGroupChanged(undefined);

      // Assert
      expect(service.isVariantMode()).toBe(false);
    });

    it('should keep variant mode when the variant group is selected again', () => {
      // Arrange
      service.enter(createVariant({ groupId: 'group-1' }));

      // Act
      service.leaveIfGroupChanged('group-1');

      // Assert
      expect(service.isVariantMode()).toBe(true);
    });

    it('should do nothing outside variant mode', () => {
      // Act
      service.leaveIfGroupChanged('group-2');

      // Assert
      expect(service.isVariantMode()).toBe(false);
    });
  });

  describe('releaseWhenForeign', () => {
    it('should end variant mode and report it when a loaded shift carries no token (a real shift)', () => {
      // Arrange
      service.enter(createVariant({ token: 'variant-token-1' }));

      // Act
      const released = service.releaseWhenForeign([{ analyseToken: undefined }]);

      // Assert
      expect(released).toBe(true);
      expect(service.isVariantMode()).toBe(false);
    });

    it('should end variant mode when a loaded shift carries the token of another variant', () => {
      // Arrange
      service.enter(createVariant({ token: 'variant-token-1' }));

      // Act
      const released = service.releaseWhenForeign([{ analyseToken: 'variant-token-2' }]);

      // Assert
      expect(released).toBe(true);
      expect(service.isVariantMode()).toBe(false);
    });

    it('should end variant mode when only one shift of a cut family is foreign', () => {
      // Arrange
      service.enter(createVariant({ token: 'variant-token-1' }));

      // Act
      const released = service.releaseWhenForeign([
        { analyseToken: 'variant-token-1' },
        { analyseToken: undefined },
      ]);

      // Assert
      expect(released).toBe(true);
    });

    it('should keep variant mode when every loaded shift belongs to the active variant', () => {
      // Arrange
      service.enter(createVariant({ token: 'variant-token-1' }));

      // Act
      const released = service.releaseWhenForeign([
        { analyseToken: 'variant-token-1' },
        { analyseToken: 'variant-token-1' },
      ]);

      // Assert
      expect(released).toBe(false);
      expect(service.isVariantMode()).toBe(true);
    });

    it('should not pass a verdict on an empty list', () => {
      // Arrange
      service.enter(createVariant());

      // Act
      const released = service.releaseWhenForeign([]);

      // Assert
      expect(released).toBe(false);
      expect(service.isVariantMode()).toBe(true);
    });

    it('should report nothing outside variant mode', () => {
      // Act
      const released = service.releaseWhenForeign([{ analyseToken: undefined }]);

      // Assert
      expect(released).toBe(false);
    });
  });

  describe('enter and leave', () => {
    it('should switch variant mode on with the entered variant', () => {
      // Arrange
      const variant = createVariant();

      // Act
      service.enter(variant);

      // Assert
      expect(service.activeVariant()).toEqual(variant);
      expect(service.isVariantMode()).toBe(true);
    });

    it('should switch variant mode off again', () => {
      // Arrange
      service.enter(createVariant());

      // Act
      service.leave();

      // Assert
      expect(service.activeVariant()).toBeNull();
      expect(service.isVariantMode()).toBe(false);
    });
  });

  describe('canManage', () => {
    it('should be false without the right to edit shifts', () => {
      expect(service.canManage()).toBe(false);
    });

    it('should follow CanEditShifts', () => {
      // Act
      permissions.set([PERMISSIONS.CanEditShifts]);

      // Assert
      expect(service.canManage()).toBe(true);
    });

    it('should not be granted by an unrelated right', () => {
      // Act
      permissions.set([PERMISSIONS.CanViewClients]);

      // Assert
      expect(service.canManage()).toBe(false);
    });
  });

  describe('create', () => {
    it('should add the created variant to the list', () => {
      // Arrange
      const created = createVariant({ id: 'variant-new' });
      dataService.create.mockReturnValue(of(created));
      const request = { name: 'New', groupId: 'group-1', fromDate: '2026-11-02', untilDate: '2026-11-29' };

      // Act
      service.create(request).subscribe();

      // Assert
      expect(dataService.create).toHaveBeenCalledWith(request);
      expect(service.variants()).toEqual([created]);
    });
  });

  describe('update', () => {
    it('should replace the variant in the list and in the active variant', () => {
      // Arrange
      const original = createVariant();
      dataService.getByGroup.mockReturnValue(of([original]));
      service.loadVariants('group-1');
      service.enter(original);
      const updated = createVariant({ name: 'Renamed' });
      dataService.update.mockReturnValue(of(updated));

      // Act
      service.update('variant-1', { name: 'Renamed', fromDate: '2026-11-02', untilDate: '2026-11-29' }).subscribe();

      // Assert
      expect(service.variants()[0].name).toBe('Renamed');
      expect(service.activeVariant()?.name).toBe('Renamed');
    });
  });

  describe('remove', () => {
    it('should drop the variant from the list', () => {
      // Arrange
      dataService.getByGroup.mockReturnValue(of([createVariant(), createVariant({ id: 'variant-2' })]));
      service.loadVariants('group-1');

      // Act
      service.remove('variant-2').subscribe();

      // Assert
      expect(dataService.delete).toHaveBeenCalledWith('variant-2');
      expect(service.variants().map((v) => v.id)).toEqual(['variant-1']);
    });

    it('should leave variant mode when the active variant is removed', () => {
      // Arrange
      const variant = createVariant();
      dataService.getByGroup.mockReturnValue(of([variant]));
      service.loadVariants('group-1');
      service.enter(variant);

      // Act
      service.remove('variant-1').subscribe();

      // Assert
      expect(service.isVariantMode()).toBe(false);
    });
  });

  describe('deleteShift and copyShifts', () => {
    it('should reload the group list after a shift was deleted so the shift count is current', () => {
      // Arrange
      service.loadVariants('group-1');
      dataService.getByGroup.mockClear();

      // Act
      service.deleteShift('variant-1', 'shift-9').subscribe();

      // Assert
      expect(dataService.deleteShift).toHaveBeenCalledWith('variant-1', 'shift-9');
      expect(dataService.getByGroup).toHaveBeenCalledWith('group-1');
    });

    it('should hand back the copy result and reload the group list', () => {
      // Arrange
      service.loadVariants('group-1');
      dataService.getByGroup.mockClear();
      let copied = 0;

      // Act
      service.copyShifts('variant-1', { shiftIds: ['s-1'] }).subscribe((result) => (copied = result.copiedFamilies));

      // Assert
      expect(dataService.copyShifts).toHaveBeenCalledWith('variant-1', { shiftIds: ['s-1'] });
      expect(copied).toBe(1);
      expect(dataService.getByGroup).toHaveBeenCalledWith('group-1');
    });
  });

  describe('loadShifts', () => {
    it('should return the shifts of the variant', () => {
      // Arrange
      dataService.getShifts.mockReturnValue(of([{ id: 's-1' }]));
      let count = 0;

      // Act
      service.loadShifts('variant-1').subscribe((shifts) => (count = shifts.length));

      // Assert
      expect(dataService.getShifts).toHaveBeenCalledWith('variant-1');
      expect(count).toBe(1);
    });
  });

  describe('keys of a group and its subgroups', () => {
    it('drops the list of the group loaded before as soon as another group is requested', () => {
      // Arrange
      dataService.getByGroup.mockReturnValue(of([createVariant()]));
      service.loadVariants('group-1');
      dataService.getByGroup.mockReturnValue(NEVER);

      // Act
      service.loadVariants('group-2');

      // Assert
      expect(service.variants()).toEqual([]);
    });

    it('ignores a late answer for the group requested before', () => {
      // Arrange
      const lateAnswer = new Subject<IScenarioVariant[]>();
      dataService.getByGroup.mockReturnValue(lateAnswer);
      service.loadVariants('group-1');
      dataService.getByGroup.mockReturnValue(of([createVariant({ id: 'current', groupId: 'group-2' })]));
      service.loadVariants('group-2');

      // Act
      lateAnswer.next([createVariant()]);

      // Assert
      expect(service.variants().map((variant) => variant.id)).toEqual(['current']);
    });

    it('keeps the list while the same group reloads', () => {
      // Arrange
      dataService.getByGroup.mockReturnValue(of([createVariant()]));
      service.loadVariants('group-1');
      dataService.getByGroup.mockReturnValue(NEVER);

      // Act
      service.loadVariants('group-1');

      // Assert
      expect(service.variants()).toHaveLength(1);
    });

    it('keeps a key of a subgroup active while its parent group stays selected, and refreshes it', () => {
      // Arrange
      const subgroupKey = createVariant({ id: 'sub', groupId: 'group-1-a' });
      dataService.getByGroup.mockReturnValue(of([subgroupKey]));
      service.loadVariants('group-1');
      service.enter(subgroupKey);

      // Act
      dataService.getByGroup.mockReturnValue(of([{ ...subgroupKey, name: 'Renamed' }]));
      service.loadVariants('group-1');
      service.leaveIfGroupChanged('group-1');

      // Assert
      expect(service.activeVariant()?.name).toBe('Renamed');
    });

    it('ends variant mode when a group outside is selected', () => {
      // Arrange
      const subgroupKey = createVariant({ id: 'sub', groupId: 'group-1-a' });
      dataService.getByGroup.mockReturnValue(of([subgroupKey]));
      service.loadVariants('group-1');
      service.enter(subgroupKey);

      // Act
      service.leaveIfGroupChanged('group-2');

      // Assert
      expect(service.activeVariant()).toBeNull();
    });
  });
});
