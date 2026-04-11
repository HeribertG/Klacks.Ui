// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Top-level page for Periodenabschluss. Renders the three admin features
 * (Periods, Exports, Audit) as independent cards inside the workplace layout,
 * matching the settings-home / profile-home pattern.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { PeriodsTabComponent } from '../periods-tab/periods-tab.component';
import { ExportsTabComponent } from '../exports-tab/exports-tab.component';
import { AuditTabComponent } from '../audit-tab/audit-tab.component';

@Component({
  selector: 'app-period-closing-home',
  templateUrl: './period-closing-home.component.html',
  styleUrls: ['./period-closing-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    PeriodsTabComponent,
    ExportsTabComponent,
    AuditTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodClosingHomeComponent implements OnInit {
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private savebarService = inject(SavebarService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.savebarService.setSavebarVisibility(false);
  }
}
