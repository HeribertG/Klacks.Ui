/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';

import { GroupScopeComponent } from './group-scope.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { DataManagementGroupVisibilityService } from 'src/app/domain/services/group/data-management-group-visibility.service';

describe('GroupScopeComponent', () => {
  let component: GroupScopeComponent;
  let fixture: ComponentFixture<GroupScopeComponent>;
  let mockSettingsService: jasmine.SpyObj<DataManagementSettingsService>;
  let mockGroupService: jasmine.SpyObj<DataManagementGroupService>;
  let mockGroupVisibilityService: jasmine.SpyObj<DataManagementGroupVisibilityService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  const mockGroups = [
    {
      id: '1',
      name: 'Group 1',
      parentId: null,
      isVisible: true,
    },
    {
      id: '2',
      name: 'Group 2',
      parentId: '1',
      isVisible: false,
    },
  ];

  beforeEach(async () => {
    const settingsServiceSpy = jasmine.createSpyObj(
      'DataManagementSettingsService',
      ['loadSettings']
    );

    const groupServiceSpy = jasmine.createSpyObj('DataManagementGroupService', [
      'loadGroups',
    ]);

    const groupVisibilityServiceSpy = jasmine.createSpyObj(
      'DataManagementGroupVisibilityService',
      ['loadVisibility', 'updateVisibility'],
      {
        rootList: signal(mockGroups),
      }
    );

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

    await TestBed.configureTestingModule({
      imports: [GroupScopeComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementSettingsService,
          useValue: settingsServiceSpy,
        },
        { provide: DataManagementGroupService, useValue: groupServiceSpy },
        {
          provide: DataManagementGroupVisibilityService,
          useValue: groupVisibilityServiceSpy,
        },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockSettingsService = TestBed.inject(
      DataManagementSettingsService
    ) as jasmine.SpyObj<DataManagementSettingsService>;
    mockGroupService = TestBed.inject(
      DataManagementGroupService
    ) as jasmine.SpyObj<DataManagementGroupService>;
    mockGroupVisibilityService = TestBed.inject(
      DataManagementGroupVisibilityService
    ) as jasmine.SpyObj<DataManagementGroupVisibilityService>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(GroupScopeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Group Visibility', () => {
    it('should have access to root list from visibility service', () => {
      // Arrange
      fixture.detectChanges();

      // Act
      const rootList = component.rootList();

      // Assert
      expect(rootList).toBeDefined();
      expect(rootList.length).toBe(2);
    });
  });
});
