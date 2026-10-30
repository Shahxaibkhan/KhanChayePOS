// Shared by the client picker (browser) and findOrCreateClient (server) so
// "Dollar Shop", "dollarshop", and "DOLLAR-SHOP" are all recognized as the
// same client instead of spawning near-duplicate entries.
export function normalizeClientName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}
