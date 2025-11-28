/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { TestBed } from '@angular/core/testing';
import { DataManagementGroupService } from './data-management-group.service';
import { DataGroupService } from 'src/app/infrastructure/api/data-group.service';
import { GroupSelectionService } from './group-selection.service';
import { Group } from 'src/app/domain/models/group-class';
import { HttpClient } from '@angular/common/http';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';

describe('DataManagementGroupService', () => {
  let service: DataManagementGroupService;
  let dataGroupServiceSpy: jasmine.SpyObj<DataGroupService>;
  let groupSelectionServiceSpy: jasmine.SpyObj<GroupSelectionService>;

  beforeEach(() => {
    const dataGroupSpy = jasmine.createSpyObj('DataGroupService', ['getAll']);
    const selectionSpy = jasmine.createSpyObj('GroupSelectionService', [
      'selectNode',
    ]);
    const httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    const eventBusSpy = jasmine.createSpyObj('EventBus', ['emit']);
    const registrySpy = jasmine.createSpyObj('ManageableServiceRegistry', [
      'register',
    ]);

    TestBed.configureTestingModule({
      providers: [
        DataManagementGroupService,
        { provide: DataGroupService, useValue: dataGroupSpy },
        { provide: GroupSelectionService, useValue: selectionSpy },
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: EVENT_BUS_TOKEN, useValue: eventBusSpy },
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: registrySpy },
      ],
    });

    service = TestBed.inject(DataManagementGroupService);
    dataGroupServiceSpy = TestBed.inject(
      DataGroupService
    ) as jasmine.SpyObj<DataGroupService>;
    groupSelectionServiceSpy = TestBed.inject(
      GroupSelectionService
    ) as jasmine.SpyObj<GroupSelectionService>;
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
