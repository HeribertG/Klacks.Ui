// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AssistantSpeechSettingsComponent } from './assistant-speech-settings.component';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataSttService } from 'src/app/infrastructure/api/assistant/data-stt.service';
import { DataTtsService } from 'src/app/infrastructure/api/assistant/data-tts.service';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import {
  DataTranscriptionDictionaryService,
  DictionaryEntry,
} from 'src/app/infrastructure/api/assistant/data-transcription-dictionary.service';

function makeEntry(over: Partial<DictionaryEntry> = {}): any {
  return {
    id: 'e1',
    correctTerm: 'Klacks',
    category: 'brand',
    phoneticVariants: ['klaks'],
    description: 'the product',
    language: 'de',
    ...over,
  };
}

// The component renders an ngx-slider whose ngOnDestroy crashes in jsdom, so it
// is instantiated directly in an injection context instead of via a fixture —
// the dictionary form() array only needs the injection context, not a view.
describe('AssistantSpeechSettingsComponent (dictionary Signal Forms array)', () => {
  let component: AssistantSpeechSettingsComponent;
  let mockDict: Partial<Record<keyof DataTranscriptionDictionaryService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockDict = {
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: AppSettingsManagementService,
          useValue: {
            speechSettings: signal({ sttApiKeys: {}, ttsApiKeys: {} } as any),
            loadSettingsAsync: vi.fn().mockResolvedValue(undefined),
            saveImmediately: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: ToastShowService, useValue: { showSuccess: vi.fn(), showError: vi.fn() } },
        { provide: DataSttService, useValue: { testConnection: vi.fn() } },
        { provide: DataTtsService, useValue: { getVoices: vi.fn().mockResolvedValue([]) } },
        {
          provide: DataAssistantService,
          useValue: { getModels: vi.fn(), checkSpeechModels: vi.fn() },
        },
        { provide: DataTranscriptionDictionaryService, useValue: mockDict },
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new AssistantSpeechSettingsComponent(),
    );
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('reflects a form edit in the model and preserves sibling fields', () => {
    component.dictionaryEntries.set([makeEntry()]);
    const form = component['dictForm'] as any;
    form[0].correctTerm().value.set('Klacksy');

    const entry = component.dictionaryEntries()[0];
    // (a) model reflects the edit
    expect(entry.correctTerm).toBe('Klacksy');
    // (b) unbound sibling fields survive the immutable update
    expect(entry.id).toBe('e1');
    expect(entry.category).toBe('brand');
    expect(entry.phoneticVariants).toEqual(['klaks']);
    expect(entry.description).toBe('the product');
    expect(entry.language).toBe('de');
  });

  it('persists the edited row read by index on save', async () => {
    component.dictionaryEntries.set([makeEntry()]);
    const form = component['dictForm'] as any;
    form[0].correctTerm().value.set('Klacksy');
    form[0].language().value.set('en');

    await component.updateDictionaryEntry(0);

    // (c) save payload carries the new values, read from the model by index
    expect(mockDict.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1', correctTerm: 'Klacksy', language: 'en' }),
    );
  });

  it('updates phonetic variants in the model by index without touching siblings', () => {
    component.dictionaryEntries.set([makeEntry()]);

    component.onVariantsChange(0, 'klaks, klax');

    const entry = component.dictionaryEntries()[0];
    expect(entry.phoneticVariants).toEqual(['klaks', 'klax']);
    expect(entry.correctTerm).toBe('Klacks');
  });

  it('supports variable-length removal via the model signal', async () => {
    component.dictionaryEntries.set([makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]);

    await component.deleteDictionaryEntry('e1');

    const ids = component.dictionaryEntries().map((e) => e.id);
    expect(ids).toEqual(['e2']);
  });
});
