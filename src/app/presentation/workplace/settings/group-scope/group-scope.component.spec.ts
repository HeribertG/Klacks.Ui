// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
    let _mockSettingsService: any;
    let _mockGroupService: any;
    let _mockGroupVisibilityService: any;
    let _mockTranslateService: any;

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
        const settingsServiceSpy = {
            loadSettings: vi.fn()
        };

        const groupServiceSpy = {
            loadGroups: vi.fn()
        };

        const groupVisibilityServiceSpy = {
            loadVisibility: vi.fn(),
            updateVisibility: vi.fn(),
            rootList: signal(mockGroups)
        };

        const translateServiceSpy = {
            instant: vi.fn()
        };
        translateServiceSpy.instant.mockReturnValue('Translated text');

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

        _mockSettingsService = TestBed.inject(DataManagementSettingsService) as any;
        _mockGroupService = TestBed.inject(DataManagementGroupService) as any;
        _mockGroupVisibilityService = TestBed.inject(DataManagementGroupVisibilityService) as any;
        _mockTranslateService = TestBed.inject(TranslateService) as any;

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
