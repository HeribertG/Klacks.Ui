// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { SetupComponent } from './setup.component';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  ACCOUNT_REGISTRATION_REASONS,
  ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE,
} from 'src/app/domain/constants/account-registration.constants';
import { PasswordPolicy } from 'src/app/domain/models/setup/password-policy.interface';
import { ROUTE_DATA_FIRST_START } from 'src/app/domain/constants/setup.constants';
import { RealtimeSessionStartService } from 'src/app/application/services/realtime-session-start.service';
import { FirstStartSetupStatusService } from 'src/app/domain/services/setup/first-start-setup-status.service';

const REQUIRED_KEY = 'setup.error.required';
const MISMATCH_KEY = 'setup.error.passwordMismatch';
const GENERIC_ERROR_KEY = 'setup.error';
const UNKNOWN_REASON_KEY = 'accountRegistration.reason.unknown';
const reasonKey = (code: string): string => `accountRegistration.reason.${code}`;

const STRONG_PASSWORD = 'Sup3rSecret!';
const CURRENT_POLICY: PasswordPolicy = {
  requiredLength: 8,
  requireDigit: true,
  requireNonAlphanumeric: true,
  requireUppercase: false,
  requireLowercase: false,
};

const VALID_FORM = {
  firstName: ' Jane ',
  lastName: 'Doe',
  email: 'jane@example.com ',
  password: STRONG_PASSWORD,
  passwordConfirm: STRONG_PASSWORD,
};

const flushPromises = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const rejection = (reasons: string[]): HttpErrorResponse =>
  new HttpErrorResponse({
    status: 400,
    error: {
      title: 'Bad Request',
      status: 400,
      detail: 'rejected',
      errorCode: ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE,
      reasons,
    },
  });

describe('SetupComponent', () => {
  let component: SetupComponent;
  let fixture: ComponentFixture<SetupComponent>;
  let dataSetupService: any;
  let authService: any;
  let navigationService: any;
  let toastService: any;
  let realtimeSessionStart: any;
  let firstStartStatus: any;
  let routeSnapshot: { data: Record<string, unknown> };

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const ruleStates = (): (string | null)[] =>
    Array.from(element().querySelectorAll('.password-rule [role="checkbox"]')).map((node) =>
      node.getAttribute('aria-checked')
    );

  beforeEach(async () => {
    const dataSetupServiceSpy = {
      getStatus: vi.fn().mockReturnValue(of({ requiresOwnAdmin: true, passwordPolicy: CURRENT_POLICY })),
      completeOwnAdmin: vi.fn(),
      getFirstStartStatus: vi.fn().mockReturnValue(of({ requiresOwnAdmin: true, passwordPolicy: CURRENT_POLICY })),
      completeFirstStart: vi.fn(),
    };
    const authServiceSpy = {
      logOut: vi.fn(),
      logIn: vi.fn().mockResolvedValue(true),
      authenticated: vi.fn().mockReturnValue(true),
    };
    const navigationServiceSpy = {
      navigateToRoot: vi.fn().mockResolvedValue(true),
      navigateToCompanySetup: vi.fn().mockResolvedValue(true),
    };
    realtimeSessionStart = { startAfterSignIn: vi.fn() };
    firstStartStatus = { markCompleted: vi.fn() };
    routeSnapshot = { data: {} };
    const toastServiceSpy = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showInfo: vi.fn(),
    };
    const translateServiceSpy = {
      instant: vi.fn((key: string) => key),
      get: vi.fn((key: string) => of(key)),
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
    };

    await TestBed.configureTestingModule({
      imports: [SetupComponent, TranslateModule.forRoot(), FontAwesomeModule, FormsModule],
      providers: [
        { provide: DataSetupService, useValue: dataSetupServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: ToastShowService, useValue: toastServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: RealtimeSessionStartService, useValue: realtimeSessionStart },
        { provide: FirstStartSetupStatusService, useValue: firstStartStatus },
        { provide: ActivatedRoute, useValue: { snapshot: routeSnapshot } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetupComponent);
    component = fixture.componentInstance;

    dataSetupService = TestBed.inject(DataSetupService) as any;
    authService = TestBed.inject(AuthService) as any;
    navigationService = TestBed.inject(NavigationService) as any;
    toastService = TestBed.inject(ToastShowService) as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the page title as the themed h1 and offer no user name field', () => {
    fixture.detectChanges();

    expect(element().querySelector('h1.auth-title')).not.toBeNull();
    expect(element().querySelector('#setupForm-userName')).toBeNull();
  });

  it('should use the autocomplete hints of a new account', () => {
    fixture.detectChanges();

    expect(element().querySelector('#setupForm-firstName')?.getAttribute('autocomplete')).toBe('given-name');
    expect(element().querySelector('#setupForm-lastName')?.getAttribute('autocomplete')).toBe('family-name');
    expect(element().querySelector('#setupForm-email')?.getAttribute('autocomplete')).toBe('email');
    expect(element().querySelector('#setupForm-email')?.getAttribute('type')).toBe('email');
    expect(element().querySelector('#setupForm-password')?.getAttribute('autocomplete')).toBe('new-password');
    expect(element().querySelector('#setupForm-passwordConfirm')?.getAttribute('autocomplete')).toBe('new-password');
  });

  describe('password rules', () => {
    it('should list only the rules the loaded policy demands', () => {
      fixture.detectChanges();

      const labels = component.passwordRules().map((rule) => rule.labelKey);
      expect(labels).toEqual(['setup.rule.length', 'setup.rule.digit', 'setup.rule.nonAlphanumeric']);
      expect(ruleStates()).toEqual(['false', 'false', 'false']);
    });

    it('should mark each rule as met while the password is typed', () => {
      fixture.detectChanges();

      component.updatePassword('abc1');
      fixture.detectChanges();
      expect(ruleStates()).toEqual(['false', 'true', 'false']);

      component.updatePassword(STRONG_PASSWORD);
      fixture.detectChanges();
      expect(ruleStates()).toEqual(['true', 'true', 'true']);
    });

    it('should pass the required length to the length rule text', () => {
      fixture.detectChanges();

      expect(component.requiredLength()).toBe(CURRENT_POLICY.requiredLength);
    });

    it('should link the rule list to the password input', () => {
      fixture.detectChanges();

      expect(element().querySelector('#setupForm-password')?.getAttribute('aria-describedby')).toBe(
        'setupForm-password-rules'
      );
    });

    it('should leave the rule list out when the status cannot be loaded', () => {
      dataSetupService.getStatus.mockReturnValue(throwError(() => new Error('offline')));

      fixture.detectChanges();

      expect(component.passwordRules()).toEqual([]);
      expect(element().querySelector('.password-rules')).toBeNull();
    });

    it('should leave the rule list out when the backend sends no password policy', () => {
      dataSetupService.getStatus.mockReturnValue(of({ requiresOwnAdmin: true }));

      fixture.detectChanges();

      expect(element().querySelector('.password-rules')).toBeNull();
    });
  });

  describe('client-side validation', () => {
    it('should not show any error before the first save attempt', () => {
      fixture.detectChanges();

      expect(element().querySelectorAll('.field-error').length).toBe(0);
      expect(element().querySelector('#setupForm-firstName')?.getAttribute('aria-invalid')).toBeNull();
    });

    it('should reject an incomplete form inline without calling the backend or showing a toast', () => {
      fixture.detectChanges();
      component.setupFormModel.update((m) => ({ ...m, firstName: 'Jane' }));

      component.onSave();
      fixture.detectChanges();

      expect(dataSetupService.completeOwnAdmin).not.toHaveBeenCalled();
      expect(toastService.showError).not.toHaveBeenCalled();
      expect(component.fieldErrors().firstName).toEqual([]);
      expect(component.fieldErrors().lastName).toEqual([REQUIRED_KEY]);
      expect(component.fieldErrors().email).toEqual([REQUIRED_KEY]);
      expect(component.fieldErrors().password).toEqual([REQUIRED_KEY]);
      expect(component.fieldErrors().passwordConfirm).toEqual([REQUIRED_KEY]);

      const lastName = element().querySelector('#setupForm-lastName');
      expect(lastName?.getAttribute('aria-invalid')).toBe('true');
      expect(lastName?.getAttribute('aria-describedby')).toBe('setupForm-lastName-error');
      expect(element().querySelector('#setupForm-lastName-error')?.textContent).toContain(REQUIRED_KEY);
    });

    it('should treat a name of blanks as missing', () => {
      component.setupFormModel.set({ ...VALID_FORM, lastName: '   ' });

      component.onSave();

      expect(dataSetupService.completeOwnAdmin).not.toHaveBeenCalled();
      expect(component.fieldErrors().lastName).toEqual([REQUIRED_KEY]);
    });

    it('should reject a password repetition that does not match', () => {
      fixture.detectChanges();
      component.setupFormModel.set({ ...VALID_FORM, passwordConfirm: 'Sup3rSecret?' });

      component.onSave();
      fixture.detectChanges();

      expect(dataSetupService.completeOwnAdmin).not.toHaveBeenCalled();
      expect(component.fieldErrors().passwordConfirm).toEqual([MISMATCH_KEY]);
      expect(element().querySelector('#setupForm-passwordConfirm')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('should reject a password that breaks a rule by marking the rule in the list, not by repeating it under the field', () => {
      fixture.detectChanges();
      component.setupFormModel.set({ ...VALID_FORM, password: 'Secret!!', passwordConfirm: 'Secret!!' });

      component.onSave();
      fixture.detectChanges();

      expect(dataSetupService.completeOwnAdmin).not.toHaveBeenCalled();
      expect(component.fieldErrors().password).toEqual([]);
      expect(component.passwordInvalid()).toBe(true);
      const password = element().querySelector('#setupForm-password');
      expect(password?.getAttribute('aria-invalid')).toBe('true');
      expect(password?.classList.contains('is-invalid')).toBe(true);
      expect(password?.getAttribute('aria-describedby')).toBe('setupForm-password-rules');
      expect(element().querySelectorAll('.password-rule.unmet-error')).toHaveLength(1);
    });

    it('should clear an error as soon as the field is corrected', () => {
      component.setupFormModel.set({ ...VALID_FORM, lastName: '' });
      component.onSave();

      component.setupFormModel.update((m) => ({ ...m, lastName: 'Doe' }));

      expect(component.fieldErrors().lastName).toEqual([]);
    });

    it('should move the focus to the first invalid field', async () => {
      fixture.detectChanges();
      component.setupFormModel.set({ ...VALID_FORM, email: '' });

      component.onSave();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement?.id).toBe('setupForm-email');
    });
  });

  describe('saving', () => {
    it('should send the trimmed account without a user name, end the seeded session and sign the new admin in', async () => {
      dataSetupService.completeOwnAdmin.mockReturnValue(of(undefined));
      component.setupFormModel.set(VALID_FORM);

      component.onSave();
      await flushPromises();

      expect(dataSetupService.completeOwnAdmin).toHaveBeenCalledWith({
        appName: '',
        message: '',
        sendEmail: false,
        title: '',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: STRONG_PASSWORD,
      });
      expect(dataSetupService.completeFirstStart).not.toHaveBeenCalled();
      expect(authService.logOut).toHaveBeenCalled();
      expect(authService.logIn).toHaveBeenCalledWith('jane@example.com', STRONG_PASSWORD);
      expect(authService.logOut.mock.invocationCallOrder[0]).toBeLessThan(
        authService.logIn.mock.invocationCallOrder[0]
      );
      expect(firstStartStatus.markCompleted).toHaveBeenCalled();
      expect(realtimeSessionStart.startAfterSignIn).toHaveBeenCalled();
      expect(navigationService.navigateToCompanySetup).toHaveBeenCalled();
      expect(navigationService.navigateToRoot).not.toHaveBeenCalled();
      expect(toastService.showSuccess).not.toHaveBeenCalled();
    });

    it('should fall back to the login page with the success message when the new admin cannot be signed in', async () => {
      dataSetupService.completeOwnAdmin.mockReturnValue(of(undefined));
      authService.logIn.mockResolvedValue(false);
      component.setupFormModel.set(VALID_FORM);

      component.onSave();
      await flushPromises();

      expect(realtimeSessionStart.startAfterSignIn).not.toHaveBeenCalled();
      expect(navigationService.navigateToCompanySetup).not.toHaveBeenCalled();
      expect(toastService.showSuccess).toHaveBeenCalledWith('setup.success', '');
      expect(navigationService.navigateToRoot).toHaveBeenCalled();
      expect(component.isSaving()).toBe(false);
    });

    it('should save without a rule list when the policy could not be loaded and leave the decision to the server', () => {
      dataSetupService.getStatus.mockReturnValue(throwError(() => new Error('offline')));
      dataSetupService.completeOwnAdmin.mockReturnValue(of(undefined));
      fixture.detectChanges();
      component.setupFormModel.set({ ...VALID_FORM, password: 'short', passwordConfirm: 'short' });

      component.onSave();

      expect(dataSetupService.completeOwnAdmin).toHaveBeenCalled();
    });

    it('should not send twice while a save is running', () => {
      dataSetupService.completeOwnAdmin.mockReturnValue(of());
      component.setupFormModel.set(VALID_FORM);

      component.onSave();
      component.onSave();

      expect(dataSetupService.completeOwnAdmin).toHaveBeenCalledTimes(1);
      expect(component.isSaving()).toBe(true);
    });
  });

  describe('server rejection', () => {
    it('should show password reasons at the password, email reasons at the email and the rest above the button', () => {
      dataSetupService.completeOwnAdmin.mockReturnValue(
        throwError(() =>
          rejection([
            ACCOUNT_REGISTRATION_REASONS.PASSWORD_TOO_SHORT,
            ACCOUNT_REGISTRATION_REASONS.DUPLICATE_EMAIL,
            ACCOUNT_REGISTRATION_REASONS.DUPLICATE_USER_NAME,
            'SomethingNewFromIdentity',
          ])
        )
      );
      fixture.detectChanges();
      component.setupFormModel.set(VALID_FORM);

      component.onSave();
      fixture.detectChanges();

      expect(component.isSaving()).toBe(false);
      expect(toastService.showError).not.toHaveBeenCalled();
      expect(component.fieldErrors().password).toEqual([
        reasonKey(ACCOUNT_REGISTRATION_REASONS.PASSWORD_TOO_SHORT),
      ]);
      expect(component.fieldErrors().email).toEqual([reasonKey(ACCOUNT_REGISTRATION_REASONS.DUPLICATE_EMAIL)]);
      expect(component.generalErrorKeys()).toEqual([
        reasonKey(ACCOUNT_REGISTRATION_REASONS.DUPLICATE_USER_NAME),
        UNKNOWN_REASON_KEY,
      ]);
      expect(element().querySelector('#setupForm-email')?.getAttribute('aria-invalid')).toBe('true');
      expect(element().querySelector('[role="alert"]')?.textContent).toContain(UNKNOWN_REASON_KEY);
      expect(navigationService.navigateToRoot).not.toHaveBeenCalled();
    });

    it('should drop a server error at the email once the email is changed', () => {
      dataSetupService.completeOwnAdmin.mockReturnValue(
        throwError(() => rejection([ACCOUNT_REGISTRATION_REASONS.INVALID_EMAIL]))
      );
      component.setupFormModel.set(VALID_FORM);
      component.onSave();
      expect(component.fieldErrors().email).toEqual([reasonKey(ACCOUNT_REGISTRATION_REASONS.INVALID_EMAIL)]);

      component.setupFormModel.update((m) => ({ ...m, email: 'jane.doe@example.com' }));

      expect(component.fieldErrors().email).toEqual([]);
    });

    it('should sign out and send the user to the login when the setup was already completed (409)', () => {
      dataSetupService.completeOwnAdmin.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { title: 'Conflict' } }))
      );
      component.setupFormModel.set(VALID_FORM);

      component.onSave();

      expect(component.isSaving()).toBe(false);
      expect(authService.logOut).toHaveBeenCalled();
      expect(firstStartStatus.markCompleted).toHaveBeenCalled();
      expect(toastService.showInfo).toHaveBeenCalledWith('setup.error.alreadyCompleted');
      expect(navigationService.navigateToRoot).toHaveBeenCalled();
      expect(toastService.showSuccess).not.toHaveBeenCalled();
    });

    it('should show the server error inline for a rolled-back 500 and keep the form', () => {
      dataSetupService.completeOwnAdmin.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.setupFormModel.set(VALID_FORM);

      component.onSave();

      expect(component.isSaving()).toBe(false);
      expect(component.generalErrorKeys()).toEqual(['setup.error.server']);
      expect(component.setupFormModel()).toEqual(VALID_FORM);
      expect(authService.logOut).not.toHaveBeenCalled();
      expect(navigationService.navigateToRoot).not.toHaveBeenCalled();
    });

    it.each([
      ['a 400 without the rejection code', new HttpErrorResponse({ status: 400, error: { title: 'Bad Request' } })],
      ['an unexpected error', new Error('boom')],
    ])('should show the general setup error inline for %s', (_description, error) => {
      dataSetupService.completeOwnAdmin.mockReturnValue(throwError(() => error));
      fixture.detectChanges();
      component.setupFormModel.set(VALID_FORM);

      component.onSave();
      fixture.detectChanges();

      expect(component.isSaving()).toBe(false);
      expect(component.generalErrorKeys()).toEqual([GENERIC_ERROR_KEY]);
      expect(toastService.showError).not.toHaveBeenCalled();
      expect(element().querySelector('[role="alert"]')?.textContent).toContain(GENERIC_ERROR_KEY);
      expect(navigationService.navigateToRoot).not.toHaveBeenCalled();
    });

    it('should clear the previous general error when saving again', () => {
      dataSetupService.completeOwnAdmin.mockReturnValueOnce(throwError(() => new Error('boom')));
      dataSetupService.completeOwnAdmin.mockReturnValueOnce(of(undefined));
      component.setupFormModel.set(VALID_FORM);

      component.onSave();
      expect(component.generalErrorKeys()).toEqual([GENERIC_ERROR_KEY]);

      component.onSave();
      expect(component.generalErrorKeys()).toEqual([]);
    });
  });

  describe('first start without a session', () => {
    beforeEach(() => {
      routeSnapshot.data = { [ROUTE_DATA_FIRST_START]: true };
      authService.authenticated.mockReturnValue(false);
      fixture = TestBed.createComponent(SetupComponent);
      component = fixture.componentInstance;
    });

    it('should read the password rules from the anonymous first-start status', () => {
      fixture.detectChanges();

      expect(dataSetupService.getFirstStartStatus).toHaveBeenCalled();
      expect(dataSetupService.getStatus).not.toHaveBeenCalled();
      expect(component.passwordRules().length).toBeGreaterThan(0);
    });

    it('should register through the anonymous endpoint and sign the new admin in without a logout', async () => {
      dataSetupService.completeFirstStart.mockReturnValue(of(undefined));
      component.setupFormModel.set(VALID_FORM);

      component.onSave();
      await flushPromises();

      expect(dataSetupService.completeFirstStart).toHaveBeenCalled();
      expect(dataSetupService.completeOwnAdmin).not.toHaveBeenCalled();
      expect(authService.logOut).not.toHaveBeenCalled();
      expect(authService.logIn).toHaveBeenCalledWith('jane@example.com', STRONG_PASSWORD);
      expect(firstStartStatus.markCompleted).toHaveBeenCalled();
      expect(navigationService.navigateToCompanySetup).toHaveBeenCalled();
    });

    it('should send the user to the login when somebody else completed the first start (409)', () => {
      dataSetupService.completeFirstStart.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { title: 'Conflict' } }))
      );
      component.setupFormModel.set(VALID_FORM);

      component.onSave();

      expect(authService.logOut).not.toHaveBeenCalled();
      expect(firstStartStatus.markCompleted).toHaveBeenCalled();
      expect(toastService.showInfo).toHaveBeenCalledWith('setup.error.alreadyCompleted');
      expect(navigationService.navigateToRoot).toHaveBeenCalled();
      expect(authService.logIn).not.toHaveBeenCalled();
    });
  });
});
