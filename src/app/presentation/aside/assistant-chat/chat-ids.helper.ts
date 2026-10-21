// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Client-side id generators for the assistant chat: local message ids and the conversation id a
 * fresh chat starts with before the backend confirms its own.
 */

const MESSAGE_ID_PREFIX = 'msg_';
const CONVERSATION_ID_PREFIX = 'conv_';
const ID_SEPARATOR = '_';
const RANDOM_RADIX = 36;
const RANDOM_START = 2;
const RANDOM_LENGTH = 9;

function randomSuffix(): string {
  return Math.random().toString(RANDOM_RADIX).slice(RANDOM_START, RANDOM_START + RANDOM_LENGTH);
}

export function createChatMessageId(): string {
  return MESSAGE_ID_PREFIX + Date.now() + ID_SEPARATOR + randomSuffix();
}

export function createConversationId(): string {
  return CONVERSATION_ID_PREFIX + Date.now() + ID_SEPARATOR + randomSuffix();
}
