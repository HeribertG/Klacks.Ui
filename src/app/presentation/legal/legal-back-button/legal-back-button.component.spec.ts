// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Navigation, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { LegalBackButtonComponent } from './legal-back-button.component';

describe('LegalBackButtonComponent', () => {
  const CLOSE_LABEL = 'Schliessen';
  const BACK_TO_LOGIN_LABEL = 'Zurück zur Anmeldung';

  let fixture: ComponentFixture<LegalBackButtonComponent>;
  let lastSuccessfulNavigation: ReturnType<typeof signal<Navigation | null>>;
  let location: { back: ReturnType<typeof vi.fn> };
  let navigation: { navigateToDashboard: ReturnType<typeof vi.fn>; navigateToRoot: ReturnType<typeof vi.fn> };
  let auth: { authenticated: ReturnType<typeof vi.fn> };

  const cameFromInsideTheApp = (): Navigation => ({ previousNavigation: {} as Navigation }) as Navigation;
  const openedDirectly = (): Navigation => ({ previousNavigation: null }) as Navigation;

  const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  beforeEach(async () => {
    lastSuccessfulNavigation = signal<Navigation | null>(openedDirectly());
    location = { back: vi.fn() };
    navigation = { navigateToDashboard: vi.fn(), navigateToRoot: vi.fn().mockResolvedValue(true) };
    auth = { authenticated: vi.fn().mockReturnValue(true) };

    await TestBed.configureTestingModule({
      imports: [LegalBackButtonComponent, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: { lastSuccessfulNavigation: lastSuccessfulNavigation } },
        { provide: Location, useValue: location },
        { provide: NavigationService, useValue: navigation },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', { close: CLOSE_LABEL, 'legal.back-to-login': BACK_TO_LOGIN_LABEL });
    translate.use('de');

    fixture = TestBed.createComponent(LegalBackButtonComponent);
    fixture.detectChanges();
  });

  it('labels the button with the shared close translation, not the back-to-login text', () => {
    // Arrange
    // Act
    const label = button().textContent?.trim();

    // Assert
    expect(label).toBe(CLOSE_LABEL);
    expect(label).not.toBe(BACK_TO_LOGIN_LABEL);
  });

  it('is a non-submitting button', () => {
    // Arrange
    // Act
    const type = button().getAttribute('type');

    // Assert
    expect(type).toBe('button');
  });

  it('goes back in history when the page was opened from inside the app', () => {
    // Arrange
    lastSuccessfulNavigation.set(cameFromInsideTheApp());

    // Act
    button().click();

    // Assert
    expect(location.back).toHaveBeenCalledTimes(1);
    expect(navigation.navigateToDashboard).not.toHaveBeenCalled();
    expect(navigation.navigateToRoot).not.toHaveBeenCalled();
  });

  it('opens the dashboard for a signed-in user who opened the page directly', () => {
    // Arrange
    auth.authenticated.mockReturnValue(true);

    // Act
    button().click();

    // Assert
    expect(navigation.navigateToDashboard).toHaveBeenCalledTimes(1);
    expect(location.back).not.toHaveBeenCalled();
  });

  it('opens the login root for an anonymous visitor who opened the page directly', () => {
    // Arrange
    auth.authenticated.mockReturnValue(false);

    // Act
    button().click();

    // Assert
    expect(navigation.navigateToRoot).toHaveBeenCalledTimes(1);
    expect(navigation.navigateToDashboard).not.toHaveBeenCalled();
    expect(location.back).not.toHaveBeenCalled();
  });

  it('treats a missing last navigation as opened directly', () => {
    // Arrange
    lastSuccessfulNavigation.set(null);
    auth.authenticated.mockReturnValue(false);

    // Act
    button().click();

    // Assert
    expect(navigation.navigateToRoot).toHaveBeenCalledTimes(1);
    expect(location.back).not.toHaveBeenCalled();
  });
});
