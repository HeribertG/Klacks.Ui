// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import {
  SOURCE_CODE_API_REPOSITORY_URL,
  SOURCE_CODE_UI_REPOSITORY_URL,
} from 'src/app/domain/constants/source-code.constants';
import { ImprintComponent } from './imprint.component';

describe('ImprintComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImprintComponent, TranslateModule.forRoot()],
      providers: [provideRouter([]), { provide: AuthService, useValue: { authenticated: () => false } }],
    }).compileComponents();
  });

  it('closes the page through the shared close button instead of a fixed link to the login page', () => {
    // Arrange
    const fixture = TestBed.createComponent(ImprintComponent);

    // Act
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    // Assert
    expect(element.querySelector('app-legal-back-button')).not.toBeNull();
    expect(element.querySelector('[href="/login"]')).toBeNull();
  });

  it('offers the AGPL-3.0 source code of server and web client', () => {
    // Arrange
    const fixture = TestBed.createComponent(ImprintComponent);

    // Act
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const apiLink = element.querySelector<HTMLAnchorElement>('#imprint-source-code-api-link');
    const uiLink = element.querySelector<HTMLAnchorElement>('#imprint-source-code-ui-link');

    // Assert
    expect(apiLink?.getAttribute('href')).toBe(SOURCE_CODE_API_REPOSITORY_URL);
    expect(uiLink?.getAttribute('href')).toBe(SOURCE_CODE_UI_REPOSITORY_URL);
    expect(apiLink?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
