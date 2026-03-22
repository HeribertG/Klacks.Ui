// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Main dashboard component with collapsible sections.
 * @param sections - Record of section states (open/closed)
 */
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { DashboardClientsOverviewComponent } from '../dashboard-clients-overview/dashboard-clients-overview.component';
import { DashboardClientsLocationsComponent } from '../dashboard-clients-locations/dashboard-clients-locations.component';
import { DashboardShiftsOverviewComponent } from '../dashboard-shifts-overview/dashboard-shifts-overview.component';
import { DashboardShiftCoverageComponent } from '../dashboard-shift-coverage/dashboard-shift-coverage.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconCollapseAllGreyComponent } from 'src/app/presentation/icons/icon-collapse-all-grey.component';
import { IconExpandAllGreyComponent } from 'src/app/presentation/icons/icon-expand-all-grey.component';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    DashboardClientsOverviewComponent,
    DashboardClientsLocationsComponent,
    DashboardShiftsOverviewComponent,
    DashboardShiftCoverageComponent,
    IconAngleDownComponent,
    IconAngleRightComponent,
    IconCollapseAllGreyComponent,
    IconExpandAllGreyComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent implements OnInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);
  private authorizationService = inject(AuthorizationService);

  sections: Record<string, boolean> = {
    overview: true,
    coverage: true,
    locations: true,
  };

  get isAuthorised(): boolean {
    return this.authorizationService.isAuthorised;
  }

  ngOnInit(): void {
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute(RouteName.DASHBOARD);
    this.workplaceStateService.isFocusChanged.set(true);
    this.layoutService.setContainerToNormalSize();
  }

  toggleSection(section: string): void {
    this.sections[section] = !this.sections[section];
  }

  expandAll(): void {
    Object.keys(this.sections).forEach((key) => (this.sections[key] = true));
  }

  collapseAll(): void {
    Object.keys(this.sections).forEach((key) => (this.sections[key] = false));
  }
}
