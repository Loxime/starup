import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function isPrivateIp(
  address: string
): boolean {
  const version = isIP(address);

  if (version === 4) {
    const parts = address
      .split(".")
      .map(Number);

    const [a, b] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 &&
        b >= 16 &&
        b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (version === 6) {
    const normalized =
      address.toLowerCase();

    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return false;
}

export async function validateTargetUrl(
  rawUrl: string,
  allowPrivateTargets: boolean
): Promise<URL> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(
      "Invalid monitor URL"
    );
  }

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "Only HTTP and HTTPS URLs are allowed"
    );
  }

  if (allowPrivateTargets) {
    return url;
  }

  const addresses = await lookup(
    url.hostname,
    {
      all: true
    }
  );

  if (addresses.length === 0) {
    throw new Error(
      "Unable to resolve monitor hostname"
    );
  }

  if (
    addresses.some(({ address }) =>
      isPrivateIp(address)
    )
  ) {
    throw new Error(
      "Private or loopback network targets are not allowed"
    );
  }

  return url;
}
