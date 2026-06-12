// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Clipboard } from '@angular/cdk/clipboard';
import { of, throwError } from 'rxjs';

import { PersonalAccessTokensComponent } from './personal-access-tokens.component';
import { DataPersonalAccessTokenService } from 'src/app/infrastructure/api/settings/data-personal-access-token.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  IPersonalAccessToken,
  IPersonalAccessTokenCreated,
} from 'src/app/domain/models/settings/personal-access-token';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';

describe('PersonalAccessTokensComponent', () => {
  let component: PersonalAccessTokensComponent;
  let fixture: ComponentFixture<PersonalAccessTokensComponent>;
  let mockTokenService: any;
  let mockToastService: any;
  let mockNgbModal: any;
  let mockClipboard: any;
  let mockModalService: ModalService;
  let mockTranslateService: any;

  const mockTokens: IPersonalAccessToken[] = [
    {
      id: '1',
      name: 'CI Pipeline',
      tokenPrefix: 'pat_abc1',
      createdAt: '2026-06-01T08:00:00Z',
      expiresAt: '2027-06-01T08:00:00Z',
      lastUsedAt: '2026-06-10T12:00:00Z',
    },
    {
      id: '2',
      name: 'Reporting Script',
      tokenPrefix: 'pat_def2',
      createdAt: '2026-05-01T08:00:00Z',
      expiresAt: '2026-12-01T08:00:00Z',
      lastUsedAt: undefined,
    },
  ];

  const mockCreatedToken: IPersonalAccessTokenCreated = {
    id: '3',
    name: 'New Token',
    tokenPrefix: 'pat_ghi3',
    expiresAt: '2027-06-12T08:00:00Z',
    token: 'pat_ghi3_full_plaintext_secret_value',
  };

  beforeEach(async () => {
    vi.spyOn(console, 'error');

    const tokenServiceSpy = {
      getTokenList: vi.fn(),
      createToken: vi.fn(),
      revokeToken: vi.fn(),
    };

    const toastServiceSpy = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
    };

    const ngbModalSpy = {
      open: vi.fn(),
    };

    const clipboardSpy = {
      copy: vi.fn(),
    };

    const translateServiceSpy = {
      instant: vi.fn(),
      get: vi.fn(),
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
    };
    translateServiceSpy.instant.mockReturnValue('Translated text');
    translateServiceSpy.get.mockReturnValue(of('Translated text'));

    tokenServiceSpy.getTokenList.mockReturnValue(of(mockTokens));
    ngbModalSpy.open.mockReturnValue({ result: new Promise(() => {}) });

    await TestBed.configureTestingModule({
      imports: [PersonalAccessTokensComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataPersonalAccessTokenService, useValue: tokenServiceSpy },
        { provide: ToastShowService, useValue: toastServiceSpy },
        { provide: NgbModal, useValue: ngbModalSpy },
        { provide: Clipboard, useValue: clipboardSpy },
        ModalService,
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockTokenService = TestBed.inject(DataPersonalAccessTokenService) as any;
    mockToastService = TestBed.inject(ToastShowService) as any;
    mockNgbModal = TestBed.inject(NgbModal) as any;
    mockClipboard = TestBed.inject(Clipboard) as any;
    mockModalService = TestBed.inject(ModalService);
    mockTranslateService = TestBed.inject(TranslateService) as any;

    fixture = TestBed.createComponent(PersonalAccessTokensComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load tokens on init', () => {
      // Act
      fixture.detectChanges();

      // Assert
      expect(mockTokenService.getTokenList).toHaveBeenCalled();
      expect(component.tokens.length).toBe(2);
      expect(component.tokens).toEqual(mockTokens);
    });

    it('should handle token loading error', () => {
      // Arrange
      mockTokenService.getTokenList.mockReturnValue(throwError(() => new Error('Load error')));

      // Act
      fixture.detectChanges();

      // Assert
      expect(mockToastService.showError).toHaveBeenCalled();
      expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.personal-access-tokens.error.load-tokens');
      expect(component.tokens.length).toBe(0);
      expect(component.isLoading).toBe(false);
    });

    it('should not expose a plaintext token in the loaded list', () => {
      // Act
      fixture.detectChanges();

      // Assert
      component.tokens.forEach((token) => {
        expect((token as any).token).toBeUndefined();
      });
    });
  });

  describe('Add Token', () => {
    it('should reset form and created token before opening the modal', () => {
      // Arrange
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      component.createdToken = mockCreatedToken;

      // Act
      component.onClickAdd();

      // Assert
      expect(component.createdToken).toBeNull();
      expect((component as any).formModel().name).toBe('');
      expect((component as any).formModel().expiresInDays).toBe('365');

      const deferredOpen = setTimeoutSpy.mock.calls.at(-1)?.[0] as () => void;
      setTimeoutSpy.mockRestore();
      expect(deferredOpen).toBeTypeOf('function');

      deferredOpen();
      expect(mockNgbModal.open).toHaveBeenCalled();
    });
  });

  describe('Create Token', () => {
    it('should create a token and keep the plaintext for one-time display', async () => {
      // Arrange
      (component as any).formModel.set({ name: 'New Token', expiresInDays: '365' });
      mockTokenService.createToken.mockReturnValue(of(mockCreatedToken));

      // Act
      await component.onCreateToken();

      // Assert
      expect(mockTokenService.createToken).toHaveBeenCalledWith({
        name: 'New Token',
        expiresInDays: 365,
      });
      expect(component.createdToken).toEqual(mockCreatedToken);
      expect(mockToastService.showSuccess).toHaveBeenCalled();
    });

    it('should omit expiresInDays when the field is empty', async () => {
      // Arrange
      (component as any).formModel.set({ name: 'New Token', expiresInDays: '' });
      mockTokenService.createToken.mockReturnValue(of(mockCreatedToken));

      // Act
      await component.onCreateToken();

      // Assert
      expect(mockTokenService.createToken).toHaveBeenCalledWith({ name: 'New Token' });
    });

    it('should handle create error', async () => {
      // Arrange
      (component as any).formModel.set({ name: 'New Token', expiresInDays: '365' });
      mockTokenService.createToken.mockReturnValue(throwError(() => new Error('Save failed')));

      // Act
      await component.onCreateToken();

      // Assert
      expect(mockToastService.showError).toHaveBeenCalled();
      expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.personal-access-tokens.error.save');
      expect(component.createdToken).toBeNull();
    });

    it('should not create when the form is invalid', async () => {
      // Arrange
      (component as any).formModel.set({ name: '', expiresInDays: '365' });

      // Act
      await component.onCreateToken();

      // Assert
      expect(mockTokenService.createToken).not.toHaveBeenCalled();
    });

    it('should not create twice while a created token is displayed', async () => {
      // Arrange
      (component as any).formModel.set({ name: 'New Token', expiresInDays: '365' });
      component.createdToken = mockCreatedToken;

      // Act
      await component.onCreateToken();

      // Assert
      expect(mockTokenService.createToken).not.toHaveBeenCalled();
    });
  });

  describe('One-Time Token Display', () => {
    it('should clear the plaintext token and reload the list when the modal closes', () => {
      // Arrange
      fixture.detectChanges();
      component.createdToken = mockCreatedToken;
      mockTokenService.getTokenList.mockClear();

      // Act
      (component as any).onModalClosed();

      // Assert
      expect(component.createdToken).toBeNull();
      expect(mockTokenService.getTokenList).toHaveBeenCalled();
    });

    it('should not reload the list when the modal closes without a created token', () => {
      // Arrange
      fixture.detectChanges();
      component.createdToken = null;
      mockTokenService.getTokenList.mockClear();

      // Act
      (component as any).onModalClosed();

      // Assert
      expect(component.createdToken).toBeNull();
      expect(mockTokenService.getTokenList).not.toHaveBeenCalled();
    });

    it('should copy the plaintext token to the clipboard', () => {
      // Arrange
      component.createdToken = mockCreatedToken;

      // Act
      component.onCopyToken();

      // Assert
      expect(mockClipboard.copy).toHaveBeenCalledWith(mockCreatedToken.token);
      expect(mockToastService.showSuccess).toHaveBeenCalled();
    });

    it('should not copy when no created token is present', () => {
      // Arrange
      component.createdToken = null;

      // Act
      component.onCopyToken();

      // Assert
      expect(mockClipboard.copy).not.toHaveBeenCalled();
    });
  });

  describe('Revoke Token', () => {
    beforeEach(() => {
      component.tokens = [...mockTokens];
      fixture.detectChanges();
    });

    it('should open revoke confirmation with correct context', () => {
      // Arrange
      const tokenToRevoke = mockTokens[0];

      // Act
      component.openRevokeToken(tokenToRevoke);

      // Assert
      expect(mockModalService.componentContext).toBe('personal-access-tokens');
      expect(mockModalService.Filing).toBe(tokenToRevoke.id);
      expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.personal-access-tokens.confirm-revoke');
    });

    it('should not open revoke confirmation if token has no id', () => {
      // Arrange
      const tokenWithoutId: IPersonalAccessToken = {
        id: '',
        name: 'Test',
        tokenPrefix: 'pat_x',
      };

      // Act
      component.openRevokeToken(tokenWithoutId);

      // Assert
      expect(mockModalService.Filing).toBe('');
    });

    it('should revoke the token and reload the list when the modal confirms', async () => {
      // Arrange
      const tokenToRevoke = mockTokens[0];
      mockTokenService.revokeToken.mockReturnValue(of({}));
      mockTokenService.getTokenList.mockClear();

      // Act
      component.openRevokeToken(tokenToRevoke);
      mockModalService.result(ModalType.Delete);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockTokenService.revokeToken).toHaveBeenCalledWith(tokenToRevoke.id);
      expect(mockTokenService.getTokenList).toHaveBeenCalled();
      expect(mockToastService.showSuccess).toHaveBeenCalled();
    });

    it('should handle revoke error', async () => {
      // Arrange
      const tokenToRevoke = mockTokens[0];
      mockTokenService.revokeToken.mockReturnValue(throwError(() => new Error('Delete failed')));

      // Act
      component.openRevokeToken(tokenToRevoke);
      mockModalService.result(ModalType.Delete);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockToastService.showError).toHaveBeenCalled();
      expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.personal-access-tokens.error.delete');
    });
  });

  describe('Form Validation', () => {
    it('should validate a complete form', () => {
      // Arrange
      (component as any).formModel.set({ name: 'Token', expiresInDays: '365' });

      // Act & Assert
      expect(component.isFormValid()).toBe(true);
    });

    it('should fail validation if name is missing', () => {
      // Arrange
      (component as any).formModel.set({ name: '', expiresInDays: '365' });

      // Act & Assert
      expect(component.isFormValid()).toBe(false);
    });

    it('should allow an empty expiry (server default applies)', () => {
      // Arrange
      (component as any).formModel.set({ name: 'Token', expiresInDays: '' });

      // Act & Assert
      expect(component.isFormValid()).toBe(true);
    });

    it('should fail validation if expiry is below the minimum', () => {
      // Arrange
      (component as any).formModel.set({ name: 'Token', expiresInDays: '0' });

      // Act & Assert
      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if expiry exceeds the maximum', () => {
      // Arrange
      (component as any).formModel.set({ name: 'Token', expiresInDays: '731' });

      // Act & Assert
      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if expiry is not a number', () => {
      // Arrange
      (component as any).formModel.set({ name: 'Token', expiresInDays: 'abc' });

      // Act & Assert
      expect(component.isFormValid()).toBe(false);
    });

    it('should return validation error messages', () => {
      // Arrange
      (component as any).formModel.set({ name: '', expiresInDays: '9999' });

      // Act
      const errors = component.getValidationErrors();

      // Assert
      expect(errors.length).toBe(2);
      expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.personal-access-tokens.validation.name-required');
      expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.personal-access-tokens.validation.expiry-range');
    });
  });
});
