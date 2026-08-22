/**
 * A grey bar standing in for content that is still on its way.
 *
 * Used only inside loading.tsx files, which is why it takes bare dimensions
 * instead of a class per shape — the shapes belong to the page being mimicked,
 * not to a system.
 */
export function Skeleton({
  height,
  width,
  round = false,
  style,
}: {
  height: number;
  width?: number | string;
  round?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="skeleton"
      aria-hidden="true"
      style={{
        borderRadius: round ? "50%" : undefined,
        display: "block",
        height,
        width: width ?? "100%",
        ...style,
      }}
    />
  );
}

/** What a screen reader hears while the bars are on show. */
export function LoadingNote() {
  return <p className="sr-only">Memuat…</p>;
}
