import {
  Card,
  currentRuleSet,
  currentTrumpSuit,
  GameState,
  legalCardsFor,
  NegativeHandType,
  PlayerIndex,
  rankValue,
  resolveTrick,
  RuleSet,
  Suit,
  TrumpSuit,
} from "rules-engine";
import { CardTracker, isMasterCard, nonDominatedLeads, opponentVoidCount, trackCards } from "./cardTracker";

/** Would playing `card` right now win the trick? Exact when `player` is last to act; a sound
 * heuristic signal otherwise. Reuses `resolveTrick` itself rather than reimplementing rank/trump
 * comparisons — the bot must never hand-roll legality or trick resolution. */
export function wouldCurrentlyWin(
  state: GameState,
  player: PlayerIndex,
  card: Card,
  trumpSuit: TrumpSuit,
  ruleSet: RuleSet,
): boolean {
  const hypothetical = [...state.currentTrick, { player, card }];
  return resolveTrick(hypothetical, trumpSuit, ruleSet) === player;
}

function lowestCard(cards: Card[], backwards: boolean): Card {
  return cards.reduce((best, c) =>
    rankValue(c.rank, backwards) < rankValue(best.rank, backwards) ? c : best,
  );
}

function highestCard(cards: Card[], backwards: boolean): Card {
  return cards.reduce((best, c) =>
    rankValue(c.rank, backwards) > rankValue(best.rank, backwards) ? c : best,
  );
}

function suitLength(hand: Card[], suit: Suit): number {
  return hand.filter((c) => c.suit === suit).length;
}

function groupBySuit(cards: Card[]): Map<Suit, Card[]> {
  const map = new Map<Suit, Card[]>();
  for (const card of cards) {
    const list = map.get(card.suit);
    if (list) list.push(card);
    else map.set(card.suit, [card]);
  }
  return map;
}

/**
 * How dangerous it is to be holding `card` in this negative hand type — used to prioritize what
 * to discard first when void and free to play anything. Higher means "discard sooner."
 */
function dangerScore(card: Card, handType: NegativeHandType): number {
  switch (handType) {
    case "noHearts":
      return card.suit === "H" ? 100 + card.rank : 0;
    case "noKingOfHearts":
      return card.suit === "H" && card.rank === 13 ? 1000 : 0;
    case "noGentlemen":
      return card.rank === 13 || card.rank === 11 ? 100 + card.rank : 0;
    case "noLady":
      return card.rank === 12 ? 100 + card.rank : 0;
    case "noTricks":
    case "noLastTwo":
      return card.rank;
  }
}

/**
 * The most dangerous card to be holding, among `cards`, for this negative hand type. Ties (most
 * commonly: none of `cards` belong to this hand type's danger category at all, e.g. following a
 * spade lead in "noLady" with no queens among the legal spades) break toward the lowest-ranked
 * card — falling back to the same "duck with minimum wasted value" behavior a plain `lowestCard`
 * pick would give, rather than an arbitrary card-array-order pick, whenever `dangerScore` itself
 * has no real signal to offer.
 */
function mostDangerous(cards: Card[], handType: NegativeHandType, backwards: boolean): Card {
  return cards.reduce((best, c) => {
    const cScore = dangerScore(c, handType);
    const bestScore = dangerScore(best, handType);
    if (cScore > bestScore) return c;
    if (cScore === bestScore && rankValue(c.rank, backwards) < rankValue(best.rank, backwards)) return c;
    return best;
  });
}

/**
 * Below this trump length, `choosePositiveLead`'s "no master, but lead trump anyway to draw
 * opponents out" branch stays off — holding merely 3-4 of a 13-card suit isn't control, it's just
 * a decent length, and proactively burning a card like a bare King of trump while the Ace is still
 * unseen (neither played nor in hand) is a real risk no table player would take on that thin a
 * holding. At 5+ (well above the ~3.25-per-suit average across 4 hands, meaning the other three
 * players combined hold at most 8), the length itself is close enough to a real trump-control
 * signal that leading is worth it even without a proven master — see .claude/skills/
 * king-ai-opponent and `chooseCard.test.ts`'s regression test for the exact scenario this fixes.
 */
const TRUMP_LEAD_CONTROL_LENGTH = 5;

// No Last Two Tricks: only the final 2 tricks (13 total) carry any penalty risk. Tricks before
// that are free to win — the skill's own guidance: "track trick count remaining; bias toward not
// winning tricks 12 and 13 in particular, which requires the bot to reason about trick-count, not
// just card rank."
const NO_LAST_TWO_SAFE_TRICKS = 11;

function bestMaster(cards: Card[], hand: Card[], tracker: CardTracker, ruleSet: RuleSet): Card | null {
  const masters = cards.filter((c) => isMasterCard(c, hand, tracker));
  return masters.length > 0 ? highestCard(masters, ruleSet.backwards) : null;
}

/**
 * Filters `legal` leads down to ones outside this hand type's own danger *category* (`dangerScore`
 * > 0 — e.g. any Jack or King in `noGentlemen`, any Queen in `noLady`), unless every legal lead is
 * equally dangerous (a genuinely forced position — same fallback shape as `nonDominatedLeads`).
 * `noHearts`/`noKingOfHearts` are unaffected in practice: `legalCardsFor` already refuses to let a
 * player lead hearts at all unless they're void in everything else, so there's nothing left here
 * for this filter to catch for those two hand types specifically. `noTricks`/`noLastTwo` are also
 * unaffected — `dangerScore` there is a continuous function of rank with no zero-danger card to
 * prefer, so this always falls back to `legal` unfiltered for them, correctly leaving "lead lowest"
 * as the only signal, exactly as before this filter existed.
 *
 * A different, narrower fact than `nonDominatedLeads` (proven trick-*winner*, independent of hand
 * type) — this is "this card's category is penalized *if captured*, whether or not leading it
 * happens to win," which `nonDominatedLeads` alone doesn't catch. See `safeNegativeLeads`, which
 * applies both together.
 */
function excludeDangerousLeads(legal: Card[], handType: NegativeHandType): Card[] {
  const safe = legal.filter((card) => dangerScore(card, handType) === 0);
  return safe.length > 0 ? safe : legal;
}

/**
 * The full "don't hand opponents a free or likely capture of your own penalty card" lead filter
 * for a negative hand — shared by Tier 1's own lead branch below and ISMCTS's root candidate set
 * (see `ismcts.ts`'s own doc comments for why a root-only restriction matters for the search
 * specifically). Combines both known domain facts before any budget is spent statistically
 * rediscovering them: never lead a proven master (`nonDominatedLeads`), and never voluntarily lead
 * this hand type's own danger category (`excludeDangerousLeads`) — falling back to whichever
 * (possibly unfiltered) set survives when a genuinely forced position leaves nothing safer.
 */
export function safeNegativeLeads(
  legal: Card[],
  hand: Card[],
  tracker: CardTracker,
  handType: NegativeHandType,
): Card[] {
  return excludeDangerousLeads(nonDominatedLeads(legal, hand, tracker), handType);
}

/**
 * Root-candidate restriction for a negative-hand *mid-trick* decision (leading has its own
 * `safeNegativeLeads`, above) — mirrors `chooseCardHeuristic`'s own mid-trick branch exactly:
 * forced to win (every legal card would currently win the trick)? No restriction; every option is
 * a genuine, live choice worth letting the search weigh. Otherwise a nonWinner is a permanently
 * safe fact this trick — already beaten, which can't be undone by anything played later — and per
 * that branch's own reasoning the single most dangerous nonWinner is unconditionally the right one
 * to shed, not just a reasonable candidate among others. Narrows straight to that one card instead
 * of leaving a modest, time-boxed search budget to (noisily) rediscover it — a real bot observed
 * holding the King of Hearts long after it first had a free, safe chance to discard it (already
 * void in the led suit) is exactly the failure mode this closes: rollouts already shed it
 * eventually via Tier 1, so "discard it now" vs. "keep it, discard something else" can score
 * deceptively similar in backpropagated average reward with only a few samples per branch. See
 * .claude/skills/king-ai-opponent and `ismcts.ts`'s own doc comments.
 */
export function safeNegativeDiscard(
  state: GameState,
  player: PlayerIndex,
  legal: Card[],
  ruleSet: RuleSet,
): Card[] {
  // Negative hands never have trump (CLAUDE.md: "no trumps in negative hands") — this function is
  // only ever called in that context, so there's nothing for `wouldCurrentlyWin` to weigh beyond
  // the led suit's own rank order.
  const winners = legal.filter((card) => wouldCurrentlyWin(state, player, card, null, ruleSet));
  const nonWinners = legal.filter((card) => !winners.includes(card));
  if (nonWinners.length === 0) return legal;
  return [mostDangerous(nonWinners, state.handType as NegativeHandType, ruleSet.backwards)];
}

/**
 * Root-candidate restriction for a positive-hand *lead* — excludes trump from consideration unless
 * it's actually justified (a master trump, or genuine control length — see `choosePositiveLead`'s
 * own `TRUMP_LEAD_CONTROL_LENGTH`), the same domain fact Tier 1 already applies deterministically.
 * Without this, the search has to rediscover on every single hand, under a modest time budget,
 * that leading a bare/thin trump holding just to lead it has no real tactical payoff — reported
 * from live play as trumps getting "played just to play them." Deliberately does *not* collapse to
 * Tier 1's own single pick the way `safeNegativeDiscard` does above: which non-trump suit to lead
 * (or whether a *justified* trump lead beats one of them) is a genuinely open, search-worthy
 * question this only narrows the field for, not one it answers outright.
 */
export function safePositiveLeads(
  legal: Card[],
  hand: Card[],
  tracker: CardTracker,
  ruleSet: RuleSet,
  trumpSuit: TrumpSuit,
): Card[] {
  if (trumpSuit === null) return legal;
  const legalTrump = legal.filter((c) => c.suit === trumpSuit);
  if (legalTrump.length === 0) return legal;
  const hasMasterTrump = bestMaster(legalTrump, hand, tracker, ruleSet) !== null;
  const hasControlLength = suitLength(hand, trumpSuit) >= TRUMP_LEAD_CONTROL_LENGTH;
  if (hasMasterTrump || hasControlLength) return legal;
  const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
  return nonTrump.length > 0 ? nonTrump : legal;
}

/**
 * Leading a positive-hand trick, aware of what's already been played and shown void (`tracker`) —
 * the "normal" difficulty's specific improvement over always leading the flat-highest card:
 *
 * 1. A "master" card (guaranteed the highest remaining of its suit — see `isMasterCard`) is the
 *    strongest available signal short of a full search; lead the master from the longest such
 *    suit, extending control over that suit as long as possible.
 * 2. Failing that, with near-certain trump control (`TRUMP_LEAD_CONTROL_LENGTH`+) and a trump in
 *    play, lead trump to draw out opponents' trumps while still in control, rather than risking a
 *    side-suit lead into a ruff. A merely decent holding below that bar is held in reserve.
 * 3. Otherwise, lead the highest card from whichever suit is both long in hand and has the fewest
 *    opponents already known void in it (fewer void opponents = lower ruff risk).
 */
function choosePositiveLead(
  state: GameState,
  player: PlayerIndex,
  legal: Card[],
  tracker: CardTracker,
  ruleSet: RuleSet,
  trumpSuit: TrumpSuit,
): Card {
  const hand = state.hands[player];
  const bySuit = groupBySuit(legal);

  // A master trump is the strongest possible lead — nothing beats it, and being trump itself it
  // can't be ruffed the way a master in a plain suit can.
  if (trumpSuit !== null) {
    const masterTrump = bestMaster(bySuit.get(trumpSuit) ?? [], hand, tracker, ruleSet);
    if (masterTrump !== null) return masterTrump;
  }

  // A master in a non-trump suit only stays safe to lead if no opponent has already shown void in
  // that suit — a depleted suit (which is exactly what makes a card its "master") also means
  // opponents are more likely to be void in it, and a void opponent can simply ruff instead of
  // following. Restrict to the suits with zero known voids before picking the best master.
  const safeSuits = [...bySuit.entries()].filter(
    ([suit]) => suit !== trumpSuit && opponentVoidCount(tracker, player, suit) === 0,
  );
  let bestSafeMaster: Card | null = null;
  for (const [, cards] of safeSuits) {
    const master = bestMaster(cards, hand, tracker, ruleSet);
    if (master !== null && (bestSafeMaster === null || suitLength(hand, master.suit) > suitLength(hand, bestSafeMaster.suit))) {
      bestSafeMaster = master;
    }
  }
  if (bestSafeMaster !== null) return bestSafeMaster;

  // No guaranteed winner available. Only with genuine trump length — near-certain control, not
  // just a decent holding — lead trump to draw opponents' trumps out while still in control,
  // rather than risking an unproven side-suit lead into a ruff. Below that bar, hold trump back
  // instead of spending it recklessly (see TRUMP_LEAD_CONTROL_LENGTH's doc comment).
  if (trumpSuit !== null && suitLength(hand, trumpSuit) >= TRUMP_LEAD_CONTROL_LENGTH) {
    const trumpCards = bySuit.get(trumpSuit);
    if (trumpCards !== undefined) return highestCard(trumpCards, ruleSet.backwards);
  }

  // Otherwise, the safest available lead: fewest known-void opponents, then longest suit, then —
  // if suits are still tied on both — whichever suit's own best card outranks the others', so
  // this degrades to "just lead the single highest legal card" exactly when length/void give no
  // real signal, rather than an arbitrary pick among equally-long, equally-safe suits. Trump is
  // deliberately excluded here — it's already been considered above (master, or real control
  // length) and rejected, so letting it compete on raw length/void like any other suit would
  // silently reopen the same "burn a decent-but-not-controlling trump holding" bug those branches
  // exist to prevent. Only fall through to trump if it's genuinely the only suit left to lead.
  const nonTrumpSuits = [...bySuit.keys()].filter((suit) => suit !== trumpSuit);
  const candidates = nonTrumpSuits.length > 0 ? nonTrumpSuits : [...bySuit.keys()];
  const suits = candidates.sort((a, b) => {
    const voidDiff = opponentVoidCount(tracker, player, a) - opponentVoidCount(tracker, player, b);
    if (voidDiff !== 0) return voidDiff;
    const lengthDiff = suitLength(hand, b) - suitLength(hand, a);
    if (lengthDiff !== 0) return lengthDiff;
    const aTop = rankValue(highestCard(bySuit.get(a)!, ruleSet.backwards).rank, ruleSet.backwards);
    const bTop = rankValue(highestCard(bySuit.get(b)!, ruleSet.backwards).rank, ruleSet.backwards);
    return bTop - aTop;
  });
  return highestCard(bySuit.get(suits[0])!, ruleSet.backwards);
}

/**
 * Tier 1 heuristic bot — see .claude/skills/king-ai-opponent. Always legal: every branch chooses
 * only from `legalCardsFor`, never a hand-rolled legality check. Exported (not just used by
 * chooseCard.ts's "easy"/"normal" branches) because ismcts.ts also reuses it verbatim as its
 * rollout/default policy — the same policy, not a second weaker one written just for rollouts.
 *
 * The core trick: reuse `resolveTrick` itself (via `wouldCurrentlyWin`) to ask "would playing
 * this card currently win the trick?" — that single primitive drives both "avoid winning"
 * (negative hands) and "win cheaply" (positive hands) without reimplementing rank/trump
 * comparisons.
 *
 * `tracking` toggles the card-tracking-aware positive-hand leading improvements (see
 * `choosePositiveLead`) on or off — "normal" difficulty and ISMCTS rollouts want it on; "easy"
 * wants it off, matching the flat pre-tracking heuristic.
 */
export function chooseCardHeuristic(state: GameState, player: PlayerIndex, tracking: boolean): Card {
  const legal = legalCardsFor(state, player);
  if (legal.length === 1) return legal[0];

  const ruleSet = currentRuleSet(state);
  const isPositive = state.handType === "positive";

  if (state.handType === "noLastTwo" && state.completedTricks.length < NO_LAST_TWO_SAFE_TRICKS) {
    // Winning right now is free — shed the highest card while there's no cost to it, rather than
    // hoarding high cards defensively (which only leaves them stuck holding danger once tricks
    // 12-13 actually arrive). Applies whether leading, following, or discarding void: dumping the
    // single highest legal card is always the right move here, no other logic needed.
    return highestCard(legal, ruleSet.backwards);
  }

  if (state.currentTrick.length === 0) {
    // Leading: "would currently win" is vacuous (nothing to beat yet), so this is handled
    // separately — negative hands lead low (safest; there's no trump to weigh and a global-lowest
    // lead maximizes safety on the trick actually in front of them, so tracking doesn't change
    // this branch), positive hands lead high, tracking-aware when enabled.
    if (!isPositive) {
      // Exclude self-evidently dominated leads (a proven master, guaranteed to win its own trick
      // with no trump around to ever be beaten) and this hand type's own danger category (e.g.
      // never voluntarily lead a Jack or King in noGentlemen) before falling back to "lead
      // lowest" — see `safeNegativeLeads`'s doc comment. The danger-category exclusion is not a
      // no-op the way the master exclusion usually is: "lead lowest" only *incidentally* avoids
      // high danger-category cards like J/K, and fails to when they happen to be the lowest cards
      // actually in hand.
      const safeLeads = safeNegativeLeads(legal, state.hands[player], trackCards(state), state.handType as NegativeHandType);
      return lowestCard(safeLeads, ruleSet.backwards);
    }
    if (!tracking) return highestCard(legal, ruleSet.backwards);
    return choosePositiveLead(state, player, legal, trackCards(state), ruleSet, currentTrumpSuit(state));
  }

  const trumpSuit = currentTrumpSuit(state);
  const winners = legal.filter((card) => wouldCurrentlyWin(state, player, card, trumpSuit, ruleSet));
  const nonWinners = legal.filter((card) => !winners.includes(card));

  if (isPositive) {
    if (winners.length > 0) return lowestCard(winners, ruleSet.backwards); // win as cheaply as possible
    return lowestCard(nonWinners.length > 0 ? nonWinners : legal, ruleSet.backwards); // duck cheaply, preserve strong cards
  }

  if (nonWinners.length === 0) return lowestCard(legal, ruleSet.backwards); // forced to win — least-bad option

  // Not forced to win: every nonWinner is a card that's already beaten by an earlier play in this
  // trick, a permanent, stable fact (a card's own rank can't retroactively change, and being
  // already-beaten never gets undone by a later play) — so this is a genuinely safe, zero-cost
  // moment to shed the specific card that's dangerous for this hand type (e.g. play the Queen
  // under an Ace in No Queens), rather than saving it and hoping for another safe window later.
  // True whether this is a void discard or a following-suit duck — both are equally safe, so both
  // use the same "shed the most dangerous safe card" logic, not two different rules.
  return mostDangerous(nonWinners, state.handType as NegativeHandType, ruleSet.backwards);
}
