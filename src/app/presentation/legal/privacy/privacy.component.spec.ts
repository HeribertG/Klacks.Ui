// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
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

  describe('playground passage', () => {
    afterEach(() => localStorage.removeItem(StorageKeys.PLAYGROUND_DEVICE_TOKEN));

    it('is not rendered while the playground token limit is inactive', () => {
      // Arrange
      const fixture = TestBed.createComponent(PrivacyComponent);

      // Act
      fixture.detectChanges();

      // Assert
      expect(fixture.nativeElement.querySelector('.legal-playground')).toBeNull();
    });

    it('is rendered as a separate block next to the general text while the limit is active', () => {
      // Arrange
      TestBed.inject(PlaygroundDeviceService).applyStatus({ limitActive: true, deviceToken: 'token' });
      const fixture = TestBed.createComponent(PrivacyComponent);

      // Act
      fixture.detectChanges();

      // Assert
      const blocks = fixture.nativeElement.querySelectorAll('.legal-content');
      expect(blocks.length).toBe(2);
      expect(fixture.nativeElement.querySelector('.legal-playground')).not.toBeNull();
    });
  });
});
