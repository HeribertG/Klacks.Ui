
import { Component, inject, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
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

  ngOnInit(): void {
    this.savebarService.setSavebarVisibility(false);
    
    // Hide search for dashboard
    this.searchService.setSearchVisibility(false);
    
    // Set normal width for dashboard
    this.layoutService.setContainerToNormalSize();
  }
}
