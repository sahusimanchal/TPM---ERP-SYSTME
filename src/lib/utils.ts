import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian Rupee standard format (e.g., ₹1,23,456.00 or ₹50,000)
 */
export function formatCurrency(amount: number | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? "₹0.00" : "0.00";
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format with standard Indian Rupee commas (2,2,3 grouping)
  const parts = absAmount.toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  const result = `${formattedInt}.${decimalPart}`;

  return `${isNegative ? "-" : ""}${includeSymbol ? "₹" : ""}${result}`;
}

/**
 * Format date strictly as DD-MM-YYYY in Asia/Kolkata timezone
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === "null" || dateStr === "undefined") {
    return "Not Specified";
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // If it's already in DD-MM-YYYY or text
      return dateStr;
    }
    
    // Using Asia/Kolkata format
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get current date string formatted as YYYY-MM-DD for form date inputs in Asia/Kolkata
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate collision-safe category-specific invoice numbers
 * e.g., CEMENT: SE-2026-001, ROD: RD-2026-001, DAILY: S-2026-001
 */
export function generateBillNumber(category: 'cement' | 'rod' | 'daily', existingCount: number): string {
  const prefix = category === 'cement' ? 'SE' : category === 'rod' ? 'RD' : 'S';
  const num = (existingCount + 1).toString().padStart(3, '0');
  return `${prefix}${num}`;
}
