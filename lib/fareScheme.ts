/**
 * MovSikel booking fee scheme.
 * Applied on every completed *booking* (rideType='book') ride.
 * Shared rides are always free (no fee, no reward).
 *
 * Tier   | Fare range  | Platform fee | Driver reward | Net cost to driver
 * -------|-------------|--------------|---------------|-------------------
 * 0      | ₱0  – ₱19  | ₱2           | ₱0.50         | ₱1.50
 * 1      | ₱20 – ₱29  | ₱4           | ₱1.00         | ₱3.00
 * 2      | ₱30 – ₱49  | ₱6           | ₱1.50         | ₱4.50
 * 3      | ₱50 – ₱79  | ₱8           | ₱2.00         | ₱6.00
 * 4      | ₱80+        | ₱10          | ₱2.50         | ₱7.50
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

  if (offeredFare < 20)       { fee = 2;  reward = 0.50; }
  else if (offeredFare < 30)  { fee = 4;  reward = 1.00; }
  else if (offeredFare < 50)  { fee = 6;  reward = 1.50; }
  else if (offeredFare < 80)  { fee = 8;  reward = 2.00; }
  else                        { fee = 10; reward = 2.50; }

  return {
    fee,
    reward,
    netCost: fee - reward,
    feeDescription: `Booking fee — ₱${offeredFare.toFixed(0)} fare`,
    rewardDescription: `Ride reward — ₱${offeredFare.toFixed(0)} fare`,
  };
}

/** Minimum wallet balance a driver must hold to accept a booking ride.
 *  Set to the max possible fee (₱10) so a driver can always cover the ride. */
export const WALLET_MINIMUM_ACCEPT = 10;

/** Free starting balance credited to every new driver on registration. */
export const WALLET_WELCOME_BONUS = 15;

/** Referral bonus credited to the referrer on their referee's first completed booking ride. */
export const REFERRAL_BONUS = 10;
