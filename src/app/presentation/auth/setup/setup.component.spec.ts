// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';

import { SetupComponent } from './setup.component';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

describe('SetupComponent', () => {
  let component: SetupComponent;
  let fixture: ComponentFixture<SetupComponent>;
  let dataSetupService: any;
  let authService: any;
  let navigationService: any;
  let toastService: any;

  beforeEach(async () => {
    const dataSetupServiceSpy = {
      completeOwnAdmin: vi.fn(),
    };
    const authServiceSpy = {
      logOut: vi.fn(),
    };
    const navigationServiceSpy = {
      navigateToRoot: vi.fn(),
    };
    const toastServiceSpy = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };
    const translateServiceSpy = {
      instant: vi.fn((key: string) => key),
      get: vi.fn().mockReturnValue(of('Translated text')),
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

  it('should reject an incomplete form without calling the backend', () => {
    component.setupFormModel.update((m) => ({ ...m, firstName: 'Jane' }));

    component.onSave();

    expect(dataSetupService.completeOwnAdmin).not.toHaveBeenCalled();
    expect(toastService.showError).toHaveBeenCalled();
  });

  it('should complete setup, log out and navigate to login on success', () => {
    dataSetupService.completeOwnAdmin.mockReturnValue(of(undefined));
    component.setupFormModel.set({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      userName: 'jane.doe',
      password: 'Sup3rSecret!',
    });

    component.onSave();

    expect(dataSetupService.completeOwnAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        userName: 'jane.doe',
        password: 'Sup3rSecret!',
        sendEmail: false,
      })
    );
    expect(authService.logOut).toHaveBeenCalled();
    expect(toastService.showSuccess).toHaveBeenCalled();
    expect(navigationService.navigateToRoot).toHaveBeenCalled();
  });

  it('should show an error toast and stop saving when the backend rejects the request', () => {
    dataSetupService.completeOwnAdmin.mockReturnValue(throwError(() => new Error('boom')));
    component.setupFormModel.set({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      userName: 'jane.doe',
      password: 'Sup3rSecret!',
    });

    component.onSave();

    expect(toastService.showError).toHaveBeenCalled();
    expect(component.isSaving()).toBe(false);
    expect(navigationService.navigateToRoot).not.toHaveBeenCalled();
  });
});
