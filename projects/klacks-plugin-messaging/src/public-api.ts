// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Public API surface of the klacks-plugin-messaging library.
 */

// Components
export { MessagingHomeComponent } from './lib/components/messaging-home/messaging-home.component';
export { MessagingChatComponent } from './lib/components/messaging-chat/messaging-chat.component';
export { MessagingNavComponent } from './lib/components/messaging-nav/messaging-nav.component';

// Settings
export { MessagingProvidersComponent } from './lib/settings/messaging-providers/messaging-providers.component';
export { MessagingInboxComponent } from './lib/settings/messaging-inbox/messaging-inbox.component';

// Models
export { Message } from './lib/models/message.model';
export { MessagingProvider } from './lib/models/messaging-provider.model';
export { IncomingMessage } from './lib/models/incoming-message.model';
export { MessageDirection } from './lib/enums/message-direction.enum';
export { MessageStatus } from './lib/enums/message-status.enum';

// Services
export { DataMessagingService } from './lib/services/data-messaging.service';

// Routes
export { MESSAGING_ROUTES } from './lib/messaging.routes';
