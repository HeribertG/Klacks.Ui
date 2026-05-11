// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Main dashboard component with collapsible, hideable and reorderable sections.
 * @param sections - Record of section expand/collapse states (open/closed)
 * @param sectionVisibility - Record of section visibility states (shown/hidden), persisted in localStorage
 * @param sectionOrder - Display order of sections, persisted in localStorage
 */
import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DashboardClientsOverviewComponent } from '../dashboard-clients-overview/dashboard-clients-overview.component';
import { DashboardClientsLocationsComponent } from '../dashboard-clients-locations/dashboard-clients-locations.component';
import { DashboardShiftsOverviewComponent } from '../dashboard-shifts-overview/dashboard-shifts-overview.component';
import { DashboardShiftCoverageComponent } from '../dashboard-shift-coverage/dashboard-shift-coverage.component';
import { DashboardResourceMonitorComponent } from '../dashboard-resource-monitor/dashboard-resource-monitor.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconCollapseAllGreyComponent } from 'src/app/presentation/icons/icon-collapse-all-grey.component';
import { IconExpandAllGreyComponent } from 'src/app/presentation/icons/icon-expand-all-grey.component';
import { ClickOutsideDirective } from 'src/app/presentation/directives/click-outside.directive';
import { IconSettingsThreeComponent } from 'src/app/presentation/icons/icon-settings-three.component';
import { IconGripVerticalComponent } from 'src/app/presentation/icons/icon-grip-vertical.component';

const DEFAULT_SECTION_ORDER = ['overview', 'coverage', 'resources', 'locations'];

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    DashboardClientsOverviewComponent,
    DashboardClientsLocationsComponent,
    DashboardShiftsOverviewComponent,
    DashboardShiftCoverageComponent,
    DashboardResourceMonitorComponent,
    IconAngleDownComponent,
    IconAngleRightComponent,
    IconCollapseAllGreyComponent,
    IconExpandAllGreyComponent,
    ClickOutsideDirective,
    IconSettingsThreeComponent,
    IconGripVerticalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent implements OnInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);
  private authorizationService = inject(AuthorizationService);
  private localStorageService = inject(LocalStorageService);

  readonly sectionKeys = ['overview', 'coverage', 'resources', 'locations'] as const;

  menuOpen = signal(false);

  sections: Record<string, boolean> = {
    overview: true,
    coverage: true,
    resources: true,
    locations: true,
  };

  sectionVisibility: Record<string, boolean> = {
    overview: true,
    coverage: true,
    resources: true,
    locations: true,
  };

  sectionOrder: string[] = [...DEFAULT_SECTION_ORDER];

  get isAuthorised(): boolean {
    return this.authorizationService.isAuthorised;
  }

  get visibleSectionOrder(): string[] {
    return this.sectionOrder.filter(
      (k) => this.sectionVisibility[k] && (this.isAuthorised || k === 'locations')
    );
  }

  ngOnInit(): void {
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute(RouteName.DASHBOARD);
    this.workplaceStateService.isFocusChanged.set(true);
    this.layoutService.setContainerToNormalSize();
    this.loadSectionVisibility();
    this.loadSectionOrder();
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

  toggleMenuOpen(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleSectionVisibility(key: string): void {
    this.sectionVisibility[key] = !this.sectionVisibility[key];
    this.saveSectionVisibility();
  }

  onSectionDrop(event: CdkDragDrop<string[]>): void {
    const visibleKeys = this.sectionOrder.filter((k) => this.sectionVisibility[k]);
    moveItemInArray(visibleKeys, event.previousIndex, event.currentIndex);
    let visibleIdx = 0;
    this.sectionOrder = this.sectionOrder.map((k) =>
      this.sectionVisibility[k] ? visibleKeys[visibleIdx++] : k
    );
    this.saveSectionOrder();
  }

  private loadSectionVisibility(): void {
    try {
      const stored = this.localStorageService.getJson(StorageKeys.DASHBOARD_SECTION_VISIBILITY) as Record<string, boolean> | null;
      if (!stored) {
        return;
      }
      this.sectionKeys.forEach((key) => {
        if (key in stored && typeof stored[key] === 'boolean') {
          this.sectionVisibility[key] = stored[key];
        }
      });
    } catch {
      // Silently fall back to defaults on corrupt storage
    }
  }

  private saveSectionVisibility(): void {
    this.localStorageService.setJson(StorageKeys.DASHBOARD_SECTION_VISIBILITY, this.sectionVisibility);
  }

  private loadSectionOrder(): void {
    try {
      const stored = this.localStorageService.getJson(StorageKeys.DASHBOARD_SECTION_ORDER) as string[] | null;
      if (!Array.isArray(stored)) {
        return;
      }
      const valid = stored.filter((k) => DEFAULT_SECTION_ORDER.includes(k));
      const missing = DEFAULT_SECTION_ORDER.filter((k) => !valid.includes(k));
      this.sectionOrder = [...valid, ...missing];
    } catch {
      // Silently fall back to default order on corrupt storage
    }
  }

  private saveSectionOrder(): void {
    this.localStorageService.setJson(StorageKeys.DASHBOARD_SECTION_ORDER, this.sectionOrder);
  }
}
