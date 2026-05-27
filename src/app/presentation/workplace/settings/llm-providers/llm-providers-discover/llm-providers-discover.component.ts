// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal content that lists discovered LLM provider candidates (catalog + web) with a
 * connectivity badge and lets the user pick several to import.
 * @param selectionChanged - Emits the currently selected candidates whenever the selection changes
 */
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, OnInit, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { IDiscoveredProvider, ProviderCandidateSource, ProviderConnectivityStatus } from 'src/app/domain/models/assistant/discovered-provider';

type DiscoverTab = 'list' | 'manual';

const MANUAL_NAME = 'llm-providers-manual';

@Component({
  selector: 'app-llm-providers-discover',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './llm-providers-discover.component.html',
  styleUrls: ['./llm-providers-discover.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LLMProvidersDiscoverComponent implements OnInit {
  private providerService = inject(DataManagementAssistantProviderService);
  private manualLoader = inject(ManualLoaderService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  readonly Source = ProviderCandidateSource;
  readonly Connectivity = ProviderConnectivityStatus;

  selectionChanged = output<IDiscoveredProvider[]>();

  candidates = signal<IDiscoveredProvider[]>([]);
  isLoading = false;
  hasLoaded = false;
  activeTab = signal<DiscoverTab>('list');
  manualContent = signal<string>('');

  private selectedIds = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selectedIds().size);

  ngOnInit(): void {
    this.loadManual();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadManual());
  }

  setTab(tab: DiscoverTab): void {
    this.activeTab.set(tab);
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || 'de';
    this.manualLoader.loadManual(MANUAL_NAME, lang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(content => {
        this.manualContent.set(content);
        this.cdr.markForCheck();
      });
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.hasLoaded = false;
    this.selectedIds.set(new Set());
    this.selectionChanged.emit([]);
    try {
      const result = await this.providerService.discoverProviders();
      this.candidates.set(result);
    } finally {
      this.isLoading = false;
      this.hasLoaded = true;
      this.cdr.markForCheck();
    }
  }

  isSelectable(candidate: IDiscoveredProvider): boolean {
    return candidate.connectivity !== ProviderConnectivityStatus.Unreachable;
  }

  isSelected(providerId: string): boolean {
    return this.selectedIds().has(providerId);
  }

  onToggle(candidate: IDiscoveredProvider): void {
    if (!this.isSelectable(candidate)) {
      return;
    }

    this.selectedIds.update(current => {
      const next = new Set(current);
      if (next.has(candidate.providerId)) {
        next.delete(candidate.providerId);
      } else {
        next.add(candidate.providerId);
      }
      return next;
    });

    this.selectionChanged.emit(this.currentSelection());
  }

  private currentSelection(): IDiscoveredProvider[] {
    const selected = this.selectedIds();
    return this.candidates().filter(c => selected.has(c.providerId));
  }

  connectivityClass(status: ProviderConnectivityStatus): string {
    switch (status) {
      case ProviderConnectivityStatus.Reachable:
        return 'reachable';
      case ProviderConnectivityStatus.ReachableNeedsKey:
        return 'needs-key';
      case ProviderConnectivityStatus.Unreachable:
        return 'unreachable';
      default:
        return 'unknown';
    }
  }

  connectivityLabelKey(status: ProviderConnectivityStatus): string {
    switch (status) {
      case ProviderConnectivityStatus.Reachable:
        return 'settings.llm-providers.discover.connectivity.reachable';
      case ProviderConnectivityStatus.ReachableNeedsKey:
        return 'settings.llm-providers.discover.connectivity.needs-key';
      case ProviderConnectivityStatus.Unreachable:
        return 'settings.llm-providers.discover.connectivity.unreachable';
      default:
        return 'settings.llm-providers.discover.connectivity.unknown';
    }
  }

  sourceLabelKey(source: ProviderCandidateSource): string {
    return source === ProviderCandidateSource.Web
      ? 'settings.llm-providers.discover.source.web'
      : 'settings.llm-providers.discover.source.catalog';
  }
}
