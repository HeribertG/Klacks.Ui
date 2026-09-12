// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, EMPTY } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { EditAddressHomeComponent } from './edit-address-home.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { AssistantPageContextService } from 'src/app/domain/services/assistant/assistant-page-context.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { UrlParameterService } from 'src/app/presentation/services/url-parameter.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';
import { QuickPrintActionService } from 'src/app/presentation/services/quick-print-action.service';
import { EditAddressCardVisibilityService } from '../edit-address-card-visibility.service';

/**
 * What this pins is the honest behaviour: ngOnInit shows the savebar unconditionally, it does not
 * consult AuthorizationService at all. The rights question is answered one level down — the fields
 * and cards gate themselves, and the backend refuses a save the user may not make. A test asserting
 * "shown BECAUSE the user holds CanEditClientNotes" would be green with no rights at all and would
 * therefore claim a guarantee that does not exist.
 */
describe('EditAddressHomeComponent - savebar visibility does not depend on rights', () => {
  let held: Set<string>;
  let savebarService: { setSavebarVisibility: ReturnType<typeof vi.fn> };

  const createComponent = (): EditAddressHomeComponent => {
    savebarService = { setSavebarVisibility: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: WorkplaceStateService, useValue: { setActiveManagerByRoute: vi.fn() } },
        { provide: DataManagementClientService, useValue: { createClient: vi.fn(), readClient: vi.fn() } },
        { provide: DataManagementGroupService, useValue: {} },
        { provide: AuthorizationService, useValue: { hasPermission: (permission: string) => held.has(permission) } },
        { provide: FeaturePluginStateService, useValue: { isPluginEnabled: () => false } },
        { provide: QuickPrintActionService, useValue: { ensureDefaultsLoaded: () => Promise.resolve() } },
        { provide: EditAddressCardVisibilityService, useValue: {} },
        { provide: UrlParameterService, useValue: {} },
        { provide: SavebarService, useValue: savebarService },
        { provide: LayoutService, useValue: { setContainerToNormalSize: vi.fn() } },
        { provide: SearchService, useValue: { setSearchVisibility: vi.fn() } },
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
        { provide: AssistantPageContextService, useValue: { setSelectedClientId: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: { on: () => EMPTY } },
        { provide: AsideService, useValue: {} },
        { provide: ToastShowService, useValue: {} },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
      ],
    });

    return TestBed.runInInjectionContext(() => new EditAddressHomeComponent());
  };

  beforeEach(() => {
    held = new Set<string>([PERMISSIONS.CanEditClientNotes]);
  });

  it('shows the savebar for a planer holding only CanEditClientNotes, so a note-only save stays reachable', () => {
    const component = createComponent();

    component.ngOnInit();

    expect(savebarService.setSavebarVisibility).toHaveBeenCalledWith(true);
  });

  it('shows the savebar with no rights at all, which is what makes the assertion above no proof of gating', () => {
    held.clear();
    const component = createComponent();

    component.ngOnInit();

    expect(savebarService.setSavebarVisibility).toHaveBeenCalledWith(true);
  });
});
