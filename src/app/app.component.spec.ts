// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { ApplicationInitService } from './application/services/application-init.service';
import { EVENT_BUS_TOKEN } from './domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from './domain/interfaces/manageable-service-registry.interface';
import { LOADING_INDICATOR_TOKEN } from './domain/interfaces/loading-indicator.interface';
import { ENTITY_STATE_PROVIDER_TOKEN } from './domain/interfaces/entity-state-provider.interface';
import { FILTER_STORAGE_TOKEN } from './application/interfaces/filter-storage.interface';
import { SCRIPT_COMPILER } from './domain/models/automation/rules/script-compiler.interface';
import { SEARCH_STRATEGY } from './domain/interfaces/search-strategy.interface';
import { AsideService } from './presentation/aside/aside.service';
import { AppSettingsManagementService } from './domain/services/settings/app-settings-management.service';
import { OutputMode } from './domain/constants/speech-constants';
import * as fs from 'fs';
import * as path from 'path';

const fileMap = new Map<string, string>();
function buildFileMap(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      buildFileMap(fullPath);
    } else if (entry.isFile() && /\.(html|scss|css)$/.test(entry.name)) {
      fileMap.set(entry.name, fullPath);
    }
  }
}
buildFileMap(path.resolve(__dirname));

function localFetch(url: string): Promise<Response> {
  const fileName = path.basename(url);
  const filePath = fileMap.get(fileName);
  if (filePath) {
    try {
      return Promise.resolve(new Response(fs.readFileSync(filePath, 'utf-8')));
    } catch { /* empty */ }
  }
  return Promise.resolve(new Response(''));
}

describe('AppComponent', () => {
  beforeAll(async () => {
    await resolveComponentResources(localFetch);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: ApplicationInitService, useValue: { initializeBasics: () => {}, destroy: () => {} } },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: () => {}, on: () => of(), onAny: () => of() } },
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: { register: () => {}, get: () => undefined, has: () => false, clear: () => {}, getRegisteredRoutes: () => [] } },
        { provide: LOADING_INDICATOR_TOKEN, useValue: { showProgressSpinner: false, interceptorSuppressed: false } },
        { provide: ENTITY_STATE_PROVIDER_TOKEN, useValue: {} },
        { provide: FILTER_STORAGE_TOKEN, useValue: { getItem: () => null, setItem: () => {}, removeItem: () => {} } },
        { provide: SCRIPT_COMPILER, useValue: { compile: () => ({}) } },
        { provide: SEARCH_STRATEGY, useValue: { globalSearch: () => {}, resetFilter: () => {}, restoreSearch: () => '', setRestoreSearch: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    // Arrange & Act
    const fixture = TestBed.createComponent(AppComponent);

    // Assert
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have as title 'klacks'`, () => {
    // Arrange & Act
    const fixture = TestBed.createComponent(AppComponent);

    // Assert
    expect(fixture.componentInstance.title).toEqual('klacks');
  });

  it('should render the content correctly', () => {
    // Arrange
    const fixture = TestBed.createComponent(AppComponent);

    // Act
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    // Assert
    expect(compiled.querySelector('app-toasts')).not.toBeNull();
  });

  // The audio-mode panels are a fixed-position overlay. Inside the chat they were unreachable:
  // in a floating mode the aside mounts the chat only in its hidden bootstrap host (0x0,
  // visibility: hidden), and visibility is inherited. They must stay a sibling of the voice shell.
  describe('audio-mode floating panels', () => {
    let asideService: AsideService;
    let appSettings: AppSettingsManagementService;

    function panelHost(fixture: ComponentFixture<AppComponent>): Element | null {
      return (fixture.nativeElement as HTMLElement).querySelector('app-audio-mode-panels');
    }

    beforeEach(() => {
      asideService = TestBed.inject(AsideService);
      appSettings = TestBed.inject(AppSettingsManagementService);
    });

    it('renders the panels at app level while the aside is open in audio-only mode', () => {
      appSettings.speechSettings.set({ ...appSettings.speechSettings(), outputMode: OutputMode.Audio });
      asideService.show();

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(panelHost(fixture)).not.toBeNull();
    });

    it('does not render the panels while the aside is closed', () => {
      appSettings.speechSettings.set({ ...appSettings.speechSettings(), outputMode: OutputMode.Audio });
      asideService.hide();

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(panelHost(fixture)).toBeNull();
    });

    it('does not render the panels in text mode', () => {
      appSettings.speechSettings.set({ ...appSettings.speechSettings(), outputMode: OutputMode.Text });
      asideService.show();

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(panelHost(fixture)).toBeNull();
    });
  });
});
