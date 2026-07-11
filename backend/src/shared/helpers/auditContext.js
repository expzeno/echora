import { als } from '../../lib/audit.js';

export function runWithAuditContext(profileType, profileId, fn) {
  return als.run({ profileType, profileId }, fn);
}

export function getAuditContext() {
  return als.getStore() ?? { profileType: 'system', profileId: null };
}
