/** Dollar formatter — returns '—' for null/undefined, '$0' for zero. */
export function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Triage score → badge class */
export function scoreClass(s: number | null | undefined): string {
  if (!s) return 'pv-badge-gray';
  if (s >= 8) return 'pv-badge-green';
  if (s >= 6) return 'pv-badge-gold';
  return 'pv-badge-red';
}

/** Win probability → badge class */
export function winClass(p: number): string {
  return p >= 70 ? 'pv-badge-green' : p >= 40 ? 'pv-badge-gold' : 'pv-badge-red';
}

/** Win probability → inline CSS color value */
export function winColor(p: number): string {
  return p >= 70 ? 'var(--pv-success)' : p >= 40 ? 'var(--pv-warning)' : 'var(--pv-danger)';
}

/** Quote recommendation → badge class */
export function recClass(r: string): string {
  if (r === 'AWARD' || r === 'PROCEED') return 'pv-badge-green';
  if (r === 'CLARIFY') return 'pv-badge-gold';
  if (r === 'REJECT') return 'pv-badge-red';
  return 'pv-badge-gray';
}

export const SOLICITATION_STATUS_BADGE: Record<string, string> = {
  AWARDED: 'pv-badge-green',
  REJECTED: 'pv-badge-red',
  READY_FOR_SOURCING: 'pv-badge-gold',
  SOURCING_IN_PROGRESS: 'pv-badge-blue',
  TRIAGE_COMPLETE: 'pv-badge-navy',
  PENDING_TRIAGE: 'pv-badge-gray',
  PROPOSAL_DRAFT: 'pv-badge-blue',
  SUBMITTED: 'pv-badge-blue',
  PRICING_PENDING: 'pv-badge-gold',
};

export const OUTREACH_STATUS_BADGE: Record<string, string> = {
  PENDING: 'pv-badge-gray',
  SENT: 'pv-badge-blue',
  OPENED: 'pv-badge-gold',
  CLICKED: 'pv-badge-navy',
  SUBMITTED: 'pv-badge-green',
  BOUNCED: 'pv-badge-red',
  OPT_OUT: 'pv-badge-gray',
};
