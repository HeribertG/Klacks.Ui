// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Interface representing a qualification master entry.
 * @param id - Optional unique identifier
 * @param name - Localized qualification name
 * @param description - Optional localized description
 * @param emoji - Optional emoji symbol for the qualification
 * @param isTimeLimited - Whether the qualification expires over time
 */
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

export interface IQualification {
  id?: string;
  name: IMultiLanguage;
  description?: IMultiLanguage;
  emoji?: string;
  isTimeLimited: boolean;
}
