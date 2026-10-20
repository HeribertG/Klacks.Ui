// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClientImportManualComponent } from './client-import-manual.component';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';

const MANUAL_NAME = 'client-import-manual';

describe('ClientImportManualComponent', () => {
  let fixture: ComponentFixture<ClientImportManualComponent>;
  let loader: { loadManual: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    loader = { loadManual: vi.fn().mockReturnValue(of('<h2>Import Manual</h2>')) };
    TestBed.configureTestingModule({
      imports: [ClientImportManualComponent, TranslateModule.forRoot()],
      providers: [{ provide: ManualLoaderService, useValue: loader }],
    });
    fixture = TestBed.createComponent(ClientImportManualComponent);
    fixture.detectChanges();
  });

  it('loads the client import manual on init and renders it', () => {
    expect(loader.loadManual).toHaveBeenCalledWith(MANUAL_NAME, expect.any(String));
    const content = fixture.nativeElement.querySelector('#client-import-manual-content');
    expect(content.innerHTML).toContain('Import Manual');
  });

  it('reloads the manual in the new language when the UI language changes', () => {
    const translate = TestBed.inject(TranslateService);

    translate.use('fr');

    expect(loader.loadManual).toHaveBeenLastCalledWith(MANUAL_NAME, 'fr');
  });
});
