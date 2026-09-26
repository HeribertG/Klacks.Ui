// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from 'src/app/presentation/auth/auth.service';
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
});
