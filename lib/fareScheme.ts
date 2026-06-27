/**
 * MovSikel booking fee scheme.
 * Applied on every completed *booking* (rideType='book') ride.
 * Shared rides are always free.
 *
 * A single flat fee per booking — NO reward. (Previously the platform charged a
 * fee then credited half of it back as a "reward"; that netted to exactly this
 * fee, so it was simplified to one debit with no offsetting credit.)
 *
 * The fee starts at ₱1 for fares up to ₱20, then steps up ₱0.50 for every ₱5 of
 * fare above ₱20, capped at ₱7.50.
 *
 * Fare range  | Fee
 * ------------|------
 * ₱0  – ₱20  | ₱1.00
 * ₱21 – ₱25  | ₱1.50
 * ₱26 – ₱30  | ₱2.00
 * ₱31 – ₱35  | ₱2.50
 * ₱36 – ₱40  | ₱3.00
 * ₱41 – ₱45  | ₱3.50
 * ₱46 – ₱50  | ₱4.00
 * ₱51 – ₱55  | ₱4.50
 * ₱56 – ₱60  | ₱5.00
 * ₱61 – ₱65  | ₱5.50
 * ₱66 – ₱70  | ₱6.00
 * ₱71 – ₱75  | ₱6.50
 * ₱76 – ₱80  | ₱7.00
 * ₱81+        | ₱7.50
 */
export interface FareSchemeResult {
  fee: number;
  /** Retained for callers/ledger compatibility; always 0 under the no-reward scheme. */
  reward: number;
  /** Net cost to the driver (== fee, since there's no reward). */
  netCost: number;
  /** Human-readable description for the ledger entry. */
  feeDescription: string;
  rewardDescription: string;
}

/** Lowest fee (fares up to BASE_FEE_FARE_CEILING). */
const BASE_FEE = 1;
/** Fares at or below this all pay BASE_FEE. */
const BASE_FEE_FARE_CEILING = 20;
/** Every this-many pesos of fare above the ceiling adds FEE_STEP to the fee. */
const FARE_STEP = 5;
/** How much the fee rises per FARE_STEP. */
const FEE_STEP = 0.5;
/** Fee never exceeds this. */
const MAX_FEE = 7.5;

export function computeFee(offeredFare: number): FareSchemeResult {
  const fare = Math.max(0, offeredFare);

  // Fee: ₱1 up to ₱20, then +₱0.50 per ₱5 band above ₱20, capped at ₱7.50.
  let fee: number;
  if (fare <= BASE_FEE_FARE_CEILING) {
    fee = BASE_FEE;
  } else {
    const stepsAbove = Math.ceil((fare - BASE_FEE_FARE_CEILING) / FARE_STEP);
    fee = Math.min(BASE_FEE + stepsAbove * FEE_STEP, MAX_FEE);
  }

  return {
    fee,
    reward: 0,
    netCost: fee,
    feeDescription: `Booking fee — ₱${fare.toFixed(0)} fare`,
    rewardDescription: '',
  };
}

/** Minimum wallet balance a driver must hold to accept a booking ride.
 *  Set to the max possible fee (₱7.50) so a driver can always cover the ride. */
export const WALLET_MINIMUM_ACCEPT = 7.5;

/** Free starting balance credited to every new driver on registration. */
export const WALLET_WELCOME_BONUS = 15;

/** Referral bonus credited to the referrer on their referee's first completed booking ride. */
export const REFERRAL_BONUS = 10;
