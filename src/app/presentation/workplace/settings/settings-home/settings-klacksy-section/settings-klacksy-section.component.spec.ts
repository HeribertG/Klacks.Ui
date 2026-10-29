// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { SettingsKlacksySectionComponent } from './settings-klacksy-section.component';

const EXPECTED_IDS = [
  'settings-home-assistant-speech-row',
  'settings-assistant-speech',
  'settings-home-whisper-plugin-row',
  'settings-whisper-plugin',
  'settings-home-assistant-personality-row',
  'settings-assistant-personality',
  'settings-home-assistant-learning-row',
  'settings-assistant-learning',
  'settings-home-assistant-skill-relations-row',
  'settings-assistant-skill-relations',
  'settings-home-klacksy-autonomy-row',
  'settings-klacksy-autonomy',
  'settings-home-klacksy-proactive-governance-row',
  'settings-klacksy-proactive-governance',
];

describe('SettingsKlacksySectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SettingsKlacksySectionComponent] })
      .overrideComponent(SettingsKlacksySectionComponent, { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] } })
      .compileComponents();
  });

  it('renders its rows and cards in the original order with their Klacksy targets', () => {
    const fixture = TestBed.createComponent(SettingsKlacksySectionComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(Array.from(root.querySelectorAll('[id]')).map((element) => element.id)).toEqual(EXPECTED_IDS);
    root.querySelectorAll('.container-profilline > [id]').forEach((card) => {
      expect(card.getAttribute('data-klacksy-route')).toBe('/workplace/settings');
      expect(card.getAttribute('data-klacksy-target')).toBeTruthy();
    });
  });

  it('hides the cards whose endpoints the playground blocks while the playground limit is active', () => {
    TestBed.inject(PlaygroundDeviceService).applyStatus({ limitActive: true, deviceToken: null });
    const fixture = TestBed.createComponent(SettingsKlacksySectionComponent);
    fixture.detectChanges();
    const ids = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[id]')).map((element) => element.id);

    expect(ids).toEqual([
      'settings-home-assistant-speech-row',
      'settings-assistant-speech',
      'settings-home-whisper-plugin-row',
      'settings-whisper-plugin',
      'settings-home-klacksy-autonomy-row',
      'settings-klacksy-autonomy',
    ]);
  });
});
