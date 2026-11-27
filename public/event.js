import { config } from './content.js';

// Explicit Argentine UTC offset, independent of the device/server timezone.
export const eventEndsAt = '2026-11-27T22:00:00-03:00';
export const eventEndTime = Date.parse(eventEndsAt);
export const eventClosed = (now = Date.now()) => now >= eventEndTime;
export const eventStatus = (now = Date.now()) => ({
  closed: eventClosed(now), endsAt: eventEndsAt, serverTime: now,
  contactUrl: config.contactUrl || config.officialUrl,
});
