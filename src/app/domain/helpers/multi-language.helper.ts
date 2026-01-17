import { IMultiLanguage } from 'src/app/domain/models/multi-language-class';

export function getLocalizedValue(
  source: IMultiLanguage | undefined | null,
  language: string
): string {
  if (!source) {
    return '';
  }
  return (
    [source[language as keyof IMultiLanguage], source.de, source.fr, source.it, source.en].find(
      (x) => x || x === ''
    ) ?? ''
  );
}
