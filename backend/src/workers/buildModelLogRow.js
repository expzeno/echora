import { AUDIT_FIELDS } from './auditFields.js';

export function buildModelLogRow(raw) {
  const fields = AUDIT_FIELDS[raw.model] ?? [];
  const changed = raw.args?.data ? Object.keys(raw.args.data) : [];
  const loggable = changed.filter(f => fields.includes(f));

  const before = {};
  const after = {};
  for (const f of loggable) {
    if (raw.op !== 'create') before[f] = null;
    if (raw.op !== 'delete') after[f] = raw.args?.data?.[f] ?? null;
  }

  return {
    op: raw.op,
    docType: raw.model,
    docId: raw.result?.id ?? null,
    profileType: raw.profile.profileType,
    profileId: raw.profile.profileId,
    before: raw.op === 'create' ? null : JSON.stringify(before),
    after: raw.op === 'delete' ? null : JSON.stringify(after),
    at: new Date(raw.at),
  };
}
