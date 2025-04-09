import { Pipe, PipeTransform } from '@angular/core';
import { IMultiLanguage } from '../../core/multi-language-class';

@Pipe({
  name: 'fallback',
  standalone: true,
})
export class FallbackPipe implements PipeTransform {
  transform(
    source: IMultiLanguage | unknown | undefined,
    language: string
  ): string | null {
    const ml = source as IMultiLanguage;
    if (ml) {
      return (
        [ml[language as keyof IMultiLanguage], ml.de, ml.fr, ml.it, ml.en].find(
          (x) => x || x === ''
        ) ?? null
      );
    }
    return null;
  }
}
