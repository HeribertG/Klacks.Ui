// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Messenger identity types - mirror of Klacks.Plugin.Messaging.Domain.Enums.MessengerType.
 * Distinct from CommunicationTypeEnum (phone/email) - lives in the messaging plugin.
 */
export enum MessengerType {
  Telegram = 1,
  WhatsApp = 2,
  Signal = 3,
  Threema = 4,
  Viber = 5,
  Line = 6,
  KakaoTalk = 7,
  WeChat = 8,
  Zalo = 9,
  MicrosoftTeams = 10,
  Slack = 11,
  Sms = 12,
}

export const MESSENGER_TYPE_LABELS: Record<MessengerType, string> = {
  [MessengerType.Telegram]: 'Telegram',
  [MessengerType.WhatsApp]: 'WhatsApp',
  [MessengerType.Signal]: 'Signal',
  [MessengerType.Threema]: 'Threema',
  [MessengerType.Viber]: 'Viber',
  [MessengerType.Line]: 'LINE',
  [MessengerType.KakaoTalk]: 'KakaoTalk',
  [MessengerType.WeChat]: 'WeChat',
  [MessengerType.Zalo]: 'Zalo',
  [MessengerType.MicrosoftTeams]: 'Microsoft Teams',
  [MessengerType.Slack]: 'Slack',
  [MessengerType.Sms]: 'SMS',
};
