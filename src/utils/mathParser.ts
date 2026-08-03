/**
 * Safe Mathematical Expression Evaluator with implicit division, Balance-brackets,
 * and DEG/RAD trig configuration support.
 */

export function evaluateExpression(expr: string, isDeg: boolean): { success: boolean; result: string; error?: string } {
  if (!expr || expr.trim() === '') {
    return { success: true, result: '' };
  }

  try {
    let s = expr;

    // 1. Basic cleaning and standardizing operators
    s = s.replace(/÷/g, '/');
    s = s.replace(/×/g, '*');

    // 2. Standarized scientific display functions to javascript-evaluatable identifiers
    s = s.replace(/sin⁻¹\(/g, 'asin(');
    s = s.replace(/cos⁻¹\(/g, 'acos(');
    s = s.replace(/tan⁻¹\(/g, 'atan(');
    s = s.replace(/csc⁻¹\(/g, 'acsc(');
    s = s.replace(/sec⁻¹\(/g, 'asec(');
    s = s.replace(/cot⁻¹\(/g, 'acot(');
    
    s = s.replace(/sin\(/g, 'sin(');
    s = s.replace(/cos\(/g, 'cos(');
    s = s.replace(/tan\(/g, 'tan(');
    s = s.replace(/csc\(/g, 'csc(');
    s = s.replace(/sec\(/g, 'sec(');
    s = s.replace(/cot\(/g, 'cot(');
    
    s = s.replace(/log\(/g, 'log(');
    s = s.replace(/ln\(/g, 'ln(');
    s = s.replace(/√\(/g, 'sqrt(');
    s = s.replace(/abs\(/g, 'abs(');
    s = s.replace(/π/g, '_pi');
    s = s.replace(/e/g, '_e');
    s = s.replace(/\^/g, '**');
    s = s.replace(/%/g, '/100');

    // 3. Implicit Multiplication Processing
    // [Number] [Letters/Parentheses]: e.g., 9sin -> 9*sin, 9( -> 9*(, 9_pi -> 9*_pi
    s = s.replace(/(\d+(?:\.\d+)?)\s*(?=[a-zA-Z_\(])/g, '$1*');

    // [Closing Parenthesis] [Number/Letters/Parentheses]: e.g., )9 -> )*9, )( -> )*(, )sin -> )*sin
    s = s.replace(/\)\s*(?=[0-9a-zA-Z_\(])/g, ')*');

    // [Constants] [Number/Letters/Parentheses]: e.g., _pi _e -> _pi*_e, _pi( -> _pi*(
    s = s.replace(/(_pi|_e)\s*(?=[0-9a-zA-Z_\(])/g, '$1*');
    
    // Constant preceded by constant or letter: e.g., e_pi -> e*_pi
    s = s.replace(/([a-zA-Z_])\s*(?=_pi|_e)/g, '$1*');

    // 4. Auto-closing unbalanced parenthetical expressions
    const openCount = (s.match(/\(/g) || []).length;
    const closeCount = (s.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      s += ')'.repeat(openCount - closeCount);
    }

    // 5. Setup helper mathematical variables & actions for the evaluator scope
    const _pi = Math.PI;
    const _e = Math.E;

    // Define trigonometric helpers depending on DEG/RAD state
    const sin = (x: number) => isDeg ? Math.sin(x * Math.PI / 180) : Math.sin(x);
    const cos = (x: number) => isDeg ? Math.cos(x * Math.PI / 180) : Math.cos(x);
    const tan = (x: number) => isDeg ? Math.tan(x * Math.PI / 180) : Math.tan(x);

    const csc = (x: number) => {
      const denom = sin(x);
      if (Math.abs(denom) < 1e-15) throw new Error('Cosecant Div by Zero');
      return 1 / denom;
    };
    const sec = (x: number) => {
      const denom = cos(x);
      if (Math.abs(denom) < 1e-15) throw new Error('Secant Div by Zero');
      return 1 / denom;
    };
    const cot = (x: number) => {
      const denom = tan(x);
      if (Math.abs(denom) < 1e-15) throw new Error('Cotangent Div by Zero');
      return 1 / denom;
    };

    // Inverse trigonometric helpers (DEG: outputs in degrees, RAD: outputs in radians)
    const asin = (x: number) => {
      if (x < -1 || x > 1) throw new Error('Math Error');
      const res = Math.asin(x);
      return isDeg ? (res * 180 / Math.PI) : res;
    };
    const acos = (x: number) => {
      if (x < -1 || x > 1) throw new Error('Math Error');
      const res = Math.acos(x);
      return isDeg ? (res * 180 / Math.PI) : res;
    };
    const atan = (x: number) => {
      const res = Math.atan(x);
      return isDeg ? (res * 180 / Math.PI) : res;
    };

    const acsc = (x: number) => {
      if (Math.abs(x) < 1) throw new Error('csc⁻¹ domain error (|x| >= 1)');
      return asin(1 / x);
    };
    const asec = (x: number) => {
      if (Math.abs(x) < 1) throw new Error('sec⁻¹ domain error (|x| >= 1)');
      return acos(1 / x);
    };
    const acot = (x: number) => {
      if (Math.abs(x) < 1e-15) {
        // cotangent is 0 when angle is pi/2 or 90
        return isDeg ? 90 : Math.PI / 2;
      }
      return atan(1 / x);
    };

    // Standard scientific helpers
    const log = (x: number) => {
      if (x <= 0) throw new Error('Log domain error (x > 0)');
      return Math.log10(x);
    };
    const ln = (x: number) => {
      if (x <= 0) throw new Error('Ln domain error (x > 0)');
      return Math.log(x);
    };
    const sqrt = (x: number) => {
      if (x < 0) throw new Error('Square root of negative number');
      return Math.sqrt(x);
    };
    const abs = (x: number) => Math.abs(x);

    // Dynamic execution inside bounded function scope (Prevents access to global window exploits)
    const evaluator = new Function(
      'sin', 'cos', 'tan', 'csc', 'sec', 'cot',
      'asin', 'acos', 'atan', 'acsc', 'asec', 'acot',
      'log', 'ln', 'sqrt', 'abs', '_pi', '_e',
      `return (${s});`
    );

    const calculatedValue = evaluator(
      sin, cos, tan, csc, sec, cot,
      asin, acos, atan, acsc, asec, acot,
      log, ln, sqrt, abs, _pi, _e
    );

    if (calculatedValue === undefined || calculatedValue === null || Number.isNaN(calculatedValue)) {
      return { success: false, result: 'Error', error: 'Invalid expression' };
    }

    if (!Number.isFinite(calculatedValue)) {
      return { success: false, result: 'Error', error: 'Infinite division or overflow' };
    }

    // Format output beautifully
    let formatted = calculatedValue.toString();
    if (Math.abs(calculatedValue) < 1e-12) {
      formatted = '0';
    } else if (formatted.includes('.')) {
      // Limit decimals for representation
      const parts = formatted.split('.');
      if (parts[1].length > 8) {
        formatted = Number(calculatedValue.toFixed(8)).toString(); // Remove trailing zeros
      }
    }

    return { success: true, result: formatted };
  } catch (err: any) {
    return { success: false, result: 'Error', error: err?.message || 'Syntax Error' };
  }
}
