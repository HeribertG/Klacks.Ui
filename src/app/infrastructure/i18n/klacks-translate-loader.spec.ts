// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { KlacksTranslateLoader } from './klacks-translate-loader';
import { environment } from 'src/environments/environment';

describe('KlacksTranslateLoader', () => {
  let loader: KlacksTranslateLoader;
  let httpTestingController: HttpTestingController;
  const apiUrl = environment.baseUrl.replace('backend/', '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()]
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

    const coreReq = httpTestingController.expectOne('./assets/i18n/de.json');
    const pluginReq = httpTestingController.expectOne(`${apiUrl}config/translations/de`);
    expect(coreReq.request.method).toBe('GET');
    coreReq.flush(mockTranslations);
    pluginReq.flush({});
  });

  it('should load core language en from static assets', () => {
    loader.getTranslation('en').subscribe();

    const coreReq = httpTestingController.expectOne('./assets/i18n/en.json');
    const pluginReq = httpTestingController.expectOne(`${apiUrl}config/translations/en`);
    expect(coreReq.request.method).toBe('GET');
    coreReq.flush({});
    pluginReq.flush({});
  });

  it('should load core language fr from static assets', () => {
    loader.getTranslation('fr').subscribe();

    const coreReq = httpTestingController.expectOne('./assets/i18n/fr.json');
    const pluginReq = httpTestingController.expectOne(`${apiUrl}config/translations/fr`);
    expect(coreReq.request.method).toBe('GET');
    coreReq.flush({});
    pluginReq.flush({});
  });

  it('should load core language it from static assets', () => {
    loader.getTranslation('it').subscribe();

    const coreReq = httpTestingController.expectOne('./assets/i18n/it.json');
    const pluginReq = httpTestingController.expectOne(`${apiUrl}config/translations/it`);
    expect(coreReq.request.method).toBe('GET');
    coreReq.flush({});
    pluginReq.flush({});
  });

  it('should load plugin language merged with english base', () => {
    // Arrange
    const baseTranslations = { 'base.key': 'Base value', 'shared.key': 'English' };
    const pluginTranslations = { 'test.key': 'Valor de prueba', 'shared.key': 'Español' };

    // Act
    loader.getTranslation('es').subscribe((translations) => {
      // Assert
      expect(translations).toEqual({
        'base.key': 'Base value',
        'test.key': 'Valor de prueba',
        'shared.key': 'Español',
      });
    });

    const baseReq = httpTestingController.expectOne('./assets/i18n/en.json');
    const pluginReq = httpTestingController.expectOne(`${apiUrl}config/translations/es`);
    baseReq.flush(baseTranslations);
    pluginReq.flush(pluginTranslations);
  });

  it('should use english fallback for missing plugin keys', () => {
    // Arrange
    const baseTranslations = { 'base.key': 'Base value' };
    const pluginTranslations = {};

    // Act
    loader.getTranslation('pt').subscribe((translations) => {
      // Assert
      expect(translations).toEqual({ 'base.key': 'Base value' });
    });

    const baseReq = httpTestingController.expectOne('./assets/i18n/en.json');
    const pluginReq = httpTestingController.expectOne(`${apiUrl}config/translations/pt`);
    baseReq.flush(baseTranslations);
    pluginReq.flush(pluginTranslations);
  });
});
