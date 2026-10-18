// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the "Why? Ask Klacksy" link in the toast of a refused work booking (T5 part b).
 * @param ASK_KLACKSY_KEY - Label of the toast action
 * @param TRIGGER_PHRASE_KEY - Question sent as the user's chat message; placeholders client, date and shift. Every
 *   language carries a synonym of diagnose_work_booking verbatim, so the keyword guarantee puts the diagnosis into
 *   the toolset
 * @param CLIENT_WITH_NUMBER_KEY - Person label with the employee number (placeholders name and number), used as the
 *   client of the question when the person has a number, so two people of the same name are told apart
 * @param MAX_NAME_LENGTH - Longest person or shift name kept in the question (see sanitizeChatPhraseValue)
 * @param SINGLE_BOOKING_METHOD / SINGLE_BOOKING_PATH - Only the single booking (POST to Works/) knows person, day and
 *   shift of the refused cell; bulk, reassign and edit requests get no link (owner decision F5, 2026-10-18)
 */
export const WORK_REFUSAL_EXPLAIN = {
  ASK_KLACKSY_KEY: 'schedule.workConflict.askKlacksy',
  TRIGGER_PHRASE_KEY: 'schedule.workConflict.whyTriggerPhrase',
  CLIENT_WITH_NUMBER_KEY: 'schedule.workConflict.clientWithNumber',
  MAX_NAME_LENGTH: 80,
  SINGLE_BOOKING_METHOD: 'POST',
  SINGLE_BOOKING_PATH: '/Works/',
} as const;
