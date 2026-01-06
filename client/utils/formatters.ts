
/**
 * Formats a number into the Indian currency format (e.g., ₹1,23,456).
 * By default, it rounds to the nearest whole number and displays no decimal places.
 * @param amount The number to format.
 * @param options Optional configuration. Use { maximumFractionDigits: 2 } to show decimals.
 * @returns The formatted currency string.
 */
export const formatCurrency = (
  amount: number,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  }).format(amount);
};

/**
 * Formats a Date object or a date string into a localized date string (e.g., 26/07/2024).
 * @param date The date to format.
 * @returns The formatted date string.
 */
export const formatDate = (date: Date | string): string => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
