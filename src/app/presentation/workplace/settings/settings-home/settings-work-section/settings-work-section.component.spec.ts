// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SettingsWorkSectionComponent } from './settings-work-section.component';

const EXPECTED_IDS = [
  'settings-home-work-row',
  'settings-work-setting',
  'settings-home-scheduling-defaults-row',
  'settings-scheduling-defaults',
  'settings-home-scheduling-rules-row',
  'settings-scheduling-rules',
  'settings-wizard',
  'settings-home-individual-periods-row',
  'settings-individual-periods',
  'settings-monthly-target-hours',
];

describe('SettingsWorkSectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SettingsWorkSectionComponent] })
      .overrideComponent(SettingsWorkSectionComponent, { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] } })
      .compileComponents();
  });

  it('renders its rows and cards in the original order with their Klacksy targets', () => {
    const fixture = TestBed.createComponent(SettingsWorkSectionComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(Array.from(root.querySelectorAll('[id]')).map((element) => element.id)).toEqual(EXPECTED_IDS);
    root.querySelectorAll('.container-profilline > [id]').forEach((card) => {
      expect(card.getAttribute('data-klacksy-route')).toBe('/workplace/settings');
      expect(card.getAttribute('data-klacksy-target')).toBeTruthy();
    });
  });
});
