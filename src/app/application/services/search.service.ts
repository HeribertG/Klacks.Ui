import { Injectable, signal, computed, inject } from '@angular/core';
import { WorkplaceStateService } from './workplace-state.service';
import { EntityName } from 'src/app/domain/models/entity-names.enum';

export interface SearchConfig {
  showSearch: boolean;
  currentEntity: string;
  isGroupViewMode: boolean;
  showIncludeAddress: boolean;
  showIncludeClient: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private workplaceState = inject(WorkplaceStateService);
  
  // Private signals
  private _showSearch = signal<boolean>(false);
  private _isGroupViewMode = signal<boolean>(true); // Grid view by default
  
  // Public computed signals
  public showSearch = computed(() => this._showSearch());
  public isGroupViewMode = computed(() => this._isGroupViewMode());
  
  // Computed signals for checkbox visibility
  public showIncludeAddress = computed(() => {
    const entity = this.workplaceState.nameOfVisibleEntity();
    return entity === EntityName.CLIENT || entity === EntityName.SHIFT_CONTAINER_TEMPLATE;
  });
  
  public showIncludeClient = computed(() => {
    const entity = this.workplaceState.nameOfVisibleEntity();
    return entity === EntityName.SHIFT;
  });
  
  // Search configuration for template
  public searchConfig = computed<SearchConfig>(() => ({
    showSearch: this._showSearch(),
    currentEntity: this.workplaceState.nameOfVisibleEntity(),
    isGroupViewMode: this._isGroupViewMode(),
    showIncludeAddress: this.showIncludeAddress(),
    showIncludeClient: this.showIncludeClient()
  }));
  
  // Entities that should show search
  private readonly searchEnabledEntities = [
    EntityName.CLIENT,
    EntityName.CLIENT_EDIT,
    EntityName.ABSENCE,
    EntityName.SCHEDULE,
    EntityName.SHIFT,
    EntityName.SHIFT_CONTAINER_TEMPLATE,
    EntityName.GROUP
  ];
  
  constructor() {
    // React to entity changes from WorkplaceStateService
    this.workplaceState.nameOfVisibleEntity; // Subscribe to changes
    this.updateSearchVisibility();
  }
  
  // Public methods to control search visibility
  public setSearchVisibility(show: boolean): void {
    this._showSearch.set(show);
  }
  
  public setGroupViewMode(isGridView: boolean): void {
    this._isGroupViewMode.set(isGridView);
    
    // For GROUP entity, search visibility depends on view mode
    if (this.workplaceState.nameOfVisibleEntity() === EntityName.GROUP) {
      this.updateSearchVisibility();
    }
  }
  
  public updateSearchVisibilityForEntity(entityName: string): void {
    const shouldShow = this.shouldShowSearchForEntity(entityName);
    this._showSearch.set(shouldShow);
  }
  
  // Private helper methods
  private updateSearchVisibility(): void {
    const currentEntity = this.workplaceState.nameOfVisibleEntity();
    const shouldShow = this.shouldShowSearchForEntity(currentEntity);
    this._showSearch.set(shouldShow);
  }
  
  private shouldShowSearchForEntity(entityName: string): boolean {
    // Check if entity supports search
    if (!this.searchEnabledEntities.includes(entityName as EntityName)) {
      return false;
    }
    
    // Special case for GROUP entity - depends on view mode
    if (entityName === EntityName.GROUP) {
      return this._isGroupViewMode(); // Show only in grid mode, not tree mode
    }
    
    // All other supported entities show search
    return true;
  }
}