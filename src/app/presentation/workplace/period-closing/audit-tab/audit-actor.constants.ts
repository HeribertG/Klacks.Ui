// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Audit actor markers the backend writes into PerformedByName and the i18n key each is shown as.
 * AUTONOMOUS_ACTOR_NAME mirrors AuditActorDefaults.AutonomousActorName (Klacks.Api): the seal of the
 * autonomous period close is stored under this stable English marker and translated only for display.
 */

export const AUTONOMOUS_ACTOR_NAME = 'Klacksy (autonomous)';

export const AUTONOMOUS_ACTOR_LABEL_KEY = 'periodClosing.audit.autonomousActor';
