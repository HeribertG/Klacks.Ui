import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataLanguageConfigService } from 'src/app/infrastructure/api/data-language-config.service';

@Injectable({ providedIn: 'root' })
export class LanguageConfigService {
  private dataService = inject(DataLanguageConfigService);

  private supportedLanguages = signal<string[]>(['de', 'en', 'fr', 'it']);
  private fallbackOrder = signal<string[]>(['de', 'fr', 'it', 'en']);
  private loaded = signal<boolean>(false);

  readonly supportedLanguages$ = this.supportedLanguages.asReadonly();
  readonly fallbackOrder$ = this.fallbackOrder.asReadonly();
  readonly loaded$ = this.loaded.asReadonly();

  loadConfig(): Promise<void> {
    return firstValueFrom(this.dataService.getLanguageConfig())
      .then(response => {
        this.supportedLanguages.set(response.supportedLanguages);
        this.fallbackOrder.set(response.fallbackOrder);
        this.loaded.set(true);
      })
      .catch(() => {
        this.loaded.set(true);
      });
  }

  getFallbackOrder(): string[] {
    return this.fallbackOrder();
  }

  getSupportedLanguages(): string[] {
    return this.supportedLanguages();
  }
}
