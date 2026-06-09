/**
 * Shared footer overflow rule for device cards.
 *
 * Positional, not semantic: the first `maxInline` actions render inline; once
 * the list exceeds that, the remainder collapses into the 3-dot overflow. The
 * 3-dot only appears when there are more actions than fit inline.
 */

/** Inline footer-action budget before the 3-dot kicks in. */
export const MAX_INLINE_FOOTER_ACTIONS = 3;

export interface FooterActionSplit<T> {
  inline: T[];
  overflow: T[];
  hasOverflow: boolean;
}

/**
 * Split an ordered action list into the inline run and the overflow tail.
 * `hasOverflow` is true only when the list is longer than `maxInline`, so the
 * caller renders the 3-dot exclusively when there is something to tuck away.
 */
export function splitFooterActions<T>(
  actions: T[],
  maxInline = MAX_INLINE_FOOTER_ACTIONS,
): FooterActionSplit<T> {
  if (actions.length <= maxInline) {
    return { inline: actions, overflow: [], hasOverflow: false };
  }
  return {
    inline: actions.slice(0, maxInline),
    overflow: actions.slice(maxInline),
    hasOverflow: true,
  };
}
