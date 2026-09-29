type ParamValue = string | number | boolean | null | undefined;

/**
 * Builds a URL the way Expo Router's `{ pathname, params }` objects did:
 * `[segment]` placeholders are filled from params and the rest become the
 * query string.
 */
export function href(
  pathname: string,
  params: Record<string, ParamValue> = {},
): string {
  const rest = { ...params };
  const path = pathname.replace(/\[([^\]]+)\]/g, (_, key: string) => {
    const value = rest[key];
    delete rest[key];
    return encodeURIComponent(String(value ?? ''));
  });
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue;
    query.set(key, String(value));
  }
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}
