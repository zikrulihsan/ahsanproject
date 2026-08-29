const REQUEST_BUDGET_MS = 4_500;
const FIRST_ATTEMPT_MS = 2_800;
const RETRY_ATTEMPT_MS = 1_600;
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function requestSignal(input: RequestInfo | URL, init?: RequestInit): AbortSignal | null {
  if (init?.signal) return init.signal;
  if (typeof Request !== "undefined" && input instanceof Request) return input.signal;
  return null;
}

function timeoutError(): Error {
  const error = new Error("Supabase did not respond before the timeout.");
  error.name = "TimeoutError";
  return error;
}

/**
 * Keeps a slow upstream read from holding an App Router stream open forever.
 *
 * GET/HEAD requests get one retry for a network failure or a temporary 5xx.
 * Mutations are bounded by the same timeout, but never replayed: repeating a
 * write after an ambiguous connection failure could create duplicate work.
 */
export async function resilientSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = requestMethod(input, init);
  const maxAttempts = method === "GET" || method === "HEAD" ? 2 : 1;
  const sourceSignal = requestSignal(input, init);
  const deadline = Date.now() + REQUEST_BUDGET_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (sourceSignal?.aborted) throw sourceSignal.reason;

    const remaining = deadline - Date.now();
    if (remaining <= 0) throw lastError ?? timeoutError();

    const attemptLimit = attempt === 0 ? FIRST_ATTEMPT_MS : RETRY_ATTEMPT_MS;
    const controller = new AbortController();
    const forwardAbort = () => controller.abort(sourceSignal?.reason);
    sourceSignal?.addEventListener("abort", forwardAbort, { once: true });
    const timer = setTimeout(() => controller.abort(timeoutError()), Math.min(attemptLimit, remaining));

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      const shouldRetry =
        attempt + 1 < maxAttempts && RETRYABLE_STATUS.has(response.status);

      if (!shouldRetry) return response;
      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      lastError = error;
      if (sourceSignal?.aborted || attempt + 1 >= maxAttempts) throw error;
    } finally {
      clearTimeout(timer);
      sourceSignal?.removeEventListener("abort", forwardAbort);
    }
  }

  throw lastError ?? timeoutError();
}
