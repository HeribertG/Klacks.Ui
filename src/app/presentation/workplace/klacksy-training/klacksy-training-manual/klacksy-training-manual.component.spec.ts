// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingManualComponent } from './klacksy-training-manual.component';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';

describe('KlacksyTrainingManualComponent', () => {
  let fixture: ComponentFixture<KlacksyTrainingManualComponent>;
  let loader: { loadManual: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    loader = { loadManual: vi.fn().mockReturnValue(of('<h2>Test Manual</h2>')) };
    TestBed.configureTestingModule({
      imports: [KlacksyTrainingManualComponent, TranslateModule.forRoot()],
      providers: [{ provide: ManualLoaderService, useValue: loader }]
    });
    fixture = TestBed.createComponent(KlacksyTrainingManualComponent);
    fixture.detectChanges();
  });

  it('loads manual on init', () => {
    expect(loader.loadManual).toHaveBeenCalledWith('klacksy-training-manual', expect.any(String));
    const content = fixture.nativeElement.querySelector('#klacksy-training-manual-content');
    expect(content.innerHTML).toContain('Test Manual');
  });
});
