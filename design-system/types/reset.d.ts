// Source: totaltypescript.com/ts-reset
// Globally narrows TS stdlib types:
//   JSON.parse() → unknown (was any)
//   .filter(Boolean) → correctly narrows null/undefined
//   Array.isArray() → narrows generic T[] | undefined
//   Storage.getItem() → better narrowing
import "@total-typescript/ts-reset";
