// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

describe('ThemeService', () => {
  let mockLocalStorageService: any;
  let store: Record<string, string>;
  let matchMediaSpy: any;

  function configureMatchMedia(prefersDark: boolean): void {
    matchMediaSpy = vi.fn().mockReturnValue({ matches: prefersDark });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: matchMediaSpy,
    });
  }

  beforeEach(() => {
    store = {};
    mockLocalStorageService = {
      get: vi.fn((key: string) => store[key] ?? null),
      set: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: LocalStorageService, useValue: mockLocalStorageService },
      ],
    });
  });

  it('applies and persists the browser dark-mode preference on first run', () => {
    configureMatchMedia(true);

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(mockLocalStorageService.set).toHaveBeenCalledWith('theme', 'dark');
  });

  it('defaults to light on first run when the browser has no dark-mode preference', () => {
    configureMatchMedia(false);

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(mockLocalStorageService.set).toHaveBeenCalledWith('theme', 'light');
  });

  it('does not re-evaluate the browser preference once a theme is already stored', () => {
    configureMatchMedia(true);
    store['theme'] = 'light';

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(mockLocalStorageService.set).not.toHaveBeenCalled();
  });

  it('setTheme overrides the stored preference and updates the DOM attribute', () => {
    configureMatchMedia(false);
    const service = TestBed.inject(ThemeService);

    service.setTheme('oled');

    expect(service.theme()).toBe('oled');
    expect(document.documentElement.getAttribute('data-theme')).toBe('oled');
    expect(mockLocalStorageService.set).toHaveBeenCalledWith('theme', 'oled');
  });
});
