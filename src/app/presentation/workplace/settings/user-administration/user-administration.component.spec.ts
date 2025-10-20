/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';

import { UserAdministrationComponent } from './user-administration.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { UserAdministrationManagementService } from 'src/app/domain/services/settings/user-administration-management.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { Authentication, IAuthentication } from 'src/app/domain/models/authentification-class';

describe('UserAdministrationComponent', () => {
  let component: UserAdministrationComponent;
  let fixture: ComponentFixture<UserAdministrationComponent>;
  let mockSettingsService: jasmine.SpyObj<DataManagementSettingsService>;
  let mockUserAdminService: jasmine.SpyObj<UserAdministrationManagementService>;
  let mockModalService: any;
  let mockNgbModal: jasmine.SpyObj<NgbModal>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  const mockUsers: IAuthentication[] = [
    {
      id: '1',
      userName: 'admin.user',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: undefined,
      sendEmail: true,
      isAdmin: true,
      isAuthorised: true,
      message: undefined,
      title: undefined,
      appName: undefined,
      mailSuccess: false,
      modelState: undefined,
    },
    {
      id: '2',
      userName: 'john.doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: undefined,
      sendEmail: true,
      isAdmin: false,
      isAuthorised: true,
      message: undefined,
      title: undefined,
      appName: undefined,
      mailSuccess: false,
      modelState: undefined,
    },
    {
      id: '3',
      userName: 'jane.smith',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      password: undefined,
      sendEmail: true,
      isAdmin: false,
      isAuthorised: false,
      message: undefined,
      title: undefined,
      appName: undefined,
      mailSuccess: false,
      modelState: undefined,
    },
  ];

  beforeEach(async () => {
    const settingsServiceSpy = jasmine.createSpyObj(
      'DataManagementSettingsService',
      ['loadSettings'],
      {
        appName: 'Klacks Test',
      }
    );

    const userAdminServiceSpy = jasmine.createSpyObj(
      'UserAdministrationManagementService',
      [
        'loadAccounts',
        'addAccount',
        'deleteAccount',
        'updateAccountRole',
        'requestPasswordReset',
      ],
      {
        accountsList: signal([...mockUsers]),
        currentAccountId: signal('current-user-id'),
      }
    );

    const modalServiceSpy = {
      openModel: jasmine.createSpy('openModel'),
      resultEvent: new Subject<ModalType>(),
      Filing: '',
      componentContext: '',
      deleteMessageTitle: '',
      deleteMessage: '',
      deleteMessageOkButton: '',
    };

    const ngbModalSpy = jasmine.createSpyObj('NgbModal', ['open']);

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

    await TestBed.configureTestingModule({
      imports: [UserAdministrationComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementSettingsService,
          useValue: settingsServiceSpy,
        },
        {
          provide: UserAdministrationManagementService,
          useValue: userAdminServiceSpy,
        },
        { provide: ModalService, useValue: modalServiceSpy },
        { provide: NgbModal, useValue: ngbModalSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockSettingsService = TestBed.inject(
      DataManagementSettingsService
    ) as jasmine.SpyObj<DataManagementSettingsService>;
    mockUserAdminService = TestBed.inject(
      UserAdministrationManagementService
    ) as jasmine.SpyObj<UserAdministrationManagementService>;
    mockModalService = TestBed.inject(ModalService);
    mockNgbModal = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(UserAdministrationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('User Creation Modal', () => {
    let mockModalRef: any;

    beforeEach(() => {
      mockModalRef = {
        result: Promise.resolve(),
        close: jasmine.createSpy('close'),
        dismiss: jasmine.createSpy('dismiss'),
      };
      (component as any).ngbModal = mockNgbModal;
      mockNgbModal.open.and.returnValue(mockModalRef);
    });

    it('should initialize new user with default values when opening modal', () => {
      // Arrange
      const mockContent = {};

      // Act
      component.open(mockContent);

      // Assert
      expect(component.newUser).toBeTruthy();
      expect(component.newUser?.firstName).toBeUndefined();
      expect(component.newUser?.lastName).toBeUndefined();
      expect(component.newUser?.userName).toBeUndefined();
      expect(component.newUser?.email).toBeUndefined();
      expect(component.newUser?.sendEmail).toBe(true);
      expect(component.newUser?.appName).toBe('Klacks Test');
      expect(component.disabled).toBe(true);
      expect(mockNgbModal.open).toHaveBeenCalledWith(mockContent, {
        size: 'md',
        centered: true,
      });
    });

    it('should add new user with valid data when modal is confirmed', async () => {
      // Arrange
      const mockContent = {};
      component.open(mockContent);

      component.newUser!.firstName = 'Max';
      component.newUser!.lastName = 'Mustermann';
      component.newUser!.userName = 'max.mustermann';
      component.newUser!.email = 'max.mustermann@example.com';

      // Act
      await mockModalRef.result;

      // Assert
      expect(component.newUser?.password).toBeTruthy();
      expect(mockUserAdminService.addAccount).toHaveBeenCalledWith(
        jasmine.objectContaining({
          firstName: 'Max',
          lastName: 'Mustermann',
        })
      );
    });

    it('should not add user when modal is dismissed', async () => {
      // Arrange
      mockModalRef.result = Promise.reject();
      const mockContent = {};

      // Act
      component.open(mockContent);

      try {
        await mockModalRef.result;
      } catch {
        // Expected rejection
      }

      // Assert
      expect(mockUserAdminService.addAccount).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      component.newUser = new Authentication();
    });

    it('should enable save button with valid user data', () => {
      // Arrange
      component.newUser!.firstName = 'John';
      component.newUser!.lastName = 'Doe';
      component.newUser!.userName = 'john.doe';
      component.newUser!.email = 'john.doe@example.com';

      // Act
      component.onChange();

      // Assert
      expect(component.disabled).toBe(false);
    });

    it('should disable save button when firstName is too short', () => {
      // Arrange
      component.newUser!.firstName = 'J';
      component.newUser!.lastName = 'Doe';
      component.newUser!.userName = 'john.doe';
      component.newUser!.email = 'john.doe@example.com';

      // Act
      component.onChange();

      // Assert
      expect(component.disabled).toBe(true);
    });

    it('should disable save button when lastName is missing', () => {
      // Arrange
      component.newUser!.firstName = 'John';
      component.newUser!.lastName = '';
      component.newUser!.userName = 'john.doe';
      component.newUser!.email = 'john.doe@example.com';

      // Act
      component.onChange();

      // Assert
      expect(component.disabled).toBe(true);
    });

    it('should disable save button when userName is too short', () => {
      // Arrange
      component.newUser!.firstName = 'John';
      component.newUser!.lastName = 'Doe';
      component.newUser!.userName = 'jo';
      component.newUser!.email = 'john.doe@example.com';

      // Act
      component.onChange();

      // Assert
      expect(component.disabled).toBe(true);
    });

    it('should disable save button when email is invalid', () => {
      // Arrange
      component.newUser!.firstName = 'John';
      component.newUser!.lastName = 'Doe';
      component.newUser!.userName = 'john.doe';
      component.newUser!.email = 'invalid-email';

      // Act
      component.onChange();

      // Assert
      expect(component.disabled).toBe(true);
    });

    it('should disable save button when email is too short', () => {
      // Arrange
      component.newUser!.firstName = 'John';
      component.newUser!.lastName = 'Doe';
      component.newUser!.userName = 'john.doe';
      component.newUser!.email = 'a@b';

      // Act
      component.onChange();

      // Assert
      expect(component.disabled).toBe(true);
    });

    it('should handle undefined newUser gracefully', () => {
      // Arrange
      component.newUser = undefined;

      // Act & Assert
      expect(() => component.onChange()).not.toThrow();
      expect(component.disabled).toBe(true);
    });
  });

  describe('Role Management', () => {
    it('should update user role to Admin', () => {
      // Arrange
      const user = mockUsers[1];

      // Act
      component.onRoleChange(user, 'Admin', true);

      // Assert
      expect(mockUserAdminService.updateAccountRole).toHaveBeenCalledWith(
        user,
        'Admin',
        true
      );
    });

    it('should remove Admin role from user', () => {
      // Arrange
      const user = mockUsers[0];

      // Act
      component.onRoleChange(user, 'Admin', false);

      // Assert
      expect(mockUserAdminService.updateAccountRole).toHaveBeenCalledWith(
        user,
        'Admin',
        false
      );
    });

    it('should update user role to Authorised', () => {
      // Arrange
      const user = mockUsers[2];

      // Act
      component.onRoleChange(user, 'Authorised', true);

      // Assert
      expect(mockUserAdminService.updateAccountRole).toHaveBeenCalledWith(
        user,
        'Authorised',
        true
      );
    });
  });

  describe('User Deletion', () => {
    it('should prepare delete modal with user information', () => {
      // Arrange
      const userIndex = 0;
      const user = mockUsers[userIndex];

      // Act
      component.onDelete(userIndex);

      // Assert
      expect(component.pendingDeleteIndex).toBe(userIndex);
      expect(mockModalService.componentContext).toBe('user-administration');
      expect(mockModalService.Filing).toBe(user.id!.toString());
      expect(mockTranslateService.instant).toHaveBeenCalledWith('DELETE_USER_TITLE');
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'DELETE_USER_CONFIRMATION',
        { userName: 'Admin User' }
      );
      expect(mockModalService.openModel).toHaveBeenCalledWith(ModalType.Delete);
    });

    it('should use email as fallback if name is not available', () => {
      // Arrange
      const userWithoutName: IAuthentication = {
        ...mockUsers[0],
        firstName: '',
        lastName: '',
      };
      mockUserAdminService.accountsList.set([userWithoutName]);

      // Act
      component.onDelete(0);

      // Assert
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'DELETE_USER_CONFIRMATION',
        { userName: userWithoutName.email }
      );
    });

    it('should not open delete modal if user has no ID', () => {
      // Arrange
      const userWithoutId: IAuthentication = { ...mockUsers[0], id: undefined };
      mockUserAdminService.accountsList.set([userWithoutId]);

      // Act
      component.onDelete(0);

      // Assert
      expect(mockModalService.openModel).not.toHaveBeenCalled();
    });

    it('should delete user after modal confirmation', () => {
      // Arrange
      component.pendingDeleteIndex = 0;
      mockModalService.componentContext = 'user-administration';
      mockModalService.Filing = mockUsers[0].id!;
      fixture.detectChanges();

      // Act
      (mockModalService.resultEvent as Subject<ModalType>).next(ModalType.Delete);

      // Assert
      expect(mockUserAdminService.deleteAccount).toHaveBeenCalledWith('1');
      expect(component.pendingDeleteIndex).toBe(-1);
      expect(mockModalService.componentContext).toBe('');
      expect(mockModalService.Filing).toBe('');
    });

    it('should not delete user if context does not match', () => {
      // Arrange
      component.pendingDeleteIndex = 0;
      mockModalService.componentContext = 'other-component';
      fixture.detectChanges();

      // Act
      (mockModalService.resultEvent as Subject<ModalType>).next(ModalType.Delete);

      // Assert
      expect(mockUserAdminService.deleteAccount).not.toHaveBeenCalled();
    });

    it('should not delete user if modal type is not Delete', () => {
      // Arrange
      component.pendingDeleteIndex = 0;
      mockModalService.componentContext = 'user-administration';
      fixture.detectChanges();

      // Act
      (mockModalService.resultEvent as Subject<ModalType>).next(ModalType.Input);

      // Assert
      expect(mockUserAdminService.deleteAccount).not.toHaveBeenCalled();
    });
  });

  describe('Password Reset', () => {
    let mockPasswordResetModalRef: any;

    beforeEach(() => {
      mockPasswordResetModalRef = {
        result: Promise.resolve(),
        close: jasmine.createSpy('close'),
        dismiss: jasmine.createSpy('dismiss'),
      };
      (component as any).ngbModal = mockNgbModal;
      mockNgbModal.open.and.returnValue(mockPasswordResetModalRef);
    });

    it('should open password reset modal with email', () => {
      // Arrange
      const email = 'test@example.com';
      component.msgTemplate = {} as any;

      // Act
      component.onSentTo(email);

      // Assert
      expect(component.newUser).toBeTruthy();
      expect(component.newUser?.email).toBe(email);
      expect(mockNgbModal.open).toHaveBeenCalledWith(component.msgTemplate, {
        size: 'sm',
        centered: true,
      });
    });

    it('should request password reset when modal is confirmed', async () => {
      // Arrange
      const email = 'test@example.com';
      component.msgTemplate = {} as any;
      component.onSentTo(email);

      // Act
      await mockPasswordResetModalRef.result;

      // Assert
      expect(mockUserAdminService.requestPasswordReset).toHaveBeenCalledWith(email);
    });

    it('should not request password reset when modal is dismissed', async () => {
      // Arrange
      mockPasswordResetModalRef.result = Promise.reject();
      const email = 'test@example.com';
      component.msgTemplate = {} as any;

      // Act
      component.onSentTo(email);

      try {
        await mockPasswordResetModalRef.result;
      } catch {
        // Expected rejection
      }

      // Assert
      expect(mockUserAdminService.requestPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe on destroy', () => {
      // Arrange
      const ngUnsubscribeSpy = spyOn(
        component['ngUnsubscribe'],
        'next'
      );
      const completeSpy = spyOn(
        component['ngUnsubscribe'],
        'complete'
      );

      // Act
      component.ngOnDestroy();

      // Assert
      expect(ngUnsubscribeSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
