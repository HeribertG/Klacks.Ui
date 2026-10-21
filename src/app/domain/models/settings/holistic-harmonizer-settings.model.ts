// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IHolisticHarmonizerSettings } from './holistic-harmonizer-settings.interface';
import {
  HOLISTIC_HARMONIZER_MODE,
  HolisticHarmonizerMode,
} from 'src/app/domain/constants/holistic-harmonizer-mode.constants';

export class HolisticHarmonizerSettings implements IHolisticHarmonizerSettings {
  mode: HolisticHarmonizerMode = HOLISTIC_HARMONIZER_MODE.deterministic;
  llmModelId = '';
}
