import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FooterService } from 'src/app/services/footer.service';
import { LayoutService } from 'src/app/services/layout.service';
import { SearchService } from 'src/app/services/search.service';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class DashboardHomeComponent implements OnInit {
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  ngOnInit(): void {
    this.footerService.setFooterVisibility(false);
    
    // Hide search for dashboard
    this.searchService.setSearchVisibility(false);
    
    // Set normal width for dashboard
    this.layoutService.setContainerToNormalSize();
  }
}
