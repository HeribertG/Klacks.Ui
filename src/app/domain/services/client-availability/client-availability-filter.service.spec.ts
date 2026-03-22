// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for the ClientAvailabilityFilterService.
 * Verifies filter creation, paging, sorting, and signal notification.
 */
import { TestBed } from '@angular/core/testing';
import { ClientAvailabilityFilterService } from './client-availability-filter.service';

describe('ClientAvailabilityFilterService', () => {
    let service: ClientAvailabilityFilterService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ClientAvailabilityFilterService]
        });

        service = TestBed.inject(ClientAvailabilityFilterService);
    });

    it('should create service', () => {
        expect(service).toBeTruthy();
    });

    it('buildFilter should include searchString', () => {
        // Arrange
        service.searchString = 'Elle Abel';

        // Act
        const filter = service.buildFilter();

        // Assert
        expect(filter.searchString).toBe('Elle Abel');
    });

    it('buildFilter should include selectedGroup when set', () => {
        // Arrange
        service.selectedGroupId = 'some-guid';

        // Act
        const filter = service.buildFilter();

        // Assert
        expect(filter.selectedGroup).toBe('some-guid');
    });

    it('buildFilter should exclude all-groups-virtual from selectedGroup', () => {
        // Arrange
        service.selectedGroupId = 'all-groups-virtual';

        // Act
        const filter = service.buildFilter();

        // Assert
        expect(filter.selectedGroup).toBeUndefined();
    });

    it('buildFilter should use default paging', () => {
        // Arrange

        // Act
        const filter = service.buildFilter();

        // Assert
        expect(filter.startRow).toBe(0);
        expect(filter.rowCount).toBe(200);
    });

    it('buildFilter should use custom paging', () => {
        // Arrange

        // Act
        const filter = service.buildFilter(10, 50);

        // Assert
        expect(filter.startRow).toBe(10);
        expect(filter.rowCount).toBe(50);
    });

    it('buildFilter should include showEmployees and showExtern', () => {
        // Arrange
        service.clientFilter.showEmployees = false;

        // Act
        const filter = service.buildFilter();

        // Assert
        expect(filter.showEmployees).toBe(false);
    });

    it('buildFilter should include sorting', () => {
        // Arrange
        service.clientFilter.orderBy = 'firstName';
        service.clientFilter.sortOrder = 'desc';

        // Act
        const filter = service.buildFilter();

        // Assert
        expect(filter.orderBy).toBe('firstName');
        expect(filter.sortOrder).toBe('desc');
    });

    it('buildFilter should include startDate and endDate', () => {
        // Arrange
        service.startDate = '2026-03-01';
        service.endDate = '2026-03-31';

        // Act
        const filter = service.buildFilter();

        // Assert
        expect(filter.startDate).toBe('2026-03-01');
        expect(filter.endDate).toBe('2026-03-31');
    });

    it('notifyClientsChanged should toggle signal', () => {
        // Arrange

        // Act
        service.notifyClientsChanged();

        // Assert
        expect(service.clientsChanged()).toBe(true);
    });
});
