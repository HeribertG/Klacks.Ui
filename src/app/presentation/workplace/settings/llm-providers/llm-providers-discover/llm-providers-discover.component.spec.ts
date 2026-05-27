// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { LLMProvidersDiscoverComponent } from './llm-providers-discover.component';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { IDiscoveredProvider, ProviderCandidateSource, ProviderConnectivityStatus } from 'src/app/domain/models/assistant/discovered-provider';

describe('LLMProvidersDiscoverComponent', () => {
  let component: LLMProvidersDiscoverComponent;
  let fixture: ComponentFixture<LLMProvidersDiscoverComponent>;
  let discoverProviders: ReturnType<typeof vi.fn>;

  const candidates: IDiscoveredProvider[] = [
    {
      providerId: 'groq',
      providerName: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1/',
      requiresApiKey: true,
      source: ProviderCandidateSource.Catalog,
      connectivity: ProviderConnectivityStatus.Reachable,
    },
    {
      providerId: 'dead',
      providerName: 'Dead Provider',
      baseUrl: 'https://api.dead.example/v1/',
      requiresApiKey: true,
      source: ProviderCandidateSource.Web,
      connectivity: ProviderConnectivityStatus.Unreachable,
    },
  ];

  beforeEach(async () => {
    discoverProviders = vi.fn().mockResolvedValue(candidates);

    await TestBed.configureTestingModule({
      imports: [LLMProvidersDiscoverComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementAssistantProviderService,
          useValue: { discoverProviders },
        },
        {
          provide: ManualLoaderService,
          useValue: { loadManual: vi.fn().mockReturnValue(of('<p>manual</p>')) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LLMProvidersDiscoverComponent);
    component = fixture.componentInstance;
  });

  it('loads candidates', async () => {
    await component.load();
    expect(component.candidates().length).toBe(2);
    expect(component.hasLoaded).toBe(true);
  });

  it('loads the manual on init and switches tabs', () => {
    fixture.detectChanges();
    expect(component.manualContent()).toBe('<p>manual</p>');
    expect(component.activeTab()).toBe('list');

    component.setTab('manual');
    expect(component.activeTab()).toBe('manual');
  });

  it('marks unreachable candidates as not selectable', () => {
    expect(component.isSelectable(candidates[0])).toBe(true);
    expect(component.isSelectable(candidates[1])).toBe(false);
  });

  it('toggles selection for reachable candidates', async () => {
    await component.load();
    component.onToggle(candidates[0]);
    expect(component.isSelected('groq')).toBe(true);
    expect(component.selectedCount()).toBe(1);

    component.onToggle(candidates[0]);
    expect(component.isSelected('groq')).toBe(false);
  });

  it('ignores toggle on unreachable candidates', async () => {
    await component.load();
    component.onToggle(candidates[1]);
    expect(component.isSelected('dead')).toBe(false);
    expect(component.selectedCount()).toBe(0);
  });

  it('emits the current selection when a candidate is toggled', async () => {
    await component.load();

    const emitted = vi.fn();
    component.selectionChanged.subscribe(emitted);
    component.onToggle(candidates[0]);

    expect(emitted).toHaveBeenCalledTimes(1);
    const arg = emitted.mock.calls[0][0] as IDiscoveredProvider[];
    expect(arg.length).toBe(1);
    expect(arg[0].providerId).toBe('groq');
  });

  it('emits an empty selection after deselecting', async () => {
    await component.load();
    component.onToggle(candidates[0]);

    const emitted = vi.fn();
    component.selectionChanged.subscribe(emitted);
    component.onToggle(candidates[0]);

    const arg = emitted.mock.calls[0][0] as IDiscoveredProvider[];
    expect(arg.length).toBe(0);
  });
});
