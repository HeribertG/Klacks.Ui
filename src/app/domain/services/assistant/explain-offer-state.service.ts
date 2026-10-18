// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Per-account state of the UI explain offers (T5). Asks the backend once per signed-in user and topic whether the
 * offer may be shown (the backend owns the dosage: setting, kill switch, beginner level, the user's mute) and keeps the
 * answer for the session; a reaction is sent fire-and-forget and closes the topic for the rest of the session. Several
 * people sign in on one office PC, so everything is keyed by the signed-in user id. Fail-closed: no user, an older
 * backend without the endpoint (404) or any other failure means "do not offer" this time; a failed read is not kept, so
 * the next trigger asks again (unless a reaction closed the topic meanwhile).
 * @param dataExplainOffer - HTTP API of the explain offers
 * @param localStorage - Source of the signed-in user id
 */

import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataExplainOfferService } from 'src/app/infrastructure/api/assistant/data-explain-offer.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { ExplainOfferOutcome, ExplainOfferTopic } from 'src/app/domain/constants/explain-offer.constants';

const CACHE_KEY_SEPARATOR = '|';

@Injectable({ providedIn: 'root' })
export class ExplainOfferStateService {
  private readonly dataExplainOffer = inject(DataExplainOfferService);
  private readonly localStorage = inject(LocalStorageService);

  private readonly answers = new Map<string, Promise<boolean>>();

  currentUserId(): string | null {
    try {
      const userId = this.localStorage.get(StorageKeys.TOKEN_USERID);
      return userId ? userId : null;
    } catch {
      return null;
    }
  }

  shouldOffer(topic: ExplainOfferTopic): Promise<boolean> {
    const userId = this.currentUserId();
    if (!userId) {
      return Promise.resolve(false);
    }

    const key = this.cacheKey(userId, topic);
    const cached = this.answers.get(key);
    if (cached) {
      return cached;
    }

    const answer: Promise<boolean> = firstValueFrom(this.dataExplainOffer.getState(topic))
      .then((state) => state?.shouldOffer === true)
      .catch(() => {
        if (this.answers.get(key) === answer) {
          this.answers.delete(key);
        }
        return false;
      });
    this.answers.set(key, answer);
    return answer;
  }

  record(topic: ExplainOfferTopic, outcome: ExplainOfferOutcome): void {
    const userId = this.currentUserId();
    if (!userId) {
      return;
    }

    this.answers.set(this.cacheKey(userId, topic), Promise.resolve(false));
    this.dataExplainOffer.recordReaction(topic, outcome).subscribe({ error: () => undefined });
  }

  private cacheKey(userId: string, topic: ExplainOfferTopic): string {
    return userId + CACHE_KEY_SEPARATOR + topic;
  }
}
