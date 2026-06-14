export interface ArLinkValidationResult {
  valid: boolean;
  statusCode: number;
  attempt: 1 | 2;
  message: string;
}

async function tryFetch(url: string, method: "HEAD" | "GET"): Promise<{ ok: boolean; status: number } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method, signal: controller.signal });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch {
    return null;
  }
}

export async function validateArLink(url: string): Promise<ArLinkValidationResult> {
  const head = await tryFetch(url, "HEAD");
  if (head?.ok) {
    return { valid: true, statusCode: head.status, attempt: 1, message: "Link verified" };
  }

  const get = await tryFetch(url, "GET");
  if (get?.ok) {
    return { valid: true, statusCode: get.status, attempt: 2, message: "Link verified (GET fallback)" };
  }

  const statusCode = get?.status ?? head?.status ?? 0;
  return {
    valid: false,
    statusCode,
    attempt: 2,
    message: statusCode === 0 ? "Network error or timeout" : `Server returned ${statusCode}`,
  };
}
