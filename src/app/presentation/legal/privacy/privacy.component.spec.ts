// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { PrivacyComponent } from './privacy.component';

describe('PrivacyComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyComponent, TranslateModule.forRoot()],
      providers: [provideRouter([]), { provide: AuthService, useValue: { authenticated: () => false } }],
    }).compileComponents();
  });

  it('closes the page through the shared close button instead of a fixed link to the login page', () => {
    // Arrange
    const fixture = TestBed.createComponent(PrivacyComponent);

    // Act
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    // Assert
    expect(element.querySelector('app-legal-back-button')).not.toBeNull();
    expect(element.querySelector('[href="/login"]')).toBeNull();
  });
});
