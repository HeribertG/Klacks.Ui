import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataTranslationService } from 'src/app/infrastructure/api/data-translation.service';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private dataTranslationService = inject(DataTranslationService);

  private _isConfigured = signal<boolean | null>(null);
  private _isLoading = signal(false);

  get isConfigured(): boolean | null {
    return this._isConfigured();
  }

  get isLoading(): boolean {
    return this._isLoading();
  }

  async checkStatus(): Promise<boolean> {
    try {
      const status = await firstValueFrom(
        this.dataTranslationService.getStatus(),
      );
      this._isConfigured.set(status);
      return status;
    } catch {
      this._isConfigured.set(false);
      return false;
    }
  }

  async translateToMultiLanguage(
    text: string,
    sourceLanguage: string,
  ): Promise<MultiLanguage | null> {
    if (!text?.trim()) {
      return null;
    }

    this._isLoading.set(true);

    try {
      const response = await firstValueFrom(
        this.dataTranslationService.translateToAll(text, sourceLanguage),
      );

      const multiLang = new MultiLanguage();
      multiLang.de = response.de;
      multiLang.en = response.en;
      multiLang.fr = response.fr;
      multiLang.it = response.it;

      return multiLang;
    } catch (error) {
      console.error('Translation failed:', error);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async translateField(
    currentValue: MultiLanguage | undefined,
    sourceLanguage: string,
  ): Promise<MultiLanguage | null> {
    if (!currentValue) {
      return null;
    }

    const sourceText = currentValue[sourceLanguage as keyof MultiLanguage];
    if (!sourceText?.trim()) {
      return null;
    }

    return this.translateToMultiLanguage(sourceText, sourceLanguage);
  }
}
