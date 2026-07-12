// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { CountriesRowComponent } from './countries-row.component';
import { ICountry } from 'src/app/domain/models/client/client-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

describe('CountriesRowComponent', () => {
  let fixture: ComponentFixture<CountriesRowComponent>;
  let component: CountriesRowComponent;

  function build(currentLang: string, name: Record<string, string>): ICountry {
    const translateServiceSpy = {
      currentLang,
      instant: vi.fn().mockReturnValue('x'),
      get: vi.fn().mockReturnValue(of('x')),
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
    };

    TestBed.configureTestingModule({
      imports: [CountriesRowComponent, TranslateModule.forRoot()],
      providers: [{ provide: TranslateService, useValue: translateServiceSpy }],
    });

    const data: ICountry = {
      id: 'row-1',
      abbreviation: 'CH',
      name: { ...name } as MultiLanguage,
      prefix: '+41',
      select: false,
      isDirty: 0,
    };

    fixture = TestBed.createComponent(CountriesRowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    return data;
  }

  function nameInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input.country-name') as HTMLInputElement;
  }

  it('renders the plugin-language name for a mixed-case locale (zh-CN -> zh-cn key)', () => {
    build('zh-CN', { de: 'Schweiz', 'zh-cn': '瑞士' });

    expect(nameInput().value).toBe('瑞士');
  });

  it('renders the plugin-language name for a lower-case locale (pl)', () => {
    build('pl', { de: 'Schweiz', pl: 'Szwajcaria' });

    expect(nameInput().value).toBe('Szwajcaria');
  });

  it('writes edits into the current-language key and preserves the other languages', () => {
    const data = build('pl', { de: 'Schweiz', pl: 'Szwajcaria' });

    (component as any).countryModel.set({
      abbreviation: 'CH',
      nameCurrent: 'Konfederacja',
      prefix: '+41',
    });
    fixture.detectChanges();

    expect(data.name!['pl']).toBe('Konfederacja');
    expect(data.name!.de).toBe('Schweiz');
  });
});
