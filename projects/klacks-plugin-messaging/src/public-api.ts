// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Public API surface of the klacks-plugin-messaging library.
 */

// Components
export { MessagingHomeComponent } from './lib/components/messaging-home/messaging-home.component';
export { MessagingChatComponent } from './lib/components/messaging-chat/messaging-chat.component';
export { MessagingNavComponent } from './lib/components/messaging-nav/messaging-nav.component';
export { ClientMessengerContactsComponent } from './lib/components/client-messenger-contacts/client-messenger-contacts.component';

// Settings
export { MessagingProvidersComponent } from './lib/settings/messaging-providers/messaging-providers.component';
export { MessagingInboxComponent } from './lib/settings/messaging-inbox/messaging-inbox.component';
export { OwnerMessengersComponent } from './lib/settings/owner-messengers/owner-messengers.component';

// Models
export { Message } from './lib/models/message.model';
export { MessagingProvider } from './lib/models/messaging-provider.model';
export { IncomingMessage } from './lib/models/incoming-message.model';
export { OwnerMessengerEntry } from './lib/models/owner-messenger-entry.model';
export { MessengerContact, CreateMessengerContact } from './lib/models/messenger-contact.model';
export { MessageDirection } from './lib/enums/message-direction.enum';
export { MessageStatus } from './lib/enums/message-status.enum';
export { MessengerType, MESSENGER_TYPE_LABELS } from './lib/enums/messenger-type.enum';

// Services
export { DataMessagingService } from './lib/services/data-messaging.service';
export { DataOwnerMessengerService } from './lib/services/data-owner-messenger.service';
export { DataMessengerContactService } from './lib/services/data-messenger-contact.service';

// Routes
export { MESSAGING_ROUTES } from './lib/messaging.routes';
