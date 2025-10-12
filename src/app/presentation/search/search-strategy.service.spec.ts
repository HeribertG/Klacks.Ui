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
  let mockWorkplaceStateService: jasmine.SpyObj<WorkplaceStateService>;
  let mockClientStrategy: jasmine.SpyObj<ClientSearchStrategy>;
  let mockGroupStrategy: jasmine.SpyObj<GroupSearchStrategy>;
  let mockAbsenceStrategy: jasmine.SpyObj<AbsenceSearchStrategy>;
  let mockScheduleStrategy: jasmine.SpyObj<ScheduleSearchStrategy>;
  let mockShiftStrategy: jasmine.SpyObj<ShiftSearchStrategy>;

  beforeEach(() => {
    const workplaceSpy = jasmine.createSpyObj('WorkplaceStateService', [
      'nameOfVisibleEntity',
    ]);
    const clientSpy = jasmine.createSpyObj('ClientSearchStrategy', [
      'search',
      'resetFilter',
      'getEntityName',
    ]);
    const groupSpy = jasmine.createSpyObj('GroupSearchStrategy', [
      'search',
      'resetFilter',
      'getEntityName',
    ]);
    const absenceSpy = jasmine.createSpyObj('AbsenceSearchStrategy', [
      'search',
      'resetFilter',
      'getEntityName',
    ]);
    const scheduleSpy = jasmine.createSpyObj('ScheduleSearchStrategy', [
      'search',
      'resetFilter',
      'getEntityName',
    ]);
    const shiftSpy = jasmine.createSpyObj('ShiftSearchStrategy', [
      'search',
      'resetFilter',
      'getEntityName',
    ]);

    clientSpy.getEntityName.and.returnValue(EntityName.CLIENT);
    groupSpy.getEntityName.and.returnValue(EntityName.GROUP);
    absenceSpy.getEntityName.and.returnValue(EntityName.ABSENCE);
    scheduleSpy.getEntityName.and.returnValue(EntityName.SCHEDULE);
    shiftSpy.getEntityName.and.returnValue(EntityName.SHIFT);

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
    mockWorkplaceStateService = TestBed.inject(
      WorkplaceStateService
    ) as jasmine.SpyObj<WorkplaceStateService>;
    mockClientStrategy = TestBed.inject(
      ClientSearchStrategy
    ) as jasmine.SpyObj<ClientSearchStrategy>;
    mockGroupStrategy = TestBed.inject(
      GroupSearchStrategy
    ) as jasmine.SpyObj<GroupSearchStrategy>;
    mockAbsenceStrategy = TestBed.inject(
      AbsenceSearchStrategy
    ) as jasmine.SpyObj<AbsenceSearchStrategy>;
    mockScheduleStrategy = TestBed.inject(
      ScheduleSearchStrategy
    ) as jasmine.SpyObj<ScheduleSearchStrategy>;
    mockShiftStrategy = TestBed.inject(
      ShiftSearchStrategy
    ) as jasmine.SpyObj<ShiftSearchStrategy>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call client strategy for CLIENT entity', () => {
    mockWorkplaceStateService.nameOfVisibleEntity.and.returnValue(
      EntityName.CLIENT
    );

    service.globalSearch('test', true, false);

    expect(mockClientStrategy.search).toHaveBeenCalledWith('test', {
      includeAddress: true,
      includeClient: false,
    });
    expect(service.restoreSearch()).toBe('test');
  });

  it('should call group strategy for GROUP entity', () => {
    mockWorkplaceStateService.nameOfVisibleEntity.and.returnValue(
      EntityName.GROUP
    );

    service.globalSearch('test');

    expect(mockGroupStrategy.search).toHaveBeenCalledWith('test', {
      includeAddress: false,
      includeClient: false,
    });
  });

  it('should reset filter for current entity', () => {
    mockWorkplaceStateService.nameOfVisibleEntity.and.returnValue(
      EntityName.CLIENT
    );

    service.resetFilter();

    expect(mockClientStrategy.resetFilter).toHaveBeenCalled();
    expect(service.restoreSearch()).toBe('');
  });

  it('should handle unknown entity gracefully', () => {
    mockWorkplaceStateService.nameOfVisibleEntity.and.returnValue(
      'UNKNOWN' as EntityName
    );
    spyOn(console, 'warn');

    service.globalSearch('test');

    expect(console.warn).toHaveBeenCalledWith(
      'No search strategy found for entity: UNKNOWN'
    );
  });

  it('should allow adding and removing strategies', () => {
    const newStrategy = jasmine.createSpyObj('NewStrategy', [
      'search',
      'resetFilter',
      'getEntityName',
    ]);
    newStrategy.getEntityName.and.returnValue('NEW' as EntityName);

    service.addStrategy('NEW' as EntityName, newStrategy);
    mockWorkplaceStateService.nameOfVisibleEntity.and.returnValue(
      'NEW' as EntityName
    );

    service.globalSearch('test');
    expect(newStrategy.search).toHaveBeenCalled();

    const removed = service.removeStrategy('NEW' as EntityName);
    expect(removed).toBe(true);
  });
});
