// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { SearchService } from 'src/app/application/services/search.service';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';
import { DataManagementEscalationChainService } from 'src/app/domain/services/assistant/data-management-escalation-chain.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { SpeechOutputModeService } from 'src/app/application/services/speech-output-mode.service';

describe('HeaderComponent - escalations visibility', () => {
  let held: Set<string>;

  const createComponent = (): HeaderComponent => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DataLoadFileService, useValue: { logoImage$: () => undefined, logoImageDimensions$: () => undefined } },
        { provide: DataManagementGroupService, useValue: {} },
        { provide: SearchService, useValue: {} },
        { provide: DataManagementProactiveInboxService, useValue: { refreshUnreadCount: vi.fn() } },
        { provide: DataManagementEscalationChainService, useValue: {} },
        { provide: AuthorizationService, useValue: { hasPermission: (permission: string) => held.has(permission) } },
        { provide: OnboardingService, useValue: { state: () => undefined } },
        { provide: AuthService, useValue: { authenticated: () => false } },
        { provide: NavigationService, useValue: {} },
        { provide: AsideService, useValue: { isVisible: () => false } },
        { provide: SpeechOutputModeService, useValue: { isFloatingMode: () => false } },
      ],
    });

    return TestBed.runInInjectionContext(() => new HeaderComponent());
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('hides the escalations entry for a planer or a supervisor without the admin role', () => {
    const component = createComponent();

    expect(component.canViewEscalations()).toBe(false);
  });

  it('shows the escalations entry for an admin', () => {
    held.add(ROLE_ADMIN);
    const component = createComponent();

    expect(component.canViewEscalations()).toBe(true);
  });
});
