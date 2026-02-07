import { Pipe, PipeTransform } from '@angular/core';
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';

@Pipe({
  name: 'fallback',
  standalone: true,
})
export class FallbackPipe implements PipeTransform {
  transform(
    source: IMultiLanguage | unknown | undefined,
    language: string
  ): string {
    return getLocalizedValue(source as IMultiLanguage, language);
  }
}
