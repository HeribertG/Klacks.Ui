import type { MockedObject } from "vitest";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { TestBed } from '@angular/core/testing';
import { SearchStrategyService } from './search-strategy.service';
import { WorkplaceStateService } from '../../application/services/workplace-state.service';
import { ClientSearchStrategy } from './strategies/client-search.strategy';
import { GroupSearchStrategy } from './strategies/group-search.strategy';
import { AbsenceSearchStrategy } from './strategies/absence-search.strategy';
import { ShiftSearchStrategy } from './strategies/shift-search.strategy';
import { ScheduleSearchStrategy } from './strategies/schedule-search.strategy';
import { EntityName } from 'src/app/domain/models/entity-names.enum';

describe('SearchStrategyService', () => {
    let service: SearchStrategyService;
    let mockWorkplaceStateService: any;
    let mockClientStrategy: any;
    let mockGroupStrategy: any;
    let mockAbsenceStrategy: any;
    let mockScheduleStrategy: any;
    let mockShiftStrategy: any;

    beforeEach(() => {
        const workplaceSpy = {
            nameOfVisibleEntity: vi.fn()
        };
        const clientSpy = {
            search: vi.fn(),
            resetFilter: vi.fn(),
            getEntityName: vi.fn()
        };
        const groupSpy = {
            search: vi.fn(),
            resetFilter: vi.fn(),
            getEntityName: vi.fn()
        };
        const absenceSpy = {
            search: vi.fn(),
            resetFilter: vi.fn(),
            getEntityName: vi.fn()
        };
        const scheduleSpy = {
            search: vi.fn(),
            resetFilter: vi.fn(),
            getEntityName: vi.fn()
        };
        const shiftSpy = {
            search: vi.fn(),
            resetFilter: vi.fn(),
            getEntityName: vi.fn()
        };

        clientSpy.getEntityName.mockReturnValue(EntityName.CLIENT);
        groupSpy.getEntityName.mockReturnValue(EntityName.GROUP);
        absenceSpy.getEntityName.mockReturnValue(EntityName.ABSENCE);
        scheduleSpy.getEntityName.mockReturnValue(EntityName.SCHEDULE);
        shiftSpy.getEntityName.mockReturnValue(EntityName.SHIFT);

        TestBed.configureTestingModule({
            providers: [
                { provide: WorkplaceStateService, useValue: workplaceSpy },
                { provide: ClientSearchStrategy, useValue: clientSpy },
                { provide: GroupSearchStrategy, useValue: groupSpy },
                { provide: AbsenceSearchStrategy, useValue: absenceSpy },
                { provide: ScheduleSearchStrategy, useValue: scheduleSpy },
                { provide: ShiftSearchStrategy, useValue: shiftSpy },
                SearchStrategyService,
            ],
        });

        service = TestBed.inject(SearchStrategyService);
        mockWorkplaceStateService = TestBed.inject(WorkplaceStateService) as any;
        mockClientStrategy = TestBed.inject(ClientSearchStrategy) as any;
        mockGroupStrategy = TestBed.inject(GroupSearchStrategy) as any;
        mockAbsenceStrategy = TestBed.inject(AbsenceSearchStrategy) as any;
        mockScheduleStrategy = TestBed.inject(ScheduleSearchStrategy) as any;
        mockShiftStrategy = TestBed.inject(ShiftSearchStrategy) as any;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call client strategy for CLIENT entity', () => {
        mockWorkplaceStateService.nameOfVisibleEntity.mockReturnValue(EntityName.CLIENT);

        service.globalSearch('test', true, false);

        expect(mockClientStrategy.search).toHaveBeenCalledWith('test', {
            includeAddress: true,
            includeClient: false,
        });
        expect(service.restoreSearch()).toBe('test');
    });

    it('should call group strategy for GROUP entity', () => {
        mockWorkplaceStateService.nameOfVisibleEntity.mockReturnValue(EntityName.GROUP);

        service.globalSearch('test');

        expect(mockGroupStrategy.search).toHaveBeenCalledWith('test', {
            includeAddress: false,
            includeClient: false,
        });
    });

    it('should reset filter for current entity', () => {
        mockWorkplaceStateService.nameOfVisibleEntity.mockReturnValue(EntityName.CLIENT);

        service.resetFilter();

        expect(mockClientStrategy.resetFilter).toHaveBeenCalled();
        expect(service.restoreSearch()).toBe('');
    });

    it('should handle unknown entity gracefully', () => {
        mockWorkplaceStateService.nameOfVisibleEntity.mockReturnValue('UNKNOWN' as EntityName);
        vi.spyOn(console, 'warn');

        service.globalSearch('test');

        expect(console.warn).toHaveBeenCalledWith('No search strategy found for entity: UNKNOWN');
    });

    it('should allow adding and removing strategies', () => {
        const newStrategy = {
            search: vi.fn(),
            resetFilter: vi.fn(),
            getEntityName: vi.fn()
        };
        newStrategy.getEntityName.mockReturnValue('NEW' as EntityName);

        service.addStrategy('NEW' as EntityName, newStrategy);
        mockWorkplaceStateService.nameOfVisibleEntity.mockReturnValue('NEW' as EntityName);

        service.globalSearch('test');
        expect(newStrategy.search).toHaveBeenCalled();

        const removed = service.removeStrategy('NEW' as EntityName);
        expect(removed).toBe(true);
    });
});
