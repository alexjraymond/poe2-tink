// Pure helpers for reading and building PoE2 trade URLs.
// No DOM or chrome.* access here, so these are trivial to reason about and test.
//
// URL shape:
//   https://www.pathofexile.com/trade2/{search|exchange}/{realm}/{league}/{searchId?}
// e.g.
//   https://www.pathofexile.com/trade2/search/poe2/Standard
//   https://www.pathofexile.com/trade2/search/poe2/Standard/abc123
//   https://www.pathofexile.com/trade2/exchange/poe2/Hardcore/def456

import { REALM, type TradeLocation } from "./types";

const TRADE_PATH =
  /^\/trade2\/(search|exchange)\/([^/]+)\/([^/]+)(?:\/([^/]+))?/;

/**
 * Parse a full URL (or location.href) into a TradeLocation.
 * Returns null if the URL is not a recognizable PoE2 trade page.
 */
export function parseTradeLocation(href: string): TradeLocation | null {
  let pathname: string;
  try {
    pathname = new URL(href).pathname;
  } catch {
    return null;
  }

  const match = TRADE_PATH.exec(pathname);
  if (!match) return null;

  const [, kind, realm, league, searchId] = match;
  return {
    kind: kind as TradeLocation["kind"],
    realm,
    league: decodeURIComponent(league),
    searchId: searchId ? decodeURIComponent(searchId) : undefined,
  };
}

/** Build the canonical trade URL for a saved bookmark. */
export function buildTradeUrl(params: {
  kind: TradeLocation["kind"];
  league: string;
  searchId: string;
}): string {
  const { kind, league, searchId } = params;
  return `https://www.pathofexile.com/trade2/${kind}/${REALM}/${encodeURIComponent(
    league
  )}/${encodeURIComponent(searchId)}`;
}
