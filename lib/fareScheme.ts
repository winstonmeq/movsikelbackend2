/**
 * MovSikel booking fee scheme.
 * Applied on every completed *booking* (rideType='book') ride.
 * Shared rides are always free (no fee, no reward).
 *
 * Tier   | Fare range  | Platform fee | Driver reward | Net cost to driver
 * -------|-------------|--------------|---------------|-------------------
 * 0      | ₱0  – ₱19  | ₱0           | ₱0            | ₱0
 * 1      | ₱20 – ₱29  | ₱1           | ₱0.50         | ₱0.50
 * 2      | ₱30 – ₱49  | ₱2           | ₱1.00         | ₱1.00
 * 3      | ₱50 – ₱79  | ₱3           | ₱1.50         | ₱1.50
 * 4      | ₱80+        | ₱5           | ₱2.00         | ₱3.00
 */
export interface FareSchemeResult {
  fee: number;
  reward: number;
  /** Net cost to the driver after reward is returned. */
  netCost: number;
  /** Human-readable description for the ledger entry. */
  feeDescription: string;
  rewardDescription: string;
}

export function computeFee(offeredFare: number): FareSchemeResult {
  let fee: number;
  let reward: number;

  if (offeredFare < 20)       { fee = 0; reward = 0; }
  else if (offeredFare < 30)  { fee = 1; reward = 0.50; }
  else if (offeredFare < 50)  { fee = 2; reward = 1.00; }
  else if (offeredFare < 80)  { fee = 3; reward = 1.50; }
  else                        { fee = 5; reward = 2.00; }

  return {
    fee,
    reward,
    netCost: fee - reward,
    feeDescription: `Booking fee — ₱${offeredFare.toFixed(0)} fare`,
    rewardDescription: `Ride reward — ₱${offeredFare.toFixed(0)} fare`,
  };
}

/** Minimum wallet balance a driver must hold to accept a booking ride. */
export const WALLET_MINIMUM_ACCEPT = 5;

/** Free starting balance credited to every new driver on registration. */
export const WALLET_WELCOME_BONUS = 15;

/** Referral bonus credited to the referrer on their referee's first completed booking ride. */
export const REFERRAL_BONUS = 10;
