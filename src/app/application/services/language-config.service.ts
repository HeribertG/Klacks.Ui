// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service loading the installation-wide language configuration from the backend.
 * Exposes supported languages, fallback order, per-language metadata and the
 * installation default UI language (client fallback: FALLBACK_DEFAULT_LANGUAGE).
 */
import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataLanguageConfigService } from 'src/app/infrastructure/api/settings/data-language-config.service';
import { LanguageMetadata } from 'src/app/domain/models/settings/language-config';
import { ILanguageConfig } from 'src/app/domain/interfaces/language-config.interface';
import { DomainMessages } from 'src/app/domain/constants/messages';

@Injectable({ providedIn: 'root' })
export class LanguageConfigService implements ILanguageConfig {
  static readonly CORE_LANGUAGES = ['de', 'en', 'fr', 'it'];
  static readonly FALLBACK_DEFAULT_LANGUAGE = DomainMessages.DEFAULT_LANG;
  private static readonly DEFAULT_SUPPORTED_LANGUAGES = ['de', 'en', 'fr', 'it'];
  private static readonly DEFAULT_FALLBACK_ORDER = ['de', 'fr', 'it', 'en'];

  private dataService = inject(DataLanguageConfigService);

  private supportedLanguages = signal<string[]>([...LanguageConfigService.DEFAULT_SUPPORTED_LANGUAGES]);
  private fallbackOrder = signal<string[]>([...LanguageConfigService.DEFAULT_FALLBACK_ORDER]);
  private defaultLanguage = signal<string>(LanguageConfigService.FALLBACK_DEFAULT_LANGUAGE);
  private metadata = signal<Record<string, LanguageMetadata>>({});
  private loaded = signal<boolean>(false);

  readonly supportedLanguages$ = this.supportedLanguages.asReadonly();
  readonly fallbackOrder$ = this.fallbackOrder.asReadonly();
  readonly defaultLanguage$ = this.defaultLanguage.asReadonly();
  readonly metadata$ = this.metadata.asReadonly();
  readonly loaded$ = this.loaded.asReadonly();

  loadConfig(): Promise<void> {
    return firstValueFrom(this.dataService.getLanguageConfig())
      .then((response) => {
        this.supportedLanguages.set(response.supportedLanguages);
        this.fallbackOrder.set(response.fallbackOrder);
        this.defaultLanguage.set(response.defaultLanguage || LanguageConfigService.FALLBACK_DEFAULT_LANGUAGE);
        this.metadata.set(response.metadata ?? {});
        this.loaded.set(true);
      })
      .catch((error) => {
        console.error('LanguageConfigService: failed to load language config, falling back to core languages', error);
        this.loaded.set(true);
      });
  }

  getFallbackOrder(): string[] {
    return this.fallbackOrder();
  }

  getSupportedLanguages(): string[] {
    return this.supportedLanguages();
  }

  getDefaultLanguage(): string {
    return this.defaultLanguage();
  }

  getMetadata(): Record<string, LanguageMetadata> {
    return this.metadata();
  }

  getLanguageMetadata(langCode: string): LanguageMetadata | undefined {
    return this.metadata()[langCode];
  }

  getSpeechLocale(langCode: string): string {
    return this.metadata()[langCode]?.speechLocale ?? 'en-GB';
  }

  getDisplayName(langCode: string): string {
    return this.metadata()[langCode]?.displayName ?? langCode.toUpperCase();
  }

  isLanguageSupported(langCode: string): boolean {
    return this.supportedLanguages().includes(langCode);
  }

  isCoreLanguage(langCode: string): boolean {
    return LanguageConfigService.CORE_LANGUAGES.includes(langCode);
  }

  async reloadConfig(): Promise<void> {
    return this.loadConfig();
  }
}
