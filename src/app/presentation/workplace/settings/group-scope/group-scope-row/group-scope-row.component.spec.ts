// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { GroupScopeRowComponent } from './group-scope-row.component';
import { DataManagementGroupVisibilityService } from 'src/app/domain/services/group/data-management-group-visibility.service';
import { IAuthentication } from 'src/app/domain/models/authentification-class';
import { IGroup } from 'src/app/domain/models/group/group-class';

describe('GroupScopeRowComponent', () => {
  let component: GroupScopeRowComponent;
  let fixture: ComponentFixture<GroupScopeRowComponent>;
  let mockGroupVisibilityService: ReturnType<typeof createMockGroupVisibilityService>;
  let mockModalService: { open: ReturnType<typeof vi.fn> };

  const mockGroups: IGroup[] = [
    { id: 'group-1', name: 'Group 1', description: 'First group' } as IGroup,
    { id: 'group-2', name: 'Group 2', description: 'Second group' } as IGroup,
    { id: 'group-3', name: 'Group 3', description: '' } as IGroup,
  ];

  const mockUser: IAuthentication = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    isAdmin: false,
  } as IAuthentication;

  const mockAdminUser: IAuthentication = {
    id: 'admin-1',
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
  } as IAuthentication;

  function createMockGroupVisibilityService() {
    const groupVisibilityList = signal([
      { appUserId: 'user-1', groupId: 'group-1' },
      { appUserId: 'user-1', groupId: 'group-2' },
      { appUserId: 'other-user', groupId: 'group-3' },
    ]);

    return {
      rootList: signal(mockGroups),
      groupVisibilityList,
      saveGroupVisibilities: vi.fn().mockReturnValue(of({})),
    };
  }

  beforeEach(async () => {
    mockGroupVisibilityService = createMockGroupVisibilityService();

    mockModalService = {
      open: vi.fn(),
    };

    const translateServiceSpy = {
      instant: vi.fn().mockReturnValue('Translated text'),
      get: vi.fn().mockReturnValue(of('Translated text')),
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
    };

    await TestBed.configureTestingModule({
      imports: [GroupScopeRowComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementGroupVisibilityService,
          useValue: mockGroupVisibilityService,
        },
        { provide: NgbModal, useValue: mockModalService },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupScopeRowComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('userName computed', () => {
    it('should return empty string when no user', () => {
      // Arrange
      fixture.componentRef.setInput('user', undefined);

      // Act & Assert (no detectChanges - template requires user)
      expect(component.userName()).toBe('');
    });

    it('should return full name when user is set', () => {
      // Arrange
      fixture.componentRef.setInput('user', mockUser);

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.userName()).toBe('John Doe');
    });

    it('should handle missing firstName', () => {
      // Arrange
      fixture.componentRef.setInput('user', { ...mockUser, firstName: '' });

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.userName()).toBe('Doe');
    });

    it('should handle missing lastName', () => {
      // Arrange
      fixture.componentRef.setInput('user', { ...mockUser, lastName: '' });

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.userName()).toBe('John');
    });
  });

  describe('assignedGroupsCount computed', () => {
    it('should return 0 when no user', () => {
      // Arrange
      fixture.componentRef.setInput('user', undefined);

      // Act & Assert (no detectChanges - template requires user)
      expect(component.assignedGroupsCount()).toBe(0);
    });

    it('should return count of assigned groups for regular user', () => {
      // Arrange
      fixture.componentRef.setInput('user', mockUser);

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.assignedGroupsCount()).toBe(2);
    });

    it('should return all groups count for admin user', () => {
      // Arrange
      fixture.componentRef.setInput('user', mockAdminUser);

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.assignedGroupsCount()).toBe(3);
    });
  });

  describe('selectedGroups signal', () => {
    it('should initialize with empty array', () => {
      // Assert
      expect(component.selectedGroups()).toEqual([]);
    });

    it('should update when set', () => {
      // Act
      component.selectedGroups.set(['group-1', 'group-2']);

      // Assert
      expect(component.selectedGroups()).toEqual(['group-1', 'group-2']);
    });
  });

  describe('isGroupSelected', () => {
    it('should return true when group is selected', () => {
      // Arrange
      component.selectedGroups.set(['group-1', 'group-2']);

      // Act & Assert
      expect(component.isGroupSelected('group-1')).toBe(true);
      expect(component.isGroupSelected('group-2')).toBe(true);
    });

    it('should return false when group is not selected', () => {
      // Arrange
      component.selectedGroups.set(['group-1']);

      // Act & Assert
      expect(component.isGroupSelected('group-2')).toBe(false);
      expect(component.isGroupSelected('group-3')).toBe(false);
    });
  });

  describe('onCheckboxChange', () => {
    it('should add group when checkbox is checked', () => {
      // Arrange
      component.selectedGroups.set(['group-1']);
      const event = { target: { checked: true } } as unknown as Event;

      // Act
      component.onCheckboxChange(event, 'group-2');

      // Assert
      expect(component.selectedGroups()).toContain('group-1');
      expect(component.selectedGroups()).toContain('group-2');
    });

    it('should not add duplicate group', () => {
      // Arrange
      component.selectedGroups.set(['group-1']);
      const event = { target: { checked: true } } as unknown as Event;

      // Act
      component.onCheckboxChange(event, 'group-1');

      // Assert
      expect(component.selectedGroups().filter(g => g === 'group-1').length).toBe(1);
    });

    it('should remove group when checkbox is unchecked', () => {
      // Arrange
      component.selectedGroups.set(['group-1', 'group-2']);
      const event = { target: { checked: false } } as unknown as Event;

      // Act
      component.onCheckboxChange(event, 'group-1');

      // Assert
      expect(component.selectedGroups()).not.toContain('group-1');
      expect(component.selectedGroups()).toContain('group-2');
    });
  });

  describe('open', () => {
    it('should not call modalService.open when user has no id', () => {
      // Arrange
      fixture.componentRef.setInput('user', { ...mockUser, id: undefined });
      fixture.detectChanges();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      component.open({});

      // Assert
      expect(mockModalService.open).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('input signal changes', () => {
    it('should update userSignal when user input changes', () => {
      // Arrange & Act
      fixture.componentRef.setInput('user', mockUser);

      // Assert
      expect(component.userName()).toBe('John Doe');
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy$ subject', () => {
      // Arrange
      const nextSpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      // Act
      component.ngOnDestroy();

      // Assert
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
