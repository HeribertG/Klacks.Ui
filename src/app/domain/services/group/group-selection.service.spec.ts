// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { GroupSelectionService } from './group-selection.service';
import { ENTITY_STATE_PROVIDER_TOKEN } from 'src/app/domain/interfaces/entity-state-provider.interface';
import { DataManagementBreakPlaceholderService } from '../break/data-management-break-placeholder.service';
import { DataManagementScheduleService } from '../schedule/data-management-schedule.service';
import { DataManagementShiftService } from '../shift/data-management-shift.service';
import { DataManagementClientService } from '../client/data-management-client.service';
import { AppSettingsManagementService } from '../settings/app-settings-management.service';
import { AnalyseScenarioService } from '../schedule/analyse-scenario.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { Group } from 'src/app/domain/models/group/group-class';

describe('GroupSelectionService', () => {
  let service: GroupSelectionService;
  let getGroup: ReturnType<typeof vi.fn>;

  function group(id: string): Group {
    const value = new Group();
    value.id = id;
    return value;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    getGroup = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ENTITY_STATE_PROVIDER_TOKEN, useValue: { nameOfVisibleEntity: () => 'none' } },
        { provide: DataManagementBreakPlaceholderService, useValue: {} },
        { provide: DataManagementScheduleService, useValue: {} },
        { provide: DataManagementShiftService, useValue: {} },
        { provide: DataManagementClientService, useValue: {} },
        { provide: AppSettingsManagementService, useValue: {} },
        { provide: AnalyseScenarioService, useValue: {} },
        { provide: DataGroupService, useValue: { getGroup } },
      ],
    });
    service = TestBed.inject(GroupSelectionService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('selectGroupById', () => {
    it('reads the group and selects it', async () => {
      getGroup.mockReturnValue(of(group('group-1')));

      await service.selectGroupById('group-1');

      expect(getGroup).toHaveBeenCalledWith('group-1');
      expect(service.selectedGroupId).toBe('group-1');
      expect(service.selectedGroupChanged()).toBe(true);
    });

    it('does not read again when the group is already selected', async () => {
      service.selectGroup(group('group-1'));

      await service.selectGroupById('group-1');

      expect(getGroup).not.toHaveBeenCalled();
      expect(service.selectedGroupId).toBe('group-1');
    });

    it('keeps the current selection when the group cannot be read', async () => {
      service.selectGroup(group('group-1'));
      getGroup.mockReturnValue(throwError(() => new Error('403')));

      await expect(service.selectGroupById('group-2')).resolves.toBeUndefined();

      expect(service.selectedGroupId).toBe('group-1');
    });

    it('keeps the current selection when the API returns no group', async () => {
      getGroup.mockReturnValue(of(null));

      await service.selectGroupById('group-2');

      expect(service.selectedGroupId).toBeUndefined();
    });
  });
});
