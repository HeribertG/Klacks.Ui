import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { EVENT_BUS_TOKEN, IEventBus } from './domain/interfaces/event-bus.interface';
import { LOADING_INDICATOR_TOKEN, ILoadingIndicator } from './domain/interfaces/loading-indicator.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN, IManageableServiceRegistry } from './domain/interfaces/manageable-service-registry.interface';

import { ToastShowService } from './presentation/toast/toast-show.service';
import { ApplicationInitService } from './application/services/application-init.service';

class MockToastService {
}

class MockApplicationInitService {
  initialize(): void {}
  initializeBasics(): void {}
  destroy(): void {}
}

const mockLoadingIndicator: ILoadingIndicator = {
  showProgressSpinner: false
};

const mockManageableServiceRegistry: IManageableServiceRegistry = {
  register: () => {},
  get: () => undefined,
  has: () => false,
  clear: () => {},
  getRegisteredRoutes: () => []
};

class MockTranslateService {
  currentLang = 'de';
  get(key: string) {
    return of(key);
  }
  instant(key: string) {
    return key;
  }
  stream(key: string) {
    return of(key);
  }
  onLangChange = of({ lang: 'de', translations: {} });
  onTranslationChange = of({ lang: 'de', translations: {} });
  onDefaultLangChange = of({ lang: 'de', translations: {} });
}

class MockEventBus implements IEventBus {
  emit<_T>(_eventType: string, _payload: _T): void {}
  on<_T>(_eventType: string) {
    return of();
  }
  onAny() {
    return of();
  }
}

describe('AppComponent', () => {
  let mockToastService: MockToastService;
  let mockTranslateService: MockTranslateService;
  let mockEventBus: MockEventBus;
  let mockApplicationInitService: MockApplicationInitService;

  beforeEach(() => {
    mockToastService = new MockToastService();
    mockTranslateService = new MockTranslateService();
    mockEventBus = new MockEventBus();
    mockApplicationInitService = new MockApplicationInitService();

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, TranslateModule.forRoot(), AppComponent],
      providers: [
        { provide: ToastShowService, useValue: mockToastService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
        { provide: ApplicationInitService, useValue: mockApplicationInitService },
        { provide: LOADING_INDICATOR_TOKEN, useValue: mockLoadingIndicator },
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockManageableServiceRegistry }
      ],
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'klacks'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('klacks');
  });

  it('should render the content correctly', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-toasts')).not.toBeNull();
  });
});
