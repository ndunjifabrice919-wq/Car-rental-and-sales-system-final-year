/**
 * DriveEasy Dynamic Pricing Engine
 * Buea, Cameroon — FCFA pricing
 */

/* ─────────────────────────────────────
   RENTAL DYNAMIC PRICING
───────────────────────────────────── */

export interface RentalPriceFactor {
  label: string;
  type: "discount" | "surcharge" | "neutral";
  percent: number; // positive = surcharge, negative = discount
  amount: number;  // in FCFA
}

export interface RentalPriceResult {
  baseRate: number;          // original daily rate
  effectiveRate: number;     // per-day rate after adjustments
  days: number;
  total: number;             // final total
  originalTotal: number;     // base rate × days (no adjustments)
  factors: RentalPriceFactor[];
  savings: number;           // how much cheaper vs original (positive = saving)
  badge: string | null;      // e.g. "Weekend Surcharge" or "Early Bird Deal"
}

/**
 * Count how many days in a date range fall on weekends (Fri/Sat/Sun in CM context)
 */
function countWeekendDays(startDate: Date, days: number): number {
  let count = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const day = d.getDay(); // 0=Sun, 5=Fri, 6=Sat
    if (day === 0 || day === 5 || day === 6) count++;
  }
  return count;
}

/**
 * Check if month is peak travel season
 */
function isPeakMonth(date: Date): boolean {
  const month = date.getMonth(); // 0-indexed
  return [0, 6, 7, 11].includes(month); // Jan, Jul, Aug, Dec
}

/**
 * Calculate dynamic rental price
 */
export function calculateRentalPrice(
  baseRate: number,
  startDateStr: string,
  endDateStr: string
): RentalPriceResult {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);

  if (days <= 0) {
    return { baseRate, effectiveRate: baseRate, days: 0, total: 0, originalTotal: 0, factors: [], savings: 0, badge: null };
  }

  const originalTotal = baseRate * days;
  const factors: RentalPriceFactor[] = [];
  let multiplier = 1.0;

  // ── 1. Duration Discount ──────────────────
  let durationPercent = 0;
  let durationLabel = "";
  if (days >= 14) { durationPercent = -15; durationLabel = "14+ Day Discount"; }
  else if (days >= 7) { durationPercent = -10; durationLabel = "7+ Day Discount"; }
  else if (days >= 3) { durationPercent = -5;  durationLabel = "3+ Day Discount"; }

  if (durationPercent !== 0) {
    const amount = Math.round(originalTotal * Math.abs(durationPercent) / 100);
    factors.push({ label: durationLabel, type: "discount", percent: durationPercent, amount });
    multiplier += durationPercent / 100;
  }

  // ── 2. Weekend Surcharge ─────────────────
  const weekendDays = countWeekendDays(startDate, days);
  if (weekendDays > 0 && days <= 6) {
    // Only apply weekend surcharge for short rentals (not multi-week)
    const weekendRatio = weekendDays / days;
    const surchargePercent = Math.round(weekendRatio * 15); // up to 15%
    if (surchargePercent > 0) {
      const amount = Math.round(originalTotal * surchargePercent / 100);
      factors.push({ label: `Weekend Days (${weekendDays} day${weekendDays > 1 ? "s" : ""})`, type: "surcharge", percent: surchargePercent, amount });
      multiplier += surchargePercent / 100;
    }
  }

  // ── 3. Peak Season ───────────────────────
  if (isPeakMonth(startDate)) {
    const peakPercent = 15;
    const amount = Math.round(originalTotal * peakPercent / 100);
    factors.push({ label: "Peak Season (High Demand)", type: "surcharge", percent: peakPercent, amount });
    multiplier += peakPercent / 100;
  }

  // ── 4. Last-Minute Booking ───────────────
  const hoursUntilStart = (startDate.getTime() - Date.now()) / 3600000;
  if (hoursUntilStart < 48 && hoursUntilStart >= 0) {
    const lastMinPercent = 10;
    const amount = Math.round(originalTotal * lastMinPercent / 100);
    factors.push({ label: "Last-Minute Booking (<48h)", type: "surcharge", percent: lastMinPercent, amount });
    multiplier += lastMinPercent / 100;
  }

  // ── 5. Early Bird ────────────────────────
  if (hoursUntilStart > 168) { // 7+ days ahead
    const earlyPercent = -5;
    const amount = Math.round(originalTotal * Math.abs(earlyPercent) / 100);
    factors.push({ label: "Early Bird Booking (7+ days ahead)", type: "discount", percent: earlyPercent, amount });
    multiplier += earlyPercent / 100;
  }

  // ── Final calculation ────────────────────
  const total = Math.round(originalTotal * Math.max(multiplier, 0.7)); // floor at 30% off
  const effectiveRate = Math.round(total / days);
  const savings = originalTotal - total;

  // Pick the most prominent badge
  let badge: string | null = null;
  const discounts = factors.filter(f => f.type === "discount");
  const surcharges = factors.filter(f => f.type === "surcharge");
  if (discounts.length > 0 && savings > 0) badge = `Save ${Math.abs(Math.round((savings / originalTotal) * 100))}%`;
  else if (surcharges.some(f => f.label.includes("Peak"))) badge = "Peak Season";
  else if (surcharges.some(f => f.label.includes("Last"))) badge = "Last Minute";

  return { baseRate, effectiveRate, days, total, originalTotal, factors, savings, badge };
}

/* ─────────────────────────────────────
   SALES DYNAMIC PRICING
───────────────────────────────────── */

export interface SalePriceFactor {
  label: string;
  type: "discount" | "premium";
  percent: number;
  amount: number;
}

export interface SalePriceResult {
  basePrice: number;
  adjustedPrice: number;
  factors: SalePriceFactor[];
  savings: number;         // positive = buyer saves vs base
  demandBadge: string | null; // "High Demand", "Great Value", "Premium Condition"
}

/**
 * Calculate dynamic sale price based on vehicle attributes
 */
export function calculateSalePrice(
  basePrice: number,
  mileage: number | null,
  year: number,
  rentalCount = 0          // how many times this vehicle type was rented (demand signal)
): SalePriceResult {
  const factors: SalePriceFactor[] = [];
  let adjustedPrice = basePrice;
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  // ── 1. Mileage Adjustment ─────────────────
  if (mileage !== null) {
    let mileagePercent = 0;
    let mileageLabel = "";

    if (mileage < 5000) {
      mileagePercent = 8;
      mileageLabel = "As Good As New (< 5,000 km)";
    } else if (mileage < 30000) {
      mileagePercent = 4;
      mileageLabel = "Low Mileage (< 30,000 km)";
    } else if (mileage > 200000) {
      mileagePercent = -15;
      mileageLabel = "High Mileage (> 200,000 km)";
    } else if (mileage > 100000) {
      mileagePercent = -8;
      mileageLabel = "High Mileage (> 100,000 km)";
    }

    if (mileagePercent !== 0) {
      const amount = Math.round(Math.abs(basePrice * mileagePercent / 100));
      factors.push({ label: mileageLabel, type: mileagePercent > 0 ? "premium" : "discount", percent: Math.abs(mileagePercent), amount });
      adjustedPrice += basePrice * mileagePercent / 100;
    }
  }

  // ── 2. Age/Depreciation ───────────────────
  let agePercent = 0;
  let ageLabel = "";
  if (age <= 1)       { agePercent = 5;   ageLabel = "Nearly New (≤ 1 year)"; }
  else if (age <= 3)  { agePercent = 0;   ageLabel = ""; } // no adjustment for 2-3 years
  else if (age <= 5)  { agePercent = -5;  ageLabel = "Age Adjusted (3-5 years)"; }
  else if (age <= 10) { agePercent = -10; ageLabel = "Age Adjusted (5-10 years)"; }
  else                { agePercent = -18; ageLabel = "Age Adjusted (10+ years)"; }

  if (agePercent !== 0 && ageLabel) {
    const amount = Math.round(Math.abs(basePrice * agePercent / 100));
    factors.push({ label: ageLabel, type: agePercent > 0 ? "premium" : "discount", percent: Math.abs(agePercent), amount });
    adjustedPrice += basePrice * agePercent / 100;
  }

  // ── 3. Demand Premium ─────────────────────
  if (rentalCount >= 5) {
    const demandPercent = 5;
    const amount = Math.round(basePrice * demandPercent / 100);
    factors.push({ label: "High Rental Demand", type: "premium", percent: demandPercent, amount });
    adjustedPrice += basePrice * demandPercent / 100;
  }

  adjustedPrice = Math.round(adjustedPrice);
  const savings = basePrice - adjustedPrice;

  // Demand badge
  let demandBadge: string | null = null;
  if (mileage !== null && mileage < 5000 && age <= 2) demandBadge = "Premium Condition";
  else if (savings > 0 && Math.abs(savings / basePrice) >= 0.08) demandBadge = "Great Value";
  else if (rentalCount >= 5) demandBadge = "High Demand";

  return { basePrice, adjustedPrice, factors, savings, demandBadge };
}
