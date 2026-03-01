// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { KlacksTranslateLoader } from './klacks-translate-loader';
import { environment } from 'src/environments/environment';

describe('KlacksTranslateLoader', () => {
  let loader: KlacksTranslateLoader;
  let httpTestingController: HttpTestingController;
  const apiUrl = environment.baseUrl.replace('backend/', '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
    });
    const httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    loader = new KlacksTranslateLoader(httpClient);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should load core language from static assets', () => {
    const mockTranslations = { 'test.key': 'Testwert' };

    loader.getTranslation('de').subscribe((translations) => {
      expect(translations).toEqual(mockTranslations);
    });

    const req = httpTestingController.expectOne('./assets/i18n/de.json');
    expect(req.request.method).toBe('GET');
    req.flush(mockTranslations);
  });

  it('should load core language en from static assets', () => {
    loader.getTranslation('en').subscribe();

    const req = httpTestingController.expectOne('./assets/i18n/en.json');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should load core language fr from static assets', () => {
    loader.getTranslation('fr').subscribe();

    const req = httpTestingController.expectOne('./assets/i18n/fr.json');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should load core language it from static assets', () => {
    loader.getTranslation('it').subscribe();

    const req = httpTestingController.expectOne('./assets/i18n/it.json');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should load plugin language from API', () => {
    const mockTranslations = { 'test.key': 'Valor de prueba' };

    loader.getTranslation('es').subscribe((translations) => {
      expect(translations).toEqual(mockTranslations);
    });

    const req = httpTestingController.expectOne(`${apiUrl}config/translations/es`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTranslations);
  });

  it('should load unknown language from API', () => {
    loader.getTranslation('pt').subscribe();

    const req = httpTestingController.expectOne(`${apiUrl}config/translations/pt`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
