// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Top-level page for Periodenabschluss. Provides three tabs
 * (Periods, Exports, Audit Log) using a simple signal-driven selector.
 */

import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { PeriodsTabComponent } from '../periods-tab/periods-tab.component';
import { ExportsTabComponent } from '../exports-tab/exports-tab.component';
import { AuditTabComponent } from '../audit-tab/audit-tab.component';

type PeriodClosingTab = 'periods' | 'exports' | 'audit';

@Component({
  selector: 'app-period-closing-home',
  templateUrl: './period-closing-home.component.html',
  styleUrls: ['./period-closing-home.component.scss'],
  standalone: true,
  imports: [TranslateModule, PeriodsTabComponent, ExportsTabComponent, AuditTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodClosingHomeComponent implements OnInit {
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private savebarService = inject(SavebarService);

  public activeTab = signal<PeriodClosingTab>('periods');

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.savebarService.setSavebarVisibility(false);
  }

  setTab(tab: PeriodClosingTab): void {
    this.activeTab.set(tab);
  }
}
