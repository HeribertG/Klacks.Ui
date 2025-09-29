import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ToastShowService } from './presentation/toast/toast-show.service';

class MockToastService {
  // Optional: Füge Mock-Methoden hinzu, falls benötigt
}

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

describe('AppComponent', () => {
  let mockToastService: MockToastService;
  let mockTranslateService: MockTranslateService;

  beforeEach(() => {
    mockToastService = new MockToastService();
    mockTranslateService = new MockTranslateService();

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, TranslateModule.forRoot(), AppComponent], // AppComponent importieren
      providers: [
        { provide: ToastShowService, useValue: mockToastService }, // Mock für ToastService
        { provide: TranslateService, useValue: mockTranslateService } // Mock für TranslateService
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
