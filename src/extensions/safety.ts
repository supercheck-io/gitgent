import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { relative, resolve } from "node:path";

const BLOCKED_HOSTNAMES = new Set([
  "0.0.0.0",
  "::",
  "::1",
  "127.0.0.1",
  "169.254.169.254",
  "localhost",
  "metadata.google.internal",
]);

function getRepoRoot(): string {
  return process.env.GITGENT_REPO_ROOT || process.cwd();
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  if (octets[0] === 10) return true;
  if (octets[0] === 127) return true;
  if (octets[0] === 169 && octets[1] === 254) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;

  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1") return true;
  // ULA: fc00::/7
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // Link-local: fe80::/10 (fe80:: through febf::)
  if (normalized.startsWith("fe")) {
    const thirdChar = normalized.charAt(2);
    if ("89ab".includes(thirdChar)) return true;
  }
  // Multicast: ff00::/8
  if (normalized.startsWith("ff")) return true;
  return false;
}

function isPrivateIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

async function resolveAddresses(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];

  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export function resolveWorkspacePath(filePath: string): string {
  const repoRoot = getRepoRoot();
  const resolvedPath = resolve(repoRoot, filePath);
  const relPath = relative(repoRoot, resolvedPath);

  if (relPath.startsWith("..")) {
    throw new Error(`Path escapes repository root: "${filePath}"`);
  }

  return resolvedPath;
}

export function displayWorkspacePath(filePath: string): string {
  return relative(getRepoRoot(), filePath) || ".";
}

export async function assertSafeHttpUrl(rawUrl: string): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Strip IPv6 brackets for consistent matching (URL parser keeps them)
  const bareHostname = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  if (BLOCKED_HOSTNAMES.has(bareHostname) || bareHostname.endsWith(".local")) {
    throw new Error(`Blocked hostname: ${bareHostname}`);
  }

  // Check if hostname is a raw IP address (including IPv6)
  if (isIP(bareHostname) && isPrivateIp(bareHostname)) {
    throw new Error(`Blocked private network target: ${bareHostname}`);
  }

  const addresses = await resolveAddresses(bareHostname);
  if (addresses.some((address) => isPrivateIp(address))) {
    throw new Error(`Blocked private network target: ${bareHostname}`);
  }

  return parsedUrl;
}
