
import { Component, inject, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { DashboardClientsOverviewComponent } from '../dashboard-clients-overview/dashboard-clients-overview.component';
import { DashboardClientsLocationsComponent } from '../dashboard-clients-locations/dashboard-clients-locations.component';
import { DashboardShiftsOverviewComponent } from '../dashboard-shifts-overview/dashboard-shifts-overview.component';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
  standalone: true,
  imports: [TranslateModule, DashboardClientsOverviewComponent, DashboardClientsLocationsComponent, DashboardShiftsOverviewComponent],
})
export class DashboardHomeComponent implements OnInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);
  private authorizationService = inject(AuthorizationService);

  get isAuthorised(): boolean {
    return this.authorizationService.isAuthorised;
  }

  ngOnInit(): void {
    this.savebarService.setSavebarVisibility(false);

    // Hide search for dashboard
    this.searchService.setSearchVisibility(false);

    // Hide group-select for dashboard
    this.workplaceStateService.setNameOfVisibleEntity(EntityName.DASHBOARD);
    this.workplaceStateService.isFocusChanged.set(true);

    // Set normal width for dashboard
    this.layoutService.setContainerToNormalSize();
  }
}
