export const normalizeDomainInput = (value: string) =>
  value
    .split(/[\n,]/)
    .map((site) =>
      site
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "")
        .toLowerCase()
    )
    .filter(Boolean);

export const hostnameFromUrl = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

export const domainMatches = (hostname: string, rule: string) =>
  hostname === rule || hostname.endsWith(`.${rule}`);
