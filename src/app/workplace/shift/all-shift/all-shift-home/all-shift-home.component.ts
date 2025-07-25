import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { AllShiftListComponent } from '../all-shift-list/all-shift-list.component';
import { AllShiftNavComponent } from '../all-shift-nav/all-shift-nav.component';
import { TranslateModule } from '@ngx-translate/core';
import { FooterService } from 'src/app/services/footer.service';
import { LayoutService } from 'src/app/services/layout.service';

@Component({
  selector: 'app-all-shift-home',
  templateUrl: './all-shift-home.component.html',
  styleUrl: './all-shift-home.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AllShiftListComponent,
    AllShiftNavComponent,
  ],
})
export class AllShiftHomeComponent implements OnInit {
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  
  @Output() isChangingEvent = new EventEmitter();

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.footerService.setFooterVisibility(false);
  }
}
