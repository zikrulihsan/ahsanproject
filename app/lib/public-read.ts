export type PublicReadResult<T> = {
  value: T;
  unavailable: boolean;
};

/**
 * Public discovery pages should remain usable when one optional data source
 * has a transient failure. The error still reaches deploy logs for diagnosis,
 * while callers render an honest temporary-data state instead of a 500 page.
 */
export async function readPublicly<T>(
  label: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<PublicReadResult<T>> {
  try {
    return { value: await read(), unavailable: false };
  } catch (error) {
    console.error(`[ahsan] Data publik "${label}" gagal dimuat; memakai fallback.`, error);
    return { value: fallback, unavailable: true };
  }
}
