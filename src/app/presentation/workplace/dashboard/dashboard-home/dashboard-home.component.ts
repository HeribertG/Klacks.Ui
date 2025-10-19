import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
  standalone: true,
  imports: [CommonModule],
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
