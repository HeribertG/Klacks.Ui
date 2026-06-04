// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { WorkplaceStateService } from '../../application/services/workplace-state.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import {
  IEntitySearchStrategy,
  EntitySearchOptions,
} from './strategies/interfaces/entity-search-strategy.interface';
import { ClientSearchStrategy } from './strategies/client-search.strategy';
import { GroupSearchStrategy } from './strategies/group-search.strategy';
import { AbsenceSearchStrategy } from './strategies/absence-search.strategy';
import { ScheduleSearchStrategy } from './strategies/schedule-search.strategy';
import { ShiftSearchStrategy } from './strategies/shift-search.strategy';
import { ContainerTemplateSearchStrategy } from './strategies/container-template-search.strategy';
import { ISearchStrategyOptions } from 'src/app/domain/interfaces/search-strategy.interface';

@Injectable({
  providedIn: 'root',
})
export class SearchStrategyService {
  private workplaceStateService = inject(WorkplaceStateService);
  private searchStateService = inject(SearchStateService);
  private localStorageService = inject(LocalStorageService);
  private strategies = new Map<EntityName, IEntitySearchStrategy>();

  private readonly SEARCH_RESTORE_KEY = 'klacks.search.restore-search';

  constructor() {
    const clientStrategy = inject(ClientSearchStrategy);
    const groupStrategy = inject(GroupSearchStrategy);
    const absenceStrategy = inject(AbsenceSearchStrategy);
    const scheduleStrategy = inject(ScheduleSearchStrategy);
    const shiftStrategy = inject(ShiftSearchStrategy);
    const containerTemplateStrategy = inject(ContainerTemplateSearchStrategy);

    this.initializeStrategies([
      clientStrategy,
      groupStrategy,
      absenceStrategy,
      scheduleStrategy,
      shiftStrategy,
      containerTemplateStrategy,
    ]);

    const stored = this.localStorageService.get(this.SEARCH_RESTORE_KEY);
    if (stored) {
      this.searchStateService.setRestoreSearch(stored);
    }
  }

  private initializeStrategies(strategies: IEntitySearchStrategy[]): void {
    strategies.forEach((strategy) => {
      this.strategies.set(strategy.getEntityName(), strategy);
    });
  }

  public globalSearch(
    value: string,
    isIncludeAddress = false,
    isIncludeClient = false,
    options?: ISearchStrategyOptions
  ): void {
    this.searchStateService.setRestoreSearch(value);
    this.localStorageService.set(this.SEARCH_RESTORE_KEY, value);

    const currentEntity =
      this.workplaceStateService.nameOfVisibleEntity() as EntityName;
    const strategy = this.strategies.get(currentEntity);

    if (strategy) {
      const entityOptions: EntitySearchOptions = {
        includeAddress: isIncludeAddress,
        includeClient: isIncludeClient,
        ...options,
      };
      strategy.search(value, entityOptions);
    } else {
      console.warn(`No search strategy found for entity: ${currentEntity}`);
    }
  }

  public resetFilter(): void {
    this.searchStateService.clearRestoreSearch();
    this.localStorageService.remove(this.SEARCH_RESTORE_KEY);
    this.resetFilterWithoutSignalWrite();
  }

  public resetFilterWithoutSignalWrite(): void {
    const currentEntity =
      this.workplaceStateService.nameOfVisibleEntity() as EntityName;
    const strategy = this.strategies.get(currentEntity);

    if (strategy) {
      strategy.resetFilter();
    }
  }

  public restoreSearch(): string {
    return this.searchStateService.getRestoreSearch();
  }

  public setRestoreSearch(value: string): void {
    this.searchStateService.setRestoreSearch(value);
  }

  public addStrategy(
    entityName: EntityName,
    strategy: IEntitySearchStrategy
  ): void {
    this.strategies.set(entityName, strategy);
  }

  public removeStrategy(entityName: EntityName): boolean {
    return this.strategies.delete(entityName);
  }
}
