// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only


import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { AllShiftListComponent } from '../all-shift-list/all-shift-list.component';
import { AllShiftNavComponent } from '../all-shift-nav/all-shift-nav.component';
import { TranslateModule } from '@ngx-translate/core';
import { NavToggleComponent } from 'src/app/presentation/shared/nav-toggle/nav-toggle.component';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';

@Component({
  selector: 'app-all-shift-home',
  templateUrl: './all-shift-home.component.html',
  styleUrl: './all-shift-home.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    AllShiftListComponent,
    AllShiftNavComponent,
    NavToggleComponent
],
})
export class AllShiftHomeComponent implements OnInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);
  private dataManagementShiftService = inject(DataManagementShiftService);

  readonly navOpen = signal(false);

  isFilterActive(): boolean {
    return !this.dataManagementShiftService.currentFilter.isDefault();
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(true);

    // Set active manager for shift route to enable search functionality
    this.workplaceStateService.setActiveManagerByRoute('shift');
  }
}
