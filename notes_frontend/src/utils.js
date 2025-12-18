 // PUBLIC_INTERFACE
export function cx(...args) {
  /** Merge class names conditionally. */
  return args.filter(Boolean).join(' ');
}

// PUBLIC_INTERFACE
export function formatDate(iso) {
  /** Format ISO timestamp into a friendly string. */
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}
