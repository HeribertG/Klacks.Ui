// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { KlacksyTrainingSynonymEditorComponent } from './klacksy-training-synonym-editor.component';
import { DataKlacksyTrainingService } from '../../../../infrastructure/api/klacksy-training/data-klacksy-training.service';

describe('KlacksyTrainingSynonymEditorComponent', () => {
  let fixture: ComponentFixture<KlacksyTrainingSynonymEditorComponent>;
  let service: { updateSynonyms: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { updateSynonyms: vi.fn().mockReturnValue(of(true)) };
    TestBed.configureTestingModule({
      imports: [KlacksyTrainingSynonymEditorComponent, FormsModule, TranslateModule.forRoot()],
      providers: [{ provide: DataKlacksyTrainingService, useValue: service }]
    });
    fixture = TestBed.createComponent(KlacksyTrainingSynonymEditorComponent);
    fixture.componentRef.setInput('target', { targetId: 't', route: '/', labelKey: 'l', synonyms: { de: ['one'] }, synonymStatus: 'generated', obsolete: false });
    fixture.componentRef.setInput('locale', 'de');
    fixture.detectChanges();
  });

  it('saves synonyms with given status', () => {
    (fixture.componentInstance as unknown as { save: (s: string) => void }).save('reviewed');
    expect(service.updateSynonyms).toHaveBeenCalledWith('t', 'de', ['one'], 'reviewed');
  });
});
