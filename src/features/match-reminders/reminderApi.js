import { platformRequest } from '../auth/platformApi.js'
export const fetchMatchReminders = signal => platformRequest('/me/match-reminders', { signal })
export const saveMatchReminders = preference => platformRequest('/me/match-reminders', { method: 'PATCH', body: preference })
export const sendReminderTest = () => platformRequest('/me/match-reminders/test', { method: 'POST', body: {} })
