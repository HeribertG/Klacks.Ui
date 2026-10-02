// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { ClientImportCardComponent } from './client-import-card.component';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

describe('ClientImportCardComponent', () => {
  let fixture: ComponentFixture<ClientImportCardComponent>;
  let navigationService: { navigateToClientImport: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    navigationService = { navigateToClientImport: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ClientImportCardComponent, TranslateModule.forRoot()],
      providers: [{ provide: NavigationService, useValue: navigationService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientImportCardComponent);
    fixture.detectChanges();
  });

  it('renders the open button', () => {
    const button = fixture.nativeElement.querySelector('#settings-client-import-open');

    expect(button).not.toBeNull();
  });

  it('opens the import page when the button is clicked', () => {
    fixture.nativeElement.querySelector('#settings-client-import-open').click();

    expect(navigationService.navigateToClientImport).toHaveBeenCalledTimes(1);
  });
});
