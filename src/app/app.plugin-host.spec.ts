// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { firstValueFrom, of } from 'rxjs';
import { providePluginHost, toShiftFilter } from './app.plugin-host';
import {
  IPluginWorkScheduleReader,
  PLUGIN_ASSISTANT_LAUNCHER,
  PLUGIN_BACKEND_API_URL,
  PLUGIN_DELETE_CONFIRMATION,
  PLUGIN_WORK_SCHEDULE_READER,
} from 'klacks-plugin-contracts';
import { PluginSetupAssistantOfferService } from 'src/app/presentation/services/plugin-setup-assistant-offer.service';
import { PluginDeleteConfirmationService } from 'src/app/presentation/services/plugin-delete-confirmation.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { IWorkScheduleResponse } from 'src/app/domain/models/schedule/work-schedule-response.interface';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { ShiftFilter } from 'src/app/domain/models/shift/shift-filter-class';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { environment } from 'src/environments/environment';

const registrationFor = (token: unknown): unknown =>
  providePluginHost().find((provider) => (provider as { provide?: unknown }).provide === token);

describe('providePluginHost', () => {
  it('binds the plugin assistant launcher token to the generic offer service', () => {
    expect(registrationFor(PLUGIN_ASSISTANT_LAUNCHER)).toEqual({
      provide: PLUGIN_ASSISTANT_LAUNCHER,
      useExisting: PluginSetupAssistantOfferService,
    });
  });

  it('binds the backend API url and the delete confirmation of the host', () => {
    expect(registrationFor(PLUGIN_BACKEND_API_URL)).toEqual({
      provide: PLUGIN_BACKEND_API_URL,
      useValue: environment.baseUrl,
    });
    expect(registrationFor(PLUGIN_DELETE_CONFIRMATION)).toEqual({
      provide: PLUGIN_DELETE_CONFIRMATION,
      useExisting: PluginDeleteConfirmationService,
    });
  });

  it('builds the host shift filter from a plugin shift query and keeps the other filter defaults', () => {
    // Act
    const shiftFilter = toShiftFilter({ kind: 'container', maxCount: 500, activeDateRange: true, futureDateRange: true });

    // Assert
    const expected = new ShiftFilter();
    expected.numberOfItemsPerPage = 500;
    expected.filterType = ShiftFilterType.Container;
    expected.activeDateRange = true;
    expected.futureDateRange = true;
    expect(shiftFilter).toEqual(expected);
    expect(toShiftFilter({ kind: 'shift', maxCount: 1, activeDateRange: false, futureDateRange: false }).filterType).toBe(
      ShiftFilterType.Shift,
    );
  });

  it('passes the work schedule query through and hands plugins only the work entries', async () => {
    // Arrange
    const response = {
      entries: [
        { entryType: WorkScheduleEntryType.Work, clientId: 'c1', startTime: '08:00', endTime: '12:00' },
        { entryType: WorkScheduleEntryType.Break, clientId: 'c1', startTime: '10:00', endTime: '10:15' },
      ],
      clients: [{ id: 'c1', firstName: 'Ada', name: 'Muster' }],
    } as unknown as IWorkScheduleResponse;
    const getWorkSchedule = vi.fn().mockReturnValue(of(response));
    const registration = registrationFor(PLUGIN_WORK_SCHEDULE_READER) as {
      useFactory: (service: Pick<DataWorkScheduleService, 'getWorkSchedule'>) => IPluginWorkScheduleReader;
    };
    const reader = registration.useFactory({ getWorkSchedule });
    const query = { startDate: '2026-10-23', endDate: '2026-10-23', showEmployees: true, showExtern: true, rowCount: 500 };

    // Act
    const result = await firstValueFrom(reader.readScheduledWorks(query));

    // Assert
    expect(getWorkSchedule).toHaveBeenCalledWith(query);
    expect(result.works).toEqual([response.entries[0]]);
    expect(result.clients).toEqual(response.clients);
  });
});
