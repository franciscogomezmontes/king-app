import {
  Card,
  GameState,
  NegativeHandType,
  PlayerIndex,
  Rank,
  rankValue,
  resolveTrick,
  RuleSet,
  Suit,
  TrumpSuit,
} from "rules-engine";
import { CardTracker, isMasterCard, nonDominatedLeads, trackCards } from "./cardTracker";

/**
 * One shared floor every difficulty must obey — the "Errores bobos" sheet
 * (docs/ai-strategy/Estrategia_de_Juego.md, section 2): 23 mistakes no bot may make, each with its
 * own stated exception. What changes between Fácil/Normal/Difícil/Experto is the quality of every
 * OTHER decision, never these. `allowedPlays` is the single entry point: it narrows a legal set
 * down to the plays that respect every applicable row, honoring each row's exception exactly, and
 * NEVER returns an empty set — if every legal card is "forbidden," the position is genuinely
 * forced and the full legal set comes back unchanged (recorded via `GuardrailStats` for the
 * bot-vs-bot audit in guardrails.test.ts).
 *
 * Replaces the scattered filters that used to live directly in heuristic.ts (`safeNegativeLeads`,
 * `safeNegativeDiscard`, `safePositiveLeads`) — same functions, same names, now living here and
 * extended to cover the full sheet rather than just the handful of rows those three already
 * happened to catch. `nonDominatedLeads`/`isMasterCard` (cardTracker.ts) stay where they are as
 * low-level primitives this module builds on.
 */

const ALL_SEATS: PlayerIndex[] = [0, 1, 2, 3];

function cardKey(card: Card): string {
  return `${card.suit}${card.rank}`;
}

/** Tracks how often a guardrail narrowed a candidate set to empty and had to fall back to its
 * input unchanged — i.e. a genuinely forced position, not a violation. The bot-vs-bot "silly-
 * mistake audit" (guardrails.test.ts) uses this to report how often each difficulty actually hits
 * a forced position versus how often a guardrail had real work to do. */
export interface GuardrailStats {
  forcedFallbacks: number;
}

export function newGuardrailStats(): GuardrailStats {
  return { forcedFallbacks: 0 };
}

function narrow(filtered: Card[], fallback: Card[], stats?: GuardrailStats): Card[] {
  if (filtered.length > 0) return filtered;
  if (stats) stats.forcedFallbacks += 1;
  return fallback;
}

/** Would playing `card` right now win the trick? Exact when `player` is last to act; a sound
 * heuristic signal otherwise. Reuses `resolveTrick` itself rather than reimplementing rank/trump
 * comparisons. Moved here from heuristic.ts — guardrails and the Tier 1 heuristic both need it,
 * and heuristic.ts now imports its own uses from here instead of the other way around. */
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
  return cards.reduce((best, c) => (rankValue(c.rank, backwards) < rankValue(best.rank, backwards) ? c : best));
}

function highestCard(cards: Card[], backwards: boolean): Card {
  return cards.reduce((best, c) => (rankValue(c.rank, backwards) > rankValue(best.rank, backwards) ? c : best));
}

function suitLength(hand: Card[], suit: Suit): number {
  return hand.filter((c) => c.suit === suit).length;
}

// ===================================================================================
// Negative hands — danger category (section 2 rows for noGentlemen/noLady/noKingOfHearts/noHearts)
// ===================================================================================

/** True iff `card` belongs to this hand type's own penalized category — any heart in noHearts,
 * K/J in noGentlemen, Q in noLady, K♥ specifically in noKingOfHearts. noTricks/noLastTwo have no
 * card-identity category (every trick/every last-two-trick is the "unit"), so always false. */
function isDangerCategory(card: Card, handType: NegativeHandType): boolean {
  switch (handType) {
    case "noHearts":
      return card.suit === "H";
    case "noKingOfHearts":
      return card.suit === "H" && card.rank === 13;
    case "noGentlemen":
      return card.rank === 13 || card.rank === 11;
    case "noLady":
      return card.rank === 12;
    case "noTricks":
    case "noLastTwo":
      return false;
  }
}

/**
 * How dangerous it is to be holding `card` in this negative hand type — used to prioritize what
 * to discard first when free to choose. Higher means "discard sooner." Category members always
 * dominate (and rank among themselves by rank, e.g. K over J in noGentlemen); non-category cards
 * rank by their own card rank too (not a flat 0) — this is what row 3's "jugando de último, usar
 * la información completa" needs: when nothing in the candidate set matches the hand's own danger
 * category, still prefer shedding the HIGHEST safe card, not an arbitrary low one.
 */
function dangerScore(card: Card, handType: NegativeHandType): number {
  if (isDangerCategory(card, handType)) return 1000 + card.rank;
  return card.rank;
}

/**
 * The most dangerous card to be holding, among `cards`, for this negative hand type. Ties (two
 * cards with the same score — only possible when neither is a category member, since category
 * ranks are unique per suit) break toward the HIGHEST rank, not the lowest — row 3: full
 * information should be used to shed the highest card that's still safe, never an arbitrarily low
 * one, when nothing in the set is this hand's own danger category.
 */
export function mostDangerous(cards: Card[], handType: NegativeHandType, backwards: boolean): Card {
  return cards.reduce((best, c) => {
    const cScore = dangerScore(c, handType);
    const bestScore = dangerScore(best, handType);
    if (cScore > bestScore) return c;
    if (cScore === bestScore && rankValue(c.rank, backwards) > rankValue(best.rank, backwards)) return c;
    return best;
  });
}

/** The least dangerous card among `cards` — the mirror image of `mostDangerous`, needed when
 * FORCED to win in noKingOfHearts/noGentlemen/noLady/noHearts: if every legal card currently wins,
 * prefer winning with the category card you'd rather NOT spend yet (K♥ itself, a J/K, a Q) only
 * when there is no safer choice — i.e. play the one that keeps the worst card in hand, not out. */
function leastDangerous(cards: Card[], handType: NegativeHandType, backwards: boolean): Card {
  return cards.reduce((best, c) => {
    const cScore = dangerScore(c, handType);
    const bestScore = dangerScore(best, handType);
    if (cScore < bestScore) return c;
    if (cScore === bestScore && rankValue(c.rank, backwards) < rankValue(best.rank, backwards)) return c;
    return best;
  });
}

/** The category rank(s) that make a suit "unaccounted for" in rows 7/9 — J/K for noGentlemen
 * (any gentleman protects itself and its suit-mates), Q for noLady. */
function protectorRanksFor(handType: NegativeHandType): Rank[] | null {
  if (handType === "noGentlemen") return [11, 13];
  if (handType === "noLady") return [12];
  return null;
}

/** The ranks rows 7/9 forbid leading when that suit's own protector rank(s) are unaccounted for —
 * Ace or Queen in noGentlemen (either could trap a later player's forced J/K into this trick),
 * Ace or King in noLady (could trap a forced Q). */
function trapLeadRanksFor(handType: NegativeHandType): Rank[] | null {
  if (handType === "noGentlemen") return [14, 12];
  if (handType === "noLady") return [14, 13];
  return null;
}

function suitHasUnaccountedProtector(suit: Suit, hand: Card[], tracker: CardTracker, handType: NegativeHandType): boolean {
  const protectorRanks = protectorRanksFor(handType);
  if (protectorRanks === null) return false;
  return protectorRanks.some((rank) => {
    const played = tracker.playedCards.has(cardKey({ suit, rank }));
    const held = hand.some((c) => c.suit === suit && c.rank === rank);
    return !played && !held;
  });
}

/**
 * Rows 6 & 8: never lead a J/K (noGentlemen) or Q (noLady) without need — treated as a strict,
 * unconditional floor (no auto-applied exception). The sheet's own stated exception ("undefended,
 * no rival void yet, led on purpose") describes a genuine but situational strategic judgment call
 * — "undefended and no rival void yet" is trivially true at the very start of almost any hand, so
 * auto-applying it here would silently reopen exactly the live bug this row exists to close
 * (Francisco's real noGentlemen report: leading a King/Jack as the opening lead of a trick with a
 * perfectly safe Queen sitting right there). That judgment belongs to Part 4's per-hand heuristic,
 * which can deliberately widen its own candidate set when it has actually evaluated the whole
 * hand and decided the early lead is correct — not to a cheap per-card mechanical check. The one
 * exception this guardrail DOES honor unconditionally is the standard forced-fallback below: when
 * every legal lead is a J/K (or Q), there's no safer alternative to prefer regardless.
 */
function excludeUnneededCategoryLeads(
  legal: Card[],
  handType: NegativeHandType,
  stats?: GuardrailStats,
): Card[] {
  const safe = legal.filter((card) => !isDangerCategory(card, handType));
  return narrow(safe, legal, stats);
}

/**
 * Rows 7 & 9: never lead an Ace or Queen (noGentlemen) / Ace or King (noLady) of a suit whose own
 * protector rank(s) are still unaccounted for (neither played nor in own hand) — it risks trapping
 * a later player's forced J/K/Q into the very trick you'd then likely capture. No exception.
 */
function excludeProtectorTrapLeads(
  legal: Card[],
  hand: Card[],
  tracker: CardTracker,
  handType: NegativeHandType,
  stats?: GuardrailStats,
): Card[] {
  const trapRanks = trapLeadRanksFor(handType);
  if (trapRanks === null) return legal;
  const safe = legal.filter(
    (card) => !(trapRanks.includes(card.rank) && suitHasUnaccountedProtector(card.suit, hand, tracker, handType)),
  );
  return narrow(safe, legal, stats);
}

/**
 * The full negative-hand lead guardrail — rows 1 (leads), 6, 7, 8, 9. Combines: never lead a
 * proven master (row 1 — `nonDominatedLeads`, cardTracker.ts, unchanged and still shared verbatim
 * with ISMCTS's rollouts); never lead this hand's own danger category without the row 6/8
 * exception; never lead an Ace/Queen-or-King that could trap a later player's forced protector
 * card into this trick. Each stage falls back to its own input when it would otherwise empty out,
 * so the whole chain can never return nothing.
 */
export function safeNegativeLeads(
  legal: Card[],
  hand: Card[],
  tracker: CardTracker,
  handType: NegativeHandType,
  stats?: GuardrailStats,
): Card[] {
  // `nonDominatedLeads` (cardTracker.ts) already falls back to `legal` unchanged internally when
  // every lead is dominated — its own forced-fallback isn't separately counted in `stats` here,
  // only the rows chained after it are.
  let candidates = nonDominatedLeads(legal, hand, tracker);
  candidates = excludeUnneededCategoryLeads(candidates, handType, stats);
  candidates = excludeProtectorTrapLeads(candidates, hand, tracker, handType, stats);
  return candidates;
}

// ===================================================================================
// noKingOfHearts — rows 10, 11, 12 (K♥/A♥ handling inside a hearts trick)
// ===================================================================================

/**
 * Rows 10 & 12: inside a hearts trick, don't play K♥ unless A♥ has already shown in THIS trick
 * (making K♥ a guaranteed safe duck) or K♥ is forced (the only heart left); symmetrically, don't
 * play A♥ unless K♥ has already shown in this trick or A♥ is forced. Either premature play risks
 * trapping the other card (or, for K♥, trapping itself) into a trick you then likely win and
 * capture. No exception beyond being forced (only one heart to choose from).
 */
function excludeRiskyHeartsPlays(legal: Card[], state: GameState, stats?: GuardrailStats): Card[] {
  if (state.currentTrick.length === 0) return legal;
  const ledSuit = state.currentTrick[0].card.suit;
  if (ledSuit !== "H") return legal;
  const myHeartsInLegal = legal.filter((c) => c.suit === "H");
  if (myHeartsInLegal.length <= 1) return legal; // forced — K♥/A♥ is the only heart available

  const trickSoFar = state.currentTrick.map((p) => p.card);
  const aceShown = trickSoFar.some((c) => c.suit === "H" && c.rank === 14);
  const kingShown = trickSoFar.some((c) => c.suit === "H" && c.rank === 13);

  const safe = legal.filter((card) => {
    if (card.suit !== "H") return true;
    if (card.rank === 13 && !aceShown) return false; // row 10
    if (card.rank === 14 && !kingShown) return false; // row 12
    return true;
  });
  return narrow(safe, legal, stats);
}

// ===================================================================================
// Negative hands — mid-trick (following suit or discarding void): rows 1, 2, 3, 10, 11, 12
// ===================================================================================

/**
 * Rows 1, 2 & 3 (plus 10/11/12 for noKingOfHearts via `excludeRiskyHeartsPlays`): mirrors
 * `chooseCardHeuristic`'s own mid-trick branch. Never voluntarily win when a non-winning play
 * exists (row 1); when ducking, narrow to the single most dangerous safe card — using full
 * information, so last-to-act never settles for an arbitrarily low safe card when a higher one
 * also loses (rows 2 & 3). Forced to win? Use the single LEAST dangerous winner — spend a card
 * you have to spend anyway without needlessly sacrificing this hand's own danger category (e.g.
 * never hand over K♥ itself when a non-K♥ heart would have won just as forcibly).
 */
export function safeNegativeDiscard(
  state: GameState,
  player: PlayerIndex,
  legal: Card[],
  ruleSet: RuleSet,
  stats?: GuardrailStats,
): Card[] {
  const heartsSafe = state.handType === "noKingOfHearts" ? excludeRiskyHeartsPlays(legal, state, stats) : legal;

  const winners = heartsSafe.filter((card) => wouldCurrentlyWin(state, player, card, null, ruleSet));
  const nonWinners = heartsSafe.filter((card) => !winners.includes(card));
  if (nonWinners.length === 0) {
    return [leastDangerous(heartsSafe, state.handType as NegativeHandType, ruleSet.backwards)];
  }
  return [mostDangerous(nonWinners, state.handType as NegativeHandType, ruleSet.backwards)];
}

// ===================================================================================
// No Last Two Tricks — rows 13 & 14
// ===================================================================================

/** Tricks before this (0-indexed `completedTricks.length`) carry zero penalty risk in No Last Two
 * — winning them is free. Same threshold as heuristic.ts's own NO_LAST_TWO_SAFE_TRICKS. */
const NO_LAST_TWO_SAFE_TRICKS = 11;

/** True iff no other card of `card`'s suit remains anywhere in play — the "carta infinita" from
 * the Parámetros sheet: the single remaining representative of its suit, guaranteed to win if led
 * (nothing can follow it, and negative hands have no trump to beat it with regardless). A strict
 * subset of `isMasterCard` (every infinite card is a master; not every master is infinite), kept
 * here only for the audit/tests below to name the sheet's own scenario directly — the guardrail
 * itself reuses the broader, already-correct `nonDominatedLeads` (row 1) to catch it, same as any
 * other negative-hand lead. */
export function isOnlyRemainingOfSuit(card: Card, hand: Card[], tracker: CardTracker): boolean {
  if (suitLength(hand, card.suit) !== 1) return false;
  for (let rank = 2; rank <= 14; rank++) {
    if (rank === card.rank) continue;
    if (!tracker.playedCards.has(cardKey({ suit: card.suit, rank: rank as Rank }))) return false;
  }
  return true;
}

/**
 * Rows 13 & 14, by way of the hand's own free-vs-danger split: tricks 1-11 cost nothing, so never
 * waste that free window on a low "defense" card while a middle/high card could be shed instead —
 * collapse to the single highest legal card, exactly `chooseCardHeuristic`'s own top-level
 * override, now also enforced for "easy"'s random fallback and ISMCTS's root. Row 13 (never lead
 * a carta infinita in trick 12/13 unless forced) needs no separate code here: tricks 12-13 fall
 * through to the general negative-lead/discard guardrails below, whose `nonDominatedLeads` (row 1)
 * already excludes any proven master — a carta infinita is always one — with the exact same
 * "forced if every option wins" fallback the sheet's own exception describes.
 */
function noLastTwoFreeZoneOverride(legal: Card[], completedTricksCount: number, backwards: boolean): Card[] | null {
  if (completedTricksCount >= NO_LAST_TWO_SAFE_TRICKS) return null;
  return [highestCard(legal, backwards)];
}

// ===================================================================================
// Positive hands — leading: rows 15 & 19
// ===================================================================================

/** Below this trump length, there's no real control to justify leading trump at all without a
 * proven master — mirrors heuristic.ts's own `TRUMP_LEAD_CONTROL_LENGTH`; kept as an independent
 * constant here (guardrails.ts has no dependency on heuristic.ts) since Part 3's strategyParams.ts
 * is where these get reconciled into one shared source. */
const TRUMP_LEAD_CONTROL_LENGTH = 5;

/** "Destriunfar": 5+ trumps, with at least 2 of Ace/King/Queen/Jack among them (Parámetros sheet)
 * — a materially stronger bar than plain length, used specifically to excuse leading the K or Q
 * of trump itself (row 15) even though the Ace hasn't shown; a merely-long-but-weak trump holding
 * (5 low trumps with only one honor) isn't genuine destriunfar strength. */
const DESTRIUNFAR_MIN_LENGTH = 5;
const DESTRIUNFAR_MIN_STRONG_CARDS = 2;
const STRONG_RANKS = new Set<Rank>([11, 12, 13, 14]);

function hasDestriunfarStrength(hand: Card[], trumpSuit: Suit): boolean {
  const trumpCards = hand.filter((c) => c.suit === trumpSuit);
  if (trumpCards.length < DESTRIUNFAR_MIN_LENGTH) return false;
  return trumpCards.filter((c) => STRONG_RANKS.has(c.rank)).length >= DESTRIUNFAR_MIN_STRONG_CARDS;
}

/** True iff the Ace of `trumpSuit` is already accounted for — played, or sitting in `hand` right
 * alongside the K/Q being considered (in which case nothing can beat it either). Row 15 is keyed
 * on the Ace specifically, independent of whether the King has also shown — unlike `isMasterCard`,
 * which for a Queen lead would also demand the King be accounted for. */
function trumpAceAccountedFor(hand: Card[], trumpSuit: Suit, tracker: CardTracker): boolean {
  return tracker.playedCards.has(cardKey({ suit: trumpSuit, rank: 14 })) || hand.some((c) => c.suit === trumpSuit && c.rank === 14);
}

/**
 * Row 15, layered on top of the pre-existing "is leading trump at all justified" gate (no proven
 * master, and not even genuine control length — `TRUMP_LEAD_CONTROL_LENGTH`, unrelated to this
 * row and left exactly as it already worked): trump isn't justified at all? Exclude every trump
 * card, low or high, the same as always. Trump IS justified (master, or real control length)?
 * Row 15 still adds one extra constraint on top: even then, don't lead the K or Q of trump
 * *specifically* unless the Ace has shown or the holding is genuinely destriunfar-strong
 * (`hasDestriunfarStrength`) — control length alone (e.g. 5 low/mid trumps that happen to be
 * topped by a lone King) doesn't excuse spending the honor itself prematurely, only drawing
 * trumps with a lower one.
 */
function excludeUnjustifiedTrumpLeads(
  legal: Card[],
  hand: Card[],
  tracker: CardTracker,
  trumpSuit: Suit,
  stats?: GuardrailStats,
): Card[] {
  const legalTrump = legal.filter((c) => c.suit === trumpSuit);
  if (legalTrump.length === 0) return legal;

  const hasMasterTrump = legalTrump.some((c) => isMasterCard(c, hand, tracker));
  const hasControlLength = suitLength(hand, trumpSuit) >= TRUMP_LEAD_CONTROL_LENGTH;
  if (!hasMasterTrump && !hasControlLength) {
    const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
    return narrow(nonTrump, legal, stats);
  }

  if (trumpAceAccountedFor(hand, trumpSuit, tracker) || hasDestriunfarStrength(hand, trumpSuit)) return legal;
  const safe = legal.filter((c) => !(c.suit === trumpSuit && (c.rank === 13 || c.rank === 12)));
  return narrow(safe, legal, stats);
}

/**
 * Row 19: never lead a non-trump suit a later-playing opponent is already known void in while
 * they might still hold trump (inferred conservatively: not yet shown void in the trump suit
 * itself) — they can ruff it for free. Since the leader is first to act, every other seat plays
 * "later" this trick. The sheet's own exception ("cuando el objetivo es sacarle los triunfos") is
 * a strategic judgment call this mechanical guardrail can't make — it only ever forbids a lead
 * when a less risky alternative exists at all (the usual forced-fallback), leaving the genuinely-
 * intentional case for Part 4's heuristic to decide when it's the only lead worth making anyway.
 */
function excludeLeadsIntoVoidTrumpHolder(
  legal: Card[],
  tracker: CardTracker,
  trumpSuit: Suit,
  player: PlayerIndex,
  stats?: GuardrailStats,
): Card[] {
  const opponents = ALL_SEATS.filter((seat) => seat !== player);
  const safe = legal.filter((card) => {
    if (card.suit === trumpSuit) return true; // leading trump itself is row 15's concern, not this one
    return !opponents.some((seat) => tracker.voidSuits[seat].has(card.suit) && !tracker.voidSuits[seat].has(trumpSuit));
  });
  return narrow(safe, legal, stats);
}

/**
 * The full positive-hand lead guardrail — rows 15 & 19. Excludes an unjustified trump lead, then
 * excludes a lead into a known-void-but-still-trumped opponent when a safer suit remains.
 */
export function safePositiveLeads(
  legal: Card[],
  hand: Card[],
  tracker: CardTracker,
  ruleSet: RuleSet,
  trumpSuit: TrumpSuit,
  player: PlayerIndex,
  stats?: GuardrailStats,
): Card[] {
  if (trumpSuit === null) return legal;
  let candidates = excludeUnjustifiedTrumpLeads(legal, hand, tracker, trumpSuit, stats);
  candidates = excludeLeadsIntoVoidTrumpHolder(candidates, tracker, trumpSuit, player, stats);
  return candidates;
}

// ===================================================================================
// Positive hands — mid-trick (following suit, cutting, or discarding void): rows 16, 17, 18
// ===================================================================================

/**
 * Rows 16, 17 & 18: if any legal card currently wins, narrow to the single cheapest one —
 * whether that's simply following with a lower card of the led suit or, specifically, cutting
 * with the lowest trump that wins rather than a higher one (row 16). If nothing wins, this trick
 * is already lost; narrow discards to exclude a proven master (a "sure winner" for some future
 * trick) unless every legal discard is one (row 17's one stated exception — Mandatory Killing
 * forcing a beat — can't actually surface here: a card mandatory killing forces is by definition
 * a winner, so it's already handled by the winners branch above, never reaching this one).
 */
export function safePositiveDiscard(
  state: GameState,
  player: PlayerIndex,
  legal: Card[],
  ruleSet: RuleSet,
  trumpSuit: TrumpSuit,
  hand: Card[],
  tracker: CardTracker,
): Card[] {
  const winners = legal.filter((card) => wouldCurrentlyWin(state, player, card, trumpSuit, ruleSet));
  if (winners.length > 0) {
    return [lowestCard(winners, ruleSet.backwards)];
  }
  const safeDiscards = legal.filter((card) => !isMasterCard(card, hand, tracker));
  return safeDiscards.length > 0 ? safeDiscards : legal;
}

// ===================================================================================
// Main entry point
// ===================================================================================

/**
 * The cards `player` may play right now without violating any "Errores bobos" rule — filters
 * `legal` (already-legal-per-the-rules-engine cards) down further by strategy-correctness, not
 * rules-legality. Every difficulty must route through this before its own policy runs: Fácil's
 * heuristic path AND its random-override path, Normal's heuristic, and Difícil/Experto's ISMCTS
 * root candidate set. Never returns an empty array — a position where every legal card is
 * "forbidden" is genuinely forced, and the full `legal` set comes back unchanged (and recorded via
 * `stats`, if given).
 */
export function allowedPlays(
  state: GameState,
  player: PlayerIndex,
  legal: Card[],
  ruleSet: RuleSet,
  trumpSuit: TrumpSuit,
  stats?: GuardrailStats,
): Card[] {
  if (legal.length <= 1) return legal;

  const hand = state.hands[player];
  const tracker = trackCards(state);
  const leading = state.currentTrick.length === 0;
  const isPositive = state.handType === "positive";

  if (!isPositive) {
    if (state.handType === "noLastTwo") {
      const freeZone = noLastTwoFreeZoneOverride(legal, state.completedTricks.length, ruleSet.backwards);
      if (freeZone !== null) return freeZone;
    }
    const handType = state.handType as NegativeHandType;
    return leading
      ? safeNegativeLeads(legal, hand, tracker, handType, stats)
      : safeNegativeDiscard(state, player, legal, ruleSet, stats);
  }

  return leading
    ? safePositiveLeads(legal, hand, tracker, ruleSet, trumpSuit, player, stats)
    : safePositiveDiscard(state, player, legal, ruleSet, trumpSuit, hand, tracker);
}

// ===================================================================================
// Auction guardrails — rows 20, 21 & 22 (apply to every difficulty's bidding/selling, not just
// card play)
// ===================================================================================

/** "Oferta grande: 3 bazas; 4 = rara; 5+ = casi nunca" (Parámetros sheet) — row 20's floor: a bid
 * of 5+ is capped unless the bidder's own (pre-margin) hand estimate clears a genuinely
 * exceptional bar. */
export const EXCEPTIONAL_BID_TRICKS = 5;
/** How strong a hand's own raw trick estimate must be to excuse a 5+ bid — a hand that can
 * legitimately draw this many tricks even before any bidding margin is subtracted. */
export const EXCEPTIONAL_HAND_RAW_TRICKS = 7;

/**
 * Rows 20 & 21: never bid at or above your own hand's trick estimate (row 21 — buying must leave
 * real margin, never break even or worse; "Ninguna" exception, so this is absolute), and never
 * offer 5+ tricks unless the hand is genuinely exceptional by its own raw estimate (row 20).
 * `rawBid` is tricks, `ownRawEstimate` is the bidder's own un-margined hand-strength estimate in
 * the same unit (whichever estimator the calling difficulty uses — `estimateTricks` for Fácil/
 * Normal, `impliedTricks`'s break-even for Difícil/Experto).
 */
export function guardedBid(rawBid: number | null, ownRawEstimate: number): number | null {
  if (rawBid === null) return null;
  if (rawBid >= ownRawEstimate) return null; // row 21 — no exception
  if (rawBid >= EXCEPTIONAL_BID_TRICKS && ownRawEstimate < EXCEPTIONAL_HAND_RAW_TRICKS) {
    return EXCEPTIONAL_BID_TRICKS - 1;
  }
  return rawBid;
}

/**
 * Row 22: the dealer must sell (return true) whenever the top bid promises more than their own
 * hand would make them directly. No exception. `topBidTricks` is the standing high bid (or null
 * if no one bid); `ownRawEstimate` is the dealer's own hand-strength estimate in the same trick
 * unit.
 */
export function guardedDealerSell(topBidTricks: number | null, ownRawEstimate: number): boolean {
  if (topBidTricks === null) return false;
  return topBidTricks > ownRawEstimate;
}
