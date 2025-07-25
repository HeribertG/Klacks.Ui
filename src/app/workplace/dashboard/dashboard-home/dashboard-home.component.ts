import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FooterService } from 'src/app/services/footer.service';
import { LayoutService } from 'src/app/services/layout.service';

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

  ngOnInit(): void {
    this.footerService.setFooterVisibility(false);
    
    // Set normal width for dashboard
    this.layoutService.setContainerToNormalSize();
  }
}
