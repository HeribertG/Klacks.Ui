// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SettingsComplianceSectionComponent } from './settings-compliance-section.component';

const EXPECTED_IDS = [
  'settings-home-active-industries-row',
  'settings-active-industries',
  'settings-home-compensatory-rest-row',
  'settings-compensatory-rest',
  'settings-home-surcharge-mode-row',
  'settings-surcharge-mode',
  'settings-home-overtime-row',
  'settings-overtime',
  'settings-home-compliance-enforcement-row',
  'settings-compliance-enforcement',
  'settings-home-counter-rules-row',
  'settings-counter-rules',
  'settings-home-period-cap-rules-row',
  'settings-period-cap-rules',
  'settings-home-restricted-time-window-rules-row',
  'settings-restricted-time-window-rules',
  'settings-home-holiday-work-exemptions-row',
  'settings-holiday-work-exemptions',
];

describe('SettingsComplianceSectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SettingsComplianceSectionComponent] })
      .overrideComponent(SettingsComplianceSectionComponent, { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] } })
      .compileComponents();
  });

  it('renders its rows and cards in the original order with their Klacksy targets', () => {
    const fixture = TestBed.createComponent(SettingsComplianceSectionComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(Array.from(root.querySelectorAll('[id]')).map((element) => element.id)).toEqual(EXPECTED_IDS);
    root.querySelectorAll('.container-profilline > [id]').forEach((card) => {
      expect(card.getAttribute('data-klacksy-route')).toBe('/workplace/settings');
      expect(card.getAttribute('data-klacksy-target')).toBeTruthy();
    });
  });
});
