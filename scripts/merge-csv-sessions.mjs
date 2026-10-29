/* Incremental imports update stable session IDs and retain untouched sessions. */
export function mergeCsvSessions(existing, incoming, clubId) {
  const identities = new Set();
  for (const session of existing) {
    if (!session.id || identities.has(session.id.toLowerCase())) {
      throw new Error(
        `${clubId}: existing sessions need unique Session IDs before incremental import. Reconcile one complete club CSV first.`
      );
    }
    identities.add(session.id.toLowerCase());
  }
  const result = existing.map((session) => ({ ...session }));
  for (const session of incoming) {
    if (!session.id) throw new Error(`${clubId}: incremental session updates require Session IDs.`);
    const index = result.findIndex((current) => current.id.toLowerCase() === session.id.toLowerCase());
    if (index < 0) result.push({ ...session });
    else result[index] = { ...result[index], ...session, id: result[index].id };
  }
  return result;
}
