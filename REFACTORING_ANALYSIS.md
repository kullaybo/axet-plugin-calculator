# aXet Calculator — Refactoring Analysis
**aXet.plugin Developer Learning Activity**
**Date:** 18 November 2026

---

## Overview

The original calculator was committed to `master` as a single JavaScript file with two functions and inline HTML event handlers. The refactored version — developed on `feature/axet-plugin-refactoring` — rewrites the same application with a focus on separation of concerns, testability, and extensibility. The analysis below uses objective, measurable evidence drawn directly from the two versions of the codebase.

---

## Quantitative Snapshot

| Metric | Original | Refactored | Change |
|---|---|---|---|
| `app.js` lines (as measured by git) | 38 | 208 | +170 (history feature + JSDoc) |
| Number of functions | 2 | 13 | +11 |
| `document.getElementById()` calls | 9 | 0 | −9 |
| Inline HTML event handlers (`onclick`) | 2 | 0 | −2 |
| Pure / DOM-free functions | 0 | 4 | +4 |
| Functions with JSDoc | 0 | 11 | +11 |
| Errors handled explicitly | 2 | 4 | +2 |
| Operators added to support: | requires 2 edits | requires 1 edit | simplified |

> The increase in line count is explained by: (a) the entirely new history feature (~60 lines), (b) JSDoc blocks (~40 lines), and (c) section headers and blank lines (~30 lines). Pure functional logic did not expand disproportionately.

---

## 1. Reduced Duplication

**Before:**  
`document.getElementById(...)` was called **9 times** across two functions — the same four DOM elements were queried on every button click at runtime.

| Element ID queried | Occurrences |
|---|---|
| `"result"` | 4 |
| `"number1"` | 2 |
| `"number2"` | 2 |
| `"operator"` | 1 |
| **Total** | **9** |

The four arithmetic operations were each written as an independent `if` block with a repeated `result = ...` assignment:

```js
if (operator === "+") { result = number1 + number2; }
if (operator === "-") { result = number1 - number2; }
if (operator === "*") { result = number1 * number2; }
if (operator === "/") { ... result = number1 / number2; }
```

**After:**  
All DOM references are resolved **once at module startup** into named constants. Zero `document.getElementById()` calls appear inside any function body. Each DOM node is named once and referenced by that name everywhere.

Arithmetic operations are stored in an `OPERATIONS` dispatch table:

```js
const OPERATIONS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
};
```

Adding or changing an operator requires editing **one entry in one object**.

---

## 2. Number and Responsibility of Functions

**Before — 2 functions, multiple concerns each:**

| Function | Concerns mixed in |
|---|---|
| `calculate()` | DOM read, input parsing, NaN validation, arithmetic (4 branches), divide-by-zero guard, DOM write |
| `clearCalculator()` | DOM write to 2 inputs + result display (operator dropdown not reset — silent bug) |

**After — 13 functions, one concern each:**

| Function | Single Responsibility |
|---|---|
| `validateInputs()` | Returns `{valid, error?}` — no DOM access |
| `performCalculation()` | Returns `{success, result?, error?}` — no DOM access |
| `formatExpression()` | Formats display string — pure |
| `formatTimestamp()` | Formats ISO time to locale string — pure |
| `createHistoryEntry()` | Builds history data object — pure |
| `addToHistory()` | Prepends to history array and triggers render |
| `clearHistory()` | Empties history array and triggers render |
| `renderHistory()` | Rebuilds the `<ul>` from current history state |
| `displayResult()` | Single DOM write to the result element |
| `getInputValues()` | Single DOM read; returns plain `{a, b, op}` object |
| `handleCalculate()` | Orchestrates: validate → calculate → display → history |
| `handleClear()` | Resets all inputs and clears result display |
| `init()` | Binds all event listeners; renders initial empty state |

Each function is independently readable, replaceable, and testable.

---

## 3. Separation Between Calculation and UI Logic

**Before:**  
`calculate()` performed arithmetic and wrote to the DOM in the same function body. The two concerns were inseparable:

```js
// arithmetic
result = number1 + number2;
// DOM write — in the same function
document.getElementById("result").innerText = result;
```

**After:**  
A clear three-layer architecture is established:

| Layer | Functions | DOM access |
|---|---|---|
| **Pure logic** | `validateInputs`, `performCalculation`, `formatExpression`, `formatTimestamp` | None |
| **State / history** | `createHistoryEntry`, `addToHistory`, `clearHistory`, `renderHistory` | `renderHistory` only |
| **UI / event** | `getInputValues`, `displayResult`, `handleCalculate`, `handleClear`, `init` | Yes (by design) |

The pure logic layer can be extracted to a separate module, imported in a Node test suite, or reused in a different UI (e.g., a CLI or REST endpoint) **without modification**.

---

## 4. Maintainability

**Before:**
- Two `onclick` attributes in `index.html` hard-coded JavaScript function names in markup, coupling HTML and JS. Renaming a function required editing both files.
- `clearCalculator()` omitted the operator dropdown reset — selecting `÷`, pressing Clear, then calculating in the next session would retain `÷` in the DOM while the select showed `+`.
- Extending to a fifth operator (e.g., `%` modulo) required: writing a new `if` block inside `calculate()`, finding the right place to insert it, and ensuring it did not accidentally fall through.

**After:**
- Event binding lives in `init()` via `addEventListener`. The HTML carries only stable `id` attributes. Renaming or replacing a handler requires changing **one line in one file**; the HTML is never touched.
- `handleClear()` explicitly resets `operatorSel.value = '+'`, eliminating the original omission.
- Adding modulo support requires **two additions** only: one entry in `OPERATIONS` and one in `OPERATOR_SYMBOLS`.
- `'use strict'` mode and an IIFE prevent accidental global variable pollution — the original `calculate` and `clearCalculator` were global functions, polluting `window`.

---

## 5. Readability

**Before:**
- No structural sections, no comments, no documentation.
- Four sequential `if` statements evaluated top-to-bottom regardless of which branch matched (not `else if`), causing unnecessary comparisons.
- `let result;` declared at function top. If no branch matched (impossible for the given select, but structurally possible), `undefined` was silently written to the DOM.

**After:**
- `app.js` is divided into eight clearly labelled sections with separator comments: *Constants*, *State*, *DOM References*, *Pure calculation logic*, *History management*, *UI helpers*, *Event handlers*, *Initialisation*.
- **11 of 13 functions carry JSDoc** annotations with `@param` types, `@returns` description, and example output.
- The dispatch table makes the complete set of valid operators visible in four lines.
- Every code path in `handleCalculate()` explicitly calls `displayResult(...)` — no silent `undefined` can reach the DOM.

---

## 6. Testability

**Before:**  
Zero functions are unit-testable in isolation. `calculate()` calls `document.getElementById()` on its first executed line. A Node-based test runner (Jest, Mocha) would throw `ReferenceError: document is not defined` before any assertion could run.

**After:**  
Four pure functions are testable in a bare Node environment with no DOM setup:

```js
validateInputs(NaN, 5);
// → { valid: false, error: 'Please enter valid numbers.' }

performCalculation(10, '/', 0);
// → { success: false, error: 'Cannot divide by zero.' }

performCalculation(12, '*', 8);
// → { success: true, result: 96 }

formatExpression(12, '*', 8, 96);
// → "12 × 8 = 96"

formatTimestamp('2026-11-18T10:34:07.000Z');
// → "10:34:07"
```

| Testability metric | Original | Refactored |
|---|---|---|
| Functions testable without DOM | 0 of 2 | 4 of 13 |
| Functions returning value objects | 0 | 3 |
| Functions tightly coupled to global DOM | 2 of 2 | 5 of 13 (UI layer only) |

---

## 7. Input Validation

**Before:**  
One NaN guard inside `calculate()`. No other edge cases were handled:

```js
if (isNaN(number1) || isNaN(number2)) {
    document.getElementById("result").innerText = "Please enter valid numbers.";
    return;
}
```

If an operator that did not match any `if` branch were somehow passed (e.g., during future extension), `result` remained `undefined` and was written silently to the DOM with no error message.

**After:**  
Validation is split into two dedicated, composable functions:

| Check | Location | Returns |
|---|---|---|
| Non-numeric inputs | `validateInputs()` | `{ valid: false, error: '...' }` |
| Unknown operator | `performCalculation()` | `{ success: false, error: 'Unknown operator.' }` |
| Division by zero | `performCalculation()` | `{ success: false, error: 'Cannot divide by zero.' }` |
| Non-finite result | `performCalculation()` | `{ success: false, error: 'Result is out of range.' }` |

The refactored code handles **4 error conditions** compared to **2** in the original. All validation returns structured objects rather than writing directly to the DOM, keeping validation logic DOM-independent.

---

## 8. Error Handling

**Before:**  
Errors were handled inline by writing a string directly to `document.getElementById("result").innerText` and returning. This pattern was repeated twice within `calculate()`, each time re-querying the same DOM node.

**After:**  
Error handling follows a consistent pattern throughout `handleCalculate()`:

```js
const validation = validateInputs(a, b);
if (!validation.valid) { displayResult(validation.error); return; }

const calculation = performCalculation(a, op, b);
if (!calculation.success) { displayResult(calculation.error); return; }
```

- Error messages are owned by the functions that detect the problem, not scattered through a coordinator.
- `displayResult()` is the single point of DOM interaction for all outcomes (error or success).
- Two previously unhandled error conditions are now explicitly caught: unknown operator and non-finite result.

---

## 9. Extensibility

**Before:**  
The original design required modifying the monolithic `calculate()` function to extend any behaviour. No feature could be added without touching existing, working code.

**After:**  
Each layer is independently extensible:

| Extension scenario | Original effort | Refactored effort |
|---|---|---|
| Add a new operator (e.g., `%`) | Edit `calculate()` — add `if` block | Add 1 entry to `OPERATIONS`, 1 to `OPERATOR_SYMBOLS` |
| Add a new error condition | Edit `calculate()` inline | Add a guard in `performCalculation()`; coordinator unchanged |
| Add calculation history | Requires restructuring `calculate()` | New `createHistoryEntry` / `addToHistory` / `renderHistory` added without touching calculation logic |
| Support keyboard input | Add event listener coupled to `calculate()` | Add listener in `init()` calling `handleCalculate()` — zero other changes |
| Export calculation logic to API | Impossible without refactoring | Extract the pure logic layer with no changes required |

The history feature itself — absent in the original — was added entirely within new functions without altering `validateInputs()` or `performCalculation()`.

---

## 10. Developer Efficiency

**Before:**  
A developer investigating a bug in the divide-by-zero behaviour would need to read the entire `calculate()` function (mixed with input reading, four operator branches, and DOM writes) to find the relevant guard.

**After:**  
- Section headers and JSDoc allow a developer to jump directly to the relevant function.
- `performCalculation()` is 20 lines. Its JSDoc states: *"Returns a result object — never throws."* The divide-by-zero guard is on lines 10–12 of that function. No surrounding context is required.
- Cached DOM references eliminate repeated string lookups — `resultEl` is self-documenting; `document.getElementById("result")` requires the developer to remember the HTML ID string.
- The IIFE scope prevents naming conflicts when other scripts are added to the page, reducing the risk of integration bugs.

---

## Summary

| Dimension | Original | Refactored |
|---|---|---|
| Duplication | 9 repeated DOM queries; 4 duplicated `if` blocks | 0 repeated DOM queries; 1 dispatch table |
| Functions | 2, with mixed concerns | 13, each single-responsibility |
| Calc / UI separation | None — fully mixed | Strict three-layer separation |
| Maintainability | HTML–JS coupling; missing operator reset | Decoupled; all bugs corrected |
| Readability | No structure, no docs | 8 sections; 11/13 JSDoc; named constants |
| Testability | 0 pure functions | 4 pure functions, no DOM mocking needed |
| Validation | 2 conditions, inline | 4 conditions, in dedicated functions |
| Error handling | Repeated inline DOM writes | Single `displayResult()` exit point |
| Extensibility | Must modify working code | Open for extension at every layer |
| Developer efficiency | Full function read required for any change | Navigable by section and JSDoc |

The refactoring demonstrates a measurable shift from a **feature-first, monolithic** approach to a **concern-separated, testable** architecture — without changing the external behaviour of the original two operations (addition, subtraction, multiplication, division) and without introducing any breaking changes to the user interface.
