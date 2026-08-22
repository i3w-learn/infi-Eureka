/**
 * The logo lockup: the i3w mark plus the product name.
 *
 * Defined once because it appears in five places that are easy to let drift —
 * the landing page, the login/signup pages, the sidebar, the phone top bar,
 * and the exam header.
 */
type BrandSize = 'sm' | 'md' | 'lg';

const SIZES: Record<BrandSize, { mark: string; word: string }> = {
  sm: { mark: 'h-7', word: 'text-[1.2rem]' },
  md: { mark: 'h-10', word: 'text-[1.42rem]' },
  lg: { mark: 'h-12', word: 'text-[1.6rem]' },
};

export function BrandMark({ size = 'md' }: { size?: BrandSize }) {
  const { mark, word } = SIZES[size];
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <img src="/i3w-mark.png" alt="" aria-hidden="true" className={`${mark} w-auto shrink-0`} />
      <span className={`truncate font-display font-extrabold tracking-tight ${word}`}>
        infi<span className="text-marigold">-</span>Eureka
      </span>
    </span>
  );
}
