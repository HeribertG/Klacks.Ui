// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementGroupService } from './data-management-group.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { GroupSelectionService } from './group-selection.service';
import { Group } from 'src/app/domain/models/group/group-class';
import { HttpClient } from '@angular/common/http';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { DataManagementCalendarSelectionService } from '../calendar/data-management-calendar-selection.service';

describe('DataManagementGroupService', () => {
    let service: DataManagementGroupService;
    let dataGroupServiceSpy: any;
    let groupSelectionServiceSpy: any;

    beforeEach(() => {
        const dataGroupSpy = {
            getAll: vi.fn()
        };
        const selectionSpy = {
            selectNode: vi.fn()
        };
        const httpClientSpy = {
            get: vi.fn(),
            post: vi.fn()
        };
        const eventBusSpy = {
            emit: vi.fn()
        };
        const registrySpy = {
            register: vi.fn()
        };
        const translateSpy = {
            instant: vi.fn().mockReturnValue('')
        };
        const calendarSelectionSpy = {
            isRead: vi.fn().mockReturnValue(false),
            readData: vi.fn(),
            calendarsSelections: [],
            chips: []
        };

        TestBed.configureTestingModule({
            providers: [
                DataManagementGroupService,
                { provide: DataGroupService, useValue: dataGroupSpy },
                { provide: GroupSelectionService, useValue: selectionSpy },
                { provide: HttpClient, useValue: httpClientSpy },
                { provide: EVENT_BUS_TOKEN, useValue: eventBusSpy },
                { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: registrySpy },
                { provide: TranslateService, useValue: translateSpy },
                { provide: DataManagementCalendarSelectionService, useValue: calendarSelectionSpy },
            ],
        });

        service = TestBed.inject(DataManagementGroupService);
        dataGroupServiceSpy = TestBed.inject(DataGroupService) as any;
        groupSelectionServiceSpy = TestBed.inject(GroupSelectionService) as any;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('hasGroups', () => {
        it('should return true when flatNodeList has items', () => {
            // Arrange
            const mockGroup = new Group();
            mockGroup.id = 'test-id';
            mockGroup.name = 'Test Group';
            service.flatNodeList = [mockGroup];

            // Act
            const result = service.hasGroups();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when flatNodeList is empty', () => {
            // Arrange
            service.flatNodeList = [];

            // Act
            const result = service.hasGroups();

            // Assert
            expect(result).toBe(false);
        });

        it('should return false when flatNodeList is undefined', () => {
            // Arrange
            service.flatNodeList = undefined as any;

            // Act
            const result = service.hasGroups();

            // Assert
            expect(result).toBe(false);
        });

        it('should return true when flatNodeList has multiple items', () => {
            // Arrange
            const mockGroup1 = new Group();
            mockGroup1.id = 'test-id-1';
            mockGroup1.name = 'Test Group 1';

            const mockGroup2 = new Group();
            mockGroup2.id = 'test-id-2';
            mockGroup2.name = 'Test Group 2';

            service.flatNodeList = [mockGroup1, mockGroup2];

            // Act
            const result = service.hasGroups();

            // Assert
            expect(result).toBe(true);
            expect(service.flatNodeList.length).toBe(2);
        });
    });
});
