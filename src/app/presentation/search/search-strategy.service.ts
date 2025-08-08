import { Injectable, inject } from '@angular/core';
import { EntityName } from 'src/app/domain/models/entity-names.enum';
import { WorkplaceStateService } from '../workplace/core/workplace-state.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { IEntitySearchStrategy, EntitySearchOptions } from './strategies/interfaces/entity-search-strategy.interface';
import { ClientSearchStrategy } from './strategies/client-search.strategy';
import { GroupSearchStrategy } from './strategies/group-search.strategy';
import { AbsenceSearchStrategy } from './strategies/absence-search.strategy';
import { ScheduleSearchStrategy } from './strategies/schedule-search.strategy';
import { ShiftSearchStrategy } from './strategies/shift-search.strategy';

@Injectable({
  providedIn: 'root',
})
export class SearchStrategyService {
  private workplaceStateService = inject(WorkplaceStateService);
  private searchStateService = inject(SearchStateService);
  private strategies = new Map<EntityName, IEntitySearchStrategy>();

  constructor(
    clientStrategy: ClientSearchStrategy,
    groupStrategy: GroupSearchStrategy,
    absenceStrategy: AbsenceSearchStrategy,
    scheduleStrategy: ScheduleSearchStrategy,
    shiftStrategy: ShiftSearchStrategy
  ) {
    this.initializeStrategies([
      clientStrategy,
      groupStrategy, 
      absenceStrategy,
      scheduleStrategy,
      shiftStrategy
    ]);
  }

  private initializeStrategies(strategies: IEntitySearchStrategy[]): void {
    strategies.forEach(strategy => {
      this.strategies.set(strategy.getEntityName(), strategy);
    });
  }

  public globalSearch(
    value: string,
    isIncludeAddress = false,
    isIncludeClient = false
  ): void {
    this.searchStateService.setRestoreSearch(value);
    
    const currentEntity = this.workplaceStateService.nameOfVisibleEntity() as EntityName;
    const strategy = this.strategies.get(currentEntity);
    
    if (strategy) {
      const options: EntitySearchOptions = {
        includeAddress: isIncludeAddress,
        includeClient: isIncludeClient
      };
      strategy.search(value, options);
    } else {
      console.warn(`No search strategy found for entity: ${currentEntity}`);
    }
  }

  public resetFilter(): void {
    this.searchStateService.clearRestoreSearch();
    this.resetFilterWithoutSignalWrite();
  }

  public resetFilterWithoutSignalWrite(): void {
    const currentEntity = this.workplaceStateService.nameOfVisibleEntity() as EntityName;
    const strategy = this.strategies.get(currentEntity);
    
    if (strategy) {
      strategy.resetFilter();
    } else {
      console.warn(`No search strategy found for entity: ${currentEntity}`);
    }
  }

  public restoreSearch(): string {
    return this.searchStateService.getRestoreSearch();
  }

  public setRestoreSearch(value: string): void {
    this.searchStateService.setRestoreSearch(value);
  }

  public addStrategy(entityName: EntityName, strategy: IEntitySearchStrategy): void {
    this.strategies.set(entityName, strategy);
  }

  public removeStrategy(entityName: EntityName): boolean {
    return this.strategies.delete(entityName);
  }
}
