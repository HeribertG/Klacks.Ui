// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only


import {
  Component,
  inject,
  OnInit,
  effect,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NavToggleComponent } from 'src/app/presentation/shared/nav-toggle/nav-toggle.component';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { AllGroupListComponent } from '../all-group-list/all-group-list.component';
import { AllGroupNavComponent } from '../all-group-nav/all-group-nav.component';
import { TreeGroupComponent } from '../tree-group/tree-group.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { GroupViewPreferenceService } from 'src/app/domain/services/group/group-view-preference.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-all-group-home',
  templateUrl: './all-group-home.component.html',
  styleUrls: ['./all-group-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    AllGroupListComponent,
    AllGroupNavComponent,
    TreeGroupComponent,
    NavToggleComponent
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllGroupHomeComponent implements OnInit {
  public authorizationService = inject(AuthorizationService);
  public readonly PERMISSIONS = PERMISSIONS;
  private workplaceStateService = inject(
    WorkplaceStateService
  );
  private groupViewPreference = inject(GroupViewPreferenceService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private cdr = inject(ChangeDetectorRef);
  private dataManagementGroupService = inject(DataManagementGroupService);

  readonly navOpen = signal(false);

  private _showGrid = true;

  constructor() {
    effect(() => {
      const focusChanged =
        this.workplaceStateService.isFocusChanged();
      const currentEntity =
        this.workplaceStateService.nameOfVisibleEntity();

      if (focusChanged && currentEntity === EntityName.GROUP) {
        setTimeout(() => {
          this.restoreViewMode();
          this.cdr.markForCheck();
        }, 10);
      }
    });
  }

  isFilterActive(): boolean {
    return !this.dataManagementGroupService.currentFilter.isDefault();
  }

  get showGrid(): boolean {
    return this._showGrid;
  }

  set showGrid(value: boolean) {
    this._showGrid = value;
    this.searchService.setGroupViewMode(value);
    this.groupViewPreference.setGridView(value);
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(true);
    
    // Set active manager for group route to enable search functionality
    this.workplaceStateService.setActiveManagerByRoute('group');
    
    this.restoreViewMode();
  }

  private restoreViewMode(): void {
    this._showGrid = this.groupViewPreference.isGridView();

    this.searchService.setGroupViewMode(this._showGrid);
  }

  showAsGrid() {
    this.showGrid = true;
  }

  showAsTree() {
    this.showGrid = false;
  }
}
