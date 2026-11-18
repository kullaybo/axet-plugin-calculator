(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const OPERATIONS = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
  };

  const OPERATOR_SYMBOLS = {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const history = [];

  // ---------------------------------------------------------------------------
  // DOM References  (resolved once at startup)
  // ---------------------------------------------------------------------------

  const num1Input    = document.getElementById('number1');
  const num2Input    = document.getElementById('number2');
  const operatorSel  = document.getElementById('operator');
  const resultEl     = document.getElementById('result');
  const historyList  = document.getElementById('history-list');
  const calcBtn      = document.getElementById('calc-btn');
  const clearBtn     = document.getElementById('clear-btn');
  const clearHistBtn = document.getElementById('clear-history-btn');

  // ---------------------------------------------------------------------------
  // Pure calculation logic  (no DOM access — fully unit-testable)
  // ---------------------------------------------------------------------------

  /**
   * Validates that both operands are finite numbers.
   * @param {number} a
   * @param {number} b
   * @returns {{ valid: boolean, error?: string }}
   */
  function validateInputs(a, b) {
    if (isNaN(a) || isNaN(b)) {
      return { valid: false, error: 'Please enter valid numbers.' };
    }
    return { valid: true };
  }

  /**
   * Performs the arithmetic operation for the given operator.
   * Returns a result object — never throws.
   * @param {number} a
   * @param {string} operator
   * @param {number} b
   * @returns {{ success: boolean, result?: number, error?: string }}
   */
  function performCalculation(a, operator, b) {
    const operation = OPERATIONS[operator];

    if (!operation) {
      return { success: false, error: 'Unknown operator.' };
    }

    if (operator === '/' && b === 0) {
      return { success: false, error: 'Cannot divide by zero.' };
    }

    const result = operation(a, b);

    if (!isFinite(result)) {
      return { success: false, error: 'Result is out of range.' };
    }

    return { success: true, result };
  }

  /**
   * Builds a human-readable expression string.
   * @param {number} a
   * @param {string} operator
   * @param {number} b
   * @param {number} result
   * @returns {string}  e.g. "12 × 8 = 96"
   */
  function formatExpression(a, operator, b, result) {
    const symbol = OPERATOR_SYMBOLS[operator] || operator;
    return `${a} ${symbol} ${b} = ${result}`;
  }

  /**
   * Formats an ISO timestamp string as a short local time.
   * @param {string} isoString
   * @returns {string}  e.g. "10:34:07"
   */
  function formatTimestamp(isoString) {
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  // ---------------------------------------------------------------------------
  // History management
  // ---------------------------------------------------------------------------

  /**
   * Creates a new history entry object.
   * @param {number} a
   * @param {string} operator
   * @param {number} b
   * @param {number} result
   * @returns {object}
   */
  function createHistoryEntry(a, operator, b, result) {
    return {
      id:         history.length + 1,
      operand1:   a,
      operator,
      operand2:   b,
      result,
      timestamp:  new Date().toISOString(),
      expression: formatExpression(a, operator, b, result),
    };
  }

  /**
   * Prepends an entry to the history array and re-renders the list.
   * @param {object} entry
   */
  function addToHistory(entry) {
    history.unshift(entry);
    renderHistory();
  }

  /** Empties the history array and re-renders the list. */
  function clearHistory() {
    history.length = 0;
    renderHistory();
  }

  /** Rebuilds the history <ul> from the current history array. */
  function renderHistory() {
    historyList.innerHTML = '';

    if (history.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'history-empty';
      emptyItem.textContent = 'No calculations yet.';
      historyList.appendChild(emptyItem);
      return;
    }

    history.forEach(function (entry) {
      const li   = document.createElement('li');
      li.className = 'history-item';

      const expr = document.createElement('span');
      expr.className   = 'history-expression';
      expr.textContent = entry.expression;

      const time = document.createElement('span');
      time.className   = 'history-timestamp';
      time.textContent = formatTimestamp(entry.timestamp);

      li.appendChild(expr);
      li.appendChild(time);
      historyList.appendChild(li);
    });
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  /**
   * Writes a message to the result display element.
   * @param {string|number} message
   */
  function displayResult(message) {
    resultEl.textContent = String(message);
  }

  /**
   * Reads and parses the current input values from the DOM.
   * @returns {{ a: number, b: number, op: string }}
   */
  function getInputValues() {
    return {
      a:  parseFloat(num1Input.value),
      b:  parseFloat(num2Input.value),
      op: operatorSel.value,
    };
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handleCalculate() {
    const { a, b, op } = getInputValues();

    const validation = validateInputs(a, b);
    if (!validation.valid) {
      displayResult(validation.error);
      return;
    }

    const calculation = performCalculation(a, op, b);
    if (!calculation.success) {
      displayResult(calculation.error);
      return;
    }

    displayResult(calculation.result);
    addToHistory(createHistoryEntry(a, op, b, calculation.result));
  }

  function handleClear() {
    num1Input.value   = '';
    num2Input.value   = '';
    operatorSel.value = '+';
    displayResult('No calculation performed');
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  function init() {
    calcBtn.addEventListener('click', handleCalculate);
    clearBtn.addEventListener('click', handleClear);
    clearHistBtn.addEventListener('click', clearHistory);
    renderHistory(); // render empty state on page load
  }

  init();
}());
