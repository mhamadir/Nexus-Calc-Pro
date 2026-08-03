import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, Info } from 'lucide-react';
import { HistoryItem } from '../types';

interface MatricesTabProps {
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  isDarkMode: boolean;
  triggerFeedback?: () => void;
  isZoomLocked: boolean;
  setIsZoomLocked: React.Dispatch<React.SetStateAction<boolean>>;
  rowsA: number;
  setRowsA: React.Dispatch<React.SetStateAction<number>>;
  colsA: number;
  setColsA: React.Dispatch<React.SetStateAction<number>>;
  rowsB: number;
  setRowsB: React.Dispatch<React.SetStateAction<number>>;
  colsB: number;
  setColsB: React.Dispatch<React.SetStateAction<number>>;
  matrixA: (number | string)[][];
  setMatrixA: React.Dispatch<React.SetStateAction<(number | string)[][]>>;
  matrixB: (number | string)[][];
  setMatrixB: React.Dispatch<React.SetStateAction<(number | string)[][]>>;
  resultMatrix: number[][] | null;
  setResultMatrix: React.Dispatch<React.SetStateAction<number[][] | null>>;
  resultScalar: number | null;
  setResultScalar: React.Dispatch<React.SetStateAction<number | null>>;
  opLabel: string;
  setOpLabel: React.Dispatch<React.SetStateAction<string>>;
  errorText: string | null;
  setErrorText: React.Dispatch<React.SetStateAction<string | null>>;
  scalarK: string;
  setScalarK: React.Dispatch<React.SetStateAction<string>>;
  isPremiumUnlocked?: boolean;
  onTriggerPaywall?: () => void;
}

const formatMatrixResultString = (matrix: number[][]): string => {
  return '[' + matrix.map(row => '[' + row.map(v => {
    if (Math.abs(v) < 1e-9) return '0';
    if (Number.isInteger(v)) return v.toString();
    return Number(v.toFixed(4)).toString();
  }).join(',') + ']').join(',') + ']';
};

export default function MatricesTab({ 
  onAddHistory: onAddHistoryRaw, 
  isDarkMode, 
  triggerFeedback, 
  isZoomLocked, 
  setIsZoomLocked,
  rowsA,
  setRowsA,
  colsA,
  setColsA,
  rowsB,
  setRowsB,
  colsB,
  setColsB,
  matrixA,
  setMatrixA,
  matrixB,
  setMatrixB,
  resultMatrix,
  setResultMatrix,
  resultScalar,
  setResultScalar,
  opLabel,
  setOpLabel,
  errorText,
  setErrorText,
  scalarK,
  setScalarK,
  isPremiumUnlocked = false,
  onTriggerPaywall
}: MatricesTabProps) {

  // Auto-wipe error state when any relevant inputs change (triggers a fresh input change)
  useEffect(() => {
    setErrorText(null);
  }, [matrixA, matrixB, scalarK, rowsA, colsA, rowsB, colsB, setErrorText]);

  // Initialize/adjust matrices as dimensions change
  const handleDimensionChange = (matrix: 'A' | 'B', type: 'rows' | 'cols', value: number) => {
    setErrorText(null);
    setResultMatrix(null);
    setResultScalar(null);
    setOpLabel('');

    // Allow full 1x1 to 10x10 dimensions for all verified users
    if (matrix === 'A') {
      if (type === 'rows') {
        setRowsA(value);
      } else {
        setColsA(value);
      }
    } else {
      if (type === 'rows') {
        setRowsB(value);
      } else {
        setColsB(value);
      }
    }
  };

  const handleCellChange = (matrix: 'A' | 'B', r: number, c: number, value: string) => {
    setErrorText(null);
    if (matrix === 'A') {
      setMatrixA(prev => {
        const copy = prev.map(row => [...row]);
        copy[r][c] = value;
        return copy;
      });
    } else {
      setMatrixB(prev => {
        const copy = prev.map(row => [...row]);
        copy[r][c] = value;
        return copy;
      });
    }
  };

  const fillRandom = (matrix: 'A' | 'B') => {
    setErrorText(null);
    const rows = matrix === 'A' ? rowsA : rowsB;
    const cols = matrix === 'A' ? colsA : colsB;
    const setter = matrix === 'A' ? setMatrixA : setMatrixB;

    setter(prev => {
      const copy = prev.map(row => [...row]);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          copy[r][c] = Math.floor(Math.random() * 19) - 9; // -9 to 9
        }
      }
      return copy;
    });
  };

  const clearMatrix = (matrix: 'A' | 'B') => {
    setErrorText(null);
    setResultMatrix(null);
    setResultScalar(null);
    setOpLabel('');
    const setter = matrix === 'A' ? setMatrixA : setMatrixB;
    setter(prev => {
      return prev.map(row => row.map(() => ''));
    });
  };

  const swapMatrices = () => {
    setErrorText(null);
    setResultMatrix(null);
    setResultScalar(null);
    setOpLabel('');

    const currentRowsA = rowsA;
    const currentColsA = colsA;
    const currentMatrixA = matrixA;

    const currentRowsB = rowsB;
    const currentColsB = colsB;
    const currentMatrixB = matrixB;

    setRowsA(currentRowsB);
    setColsA(currentColsB);
    setRowsB(currentRowsA);
    setColsB(currentColsA);

    setMatrixA(currentMatrixB);
    setMatrixB(currentMatrixA);
  };

  const resetAll = () => {
    setMatrixA(Array(10).fill(0).map(() => Array(10).fill('')));
    setMatrixB(Array(10).fill(0).map(() => Array(10).fill('')));
    setResultMatrix(null);
    setResultScalar(null);
    setErrorText(null);
    setOpLabel('');
    setScalarK('');
  };

  // Extract submatrix for evaluation bounds
  const getSubmatrix = (m: (number | string)[][], r: number, c: number): number[][] => {
    const active: number[][] = [];
    for (let i = 0; i < r; i++) {
      const parsedRow = m[i].slice(0, c).map(val => {
        if (val === '' || val === undefined || val === null) return 0;
        const num = typeof val === 'number' ? val : parseFloat(val);
        return Number.isNaN(num) ? 0 : num;
      });
      active.push(parsedRow);
    }
    return active;
  };

  // Determinant helper using Row Reduction / Gaussian Elimination (O(n³))
  const determinant = (m: number[][]): number => {
    const n = m.length;
    if (n === 0) return 0;
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    
    // Deep copy the active matrix
    const copy = m.map(row => [...row]);
    let det = 1;

    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(copy[r][i]) > Math.abs(copy[pivotRow][i])) {
          pivotRow = r;
        }
      }

      if (Math.abs(copy[pivotRow][i]) < 1e-9) {
        return 0; // Singular, linear dependence
      }

      if (pivotRow !== i) {
        const temp = copy[i];
        copy[i] = copy[pivotRow];
        copy[pivotRow] = temp;
        det *= -1;
      }

      det *= copy[i][i];

      const pivotVal = copy[i][i];
      for (let r = i + 1; r < n; r++) {
        const factor = copy[r][i] / pivotVal;
        for (let c = i; c < n; c++) {
          copy[r][c] -= factor * copy[i][c];
        }
      }
    }

    return det;
  };

  // Matrix Inverse helper (Gaussian Elimination)
  const invertMatrix = (m: number[][]): number[][] | null => {
    const n = m.length;
    const aug: number[][] = [];
    for (let i = 0; i < n; i++) {
      aug[i] = [...m[i], ...Array(n).fill(0)];
      aug[i][n + i] = 1;
    }

    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r][i]) > Math.abs(aug[pivotRow][i])) {
          pivotRow = r;
        }
      }

      if (Math.abs(aug[pivotRow][i]) < 1e-9) {
        return null; // Singular, det is 0
      }

      if (pivotRow !== i) {
        const temp = aug[i];
        aug[i] = aug[pivotRow];
        aug[pivotRow] = temp;
      }

      const factor = aug[i][i];
      for (let c = i; c < 2 * n; c++) {
        aug[i][c] /= factor;
      }

      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor2 = aug[r][i];
          for (let c = i; c < 2 * n; c++) {
            aug[r][c] -= factor2 * aug[i][c];
          }
        }
      }
    }

    const inv: number[][] = [];
    for (let i = 0; i < n; i++) {
      inv[i] = aug[i].slice(n);
    }
    return inv;
  };

  // Cofactor matrix helper
  const getCofactorMatrix = (m: number[][]): number[][] => {
    const n = m.length;
    if (n === 1) return [[1]];
    const res: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const minor = m
          .filter((_, rIdx) => rIdx !== r)
          .map(row => row.filter((_, cIdx) => cIdx !== c));
        const detOfMinor = determinant(minor);
        const sign = (r + c) % 2 === 0 ? 1 : -1;
        res[r][c] = sign * detOfMinor;
      }
    }
    return res;
  };

  // Wrap raw props onAddHistory to enrich matrix operations with structural inputs/outputs
  const onAddHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const cleanNumber = (num: number): number => {
      if (Math.abs(num) < 1e-9) return 0;
      return Number(num.toFixed(4));
    };

    if (item.type === 'Matrices' && item.details) {
      const details = { ...item.details };
      if (details.matrixA) {
        details.matrixA = details.matrixA.map(row => row.map(cleanNumber));
      }
      if (details.matrixB) {
        details.matrixB = details.matrixB.map(row => row.map(cleanNumber));
      }
      if (details.resultMatrix) {
        details.resultMatrix = details.resultMatrix.map(row => row.map(cleanNumber));
      }
      if (details.resultScalar !== undefined) {
        details.resultScalar = cleanNumber(details.resultScalar);
      }

      // Re-format absolute string results with cleaned/rounded precision values
      if (details.resultMatrix) {
        item.result = formatMatrixResultString(details.resultMatrix);
      } else if (details.resultScalar !== undefined) {
        item.result = details.resultScalar.toString();
      }

      item.details = details;
    }
    onAddHistoryRaw(item);
  };

  // Operations Runner
  const handleOperation = (op: string) => {
    setErrorText(null);
    setResultMatrix(null);
    setResultScalar(null);
    setOpLabel(op);

    const activeA = getSubmatrix(matrixA, rowsA, colsA);
    const activeB = getSubmatrix(matrixB, rowsB, colsB);

    // Matrix Multiplication helper to be reused
    const multiplyMatrices = (A: number[][], B: number[][]): number[][] | null => {
      const rA = A.length;
      const cA = A[0].length;
      const rB = B.length;
      const cB = B[0].length;
      if (cA !== rB) return null;

      const res: number[][] = Array(rA).fill(0).map(() => Array(cB).fill(0));
      for (let i = 0; i < rA; i++) {
        for (let j = 0; j < cB; j++) {
          let sum = 0;
          for (let k = 0; k < cA; k++) {
            sum += A[i][k] * B[k][j];
          }
          res[i][j] = sum;
        }
      }
      return res;
    };

    switch (op) {
      case 'A + B': {
        if (rowsA !== rowsB || colsA !== colsB) {
          setErrorText('Addition requires equal dimensions (A and B must match).');
          return;
        }
        const res = activeA.map((row, r) => row.map((val, c) => val + activeB[r][c]));
        setResultMatrix(res);
        onAddHistory({
          type: 'Matrices',
          expression: `Matrix Addition [A(${rowsA}x${colsA}) + B(${rowsB}x${colsB})]`,
          result: formatMatrixResultString(res),
          details: {
            matrixA: activeA.map(row => [...row]),
            matrixB: activeB.map(row => [...row]),
            resultMatrix: res.map(row => [...row]),
            operation: 'A + B'
          }
        });
        break;
      }
      case 'A - B': {
        if (rowsA !== rowsB || colsA !== colsB) {
          setErrorText('Subtraction requires equal dimensions (A and B must match).');
          return;
        }
        const res = activeA.map((row, r) => row.map((val, c) => val - activeB[r][c]));
        setResultMatrix(res);
        onAddHistory({
          type: 'Matrices',
          expression: `Matrix Subtraction [A(${rowsA}x${colsA}) - B(${rowsB}x${colsB})]`,
          result: formatMatrixResultString(res),
          details: {
            matrixA: activeA.map(row => [...row]),
            matrixB: activeB.map(row => [...row]),
            resultMatrix: res.map(row => [...row]),
            operation: 'A - B'
          }
        });
        break;
      }
      case 'A × B': {
        const res = multiplyMatrices(activeA, activeB);
        if (!res) {
          setErrorText(`Multiplication requires Columns of A (${colsA}) count to equal Rows of B (${rowsB}).`);
          return;
        }
        setResultMatrix(res);
        onAddHistory({
          type: 'Matrices',
          expression: `Matrix Multiply [A(${rowsA}x${colsA}) × B(${rowsB}x${colsB})]`,
          result: formatMatrixResultString(res),
          details: {
            matrixA: activeA.map(row => [...row]),
            matrixB: activeB.map(row => [...row]),
            resultMatrix: res.map(row => [...row]),
            operation: 'A × B'
          }
        });
        break;
      }
      case 'det(A)': {
        if (rowsA !== colsA) {
          setErrorText('Determinant requires a square matrix (Matrix A must be NxN).');
          return;
        }
        const det = determinant(activeA);
        setResultScalar(det);
        onAddHistory({
          type: 'Matrices',
          expression: `det(A) of size ${rowsA}x${colsA}`,
          result: det.toString(),
          details: {
            matrixA: activeA.map(row => [...row]),
            resultScalar: det,
            operation: 'det(A)'
          }
        });
        break;
      }
      case 'det(A×B)': {
        const prod = multiplyMatrices(activeA, activeB);
        if (!prod) {
          setErrorText(`Multiplication failed. Col A (${colsA}) must equal Row B (${rowsB}).`);
          return;
        }
        if (prod.length !== prod[0].length) {
          setErrorText('Result of A×B is not square. Cannot assess determinant.');
          return;
        }
        const det = determinant(prod);
        setResultScalar(det);
        onAddHistory({
          type: 'Matrices',
          expression: `det(A×B) of size ${prod.length}x${prod[0].length}`,
          result: det.toString(),
          details: {
            matrixA: activeA.map(row => [...row]),
            matrixB: activeB.map(row => [...row]),
            resultScalar: det,
            operation: 'det(A×B)'
          }
        });
        break;
      }
      case 'Aᵀ': {
        const trans: number[][] = Array(colsA).fill(0).map(() => Array(rowsA).fill(0));
        for (let r = 0; r < rowsA; r++) {
          for (let c = 0; c < colsA; c++) {
            trans[c][r] = activeA[r][c];
          }
        }
        setResultMatrix(trans);
        onAddHistory({
          type: 'Matrices',
          expression: `Matrix Transpose [Aᵀ] size ${colsA}x${rowsA}`,
          result: formatMatrixResultString(trans),
          details: {
            matrixA: activeA.map(row => [...row]),
            resultMatrix: trans.map(row => [...row]),
            operation: 'Aᵀ'
          }
        });
        break;
      }
      case '(A×B)ᵀ': {
        const prod = multiplyMatrices(activeA, activeB);
        if (!prod) {
          setErrorText(`Col A (${colsA}) must equal Row B (${rowsB}) for product transpose.`);
          return;
        }
        const rProd = prod.length;
        const cProd = prod[0].length;
        const trans: number[][] = Array(cProd).fill(0).map(() => Array(rProd).fill(0));
        for (let r = 0; r < rProd; r++) {
          for (let c = 0; c < cProd; c++) {
            trans[c][r] = prod[r][c];
          }
        }
        setResultMatrix(trans);
        onAddHistory({
          type: 'Matrices',
          expression: `Product Transpose [(A×B)ᵀ] size ${cProd}x${rProd}`,
          result: formatMatrixResultString(trans),
          details: {
            matrixA: activeA.map(row => [...row]),
            matrixB: activeB.map(row => [...row]),
            resultMatrix: trans.map(row => [...row]),
            operation: '(A×B)ᵀ'
          }
        });
        break;
      }
      case 'A⁻¹ Inverse': {
        if (rowsA !== colsA) {
          setErrorText('Inverse operates only on Square matrices (Matrix A size must match).');
          return;
        }
        const inv = invertMatrix(activeA);
        if (!inv) {
          setErrorText('Matrix A is singular / non-invertible (determinant is 0).');
          return;
        }
        setResultMatrix(inv);
        onAddHistory({
          type: 'Matrices',
          expression: `A⁻¹ Inverse of size ${rowsA}x${colsA}`,
          result: formatMatrixResultString(inv),
          details: {
            matrixA: activeA.map(row => [...row]),
            resultMatrix: inv.map(row => [...row]),
            operation: 'A⁻¹ Inverse'
          }
        });
        break;
      }
      case '(A×B)⁻¹': {
        const prod = multiplyMatrices(activeA, activeB);
        if (!prod) {
          setErrorText(`Col A (${colsA}) must equal Row B (${rowsB}) for matrix product multiplication.`);
          return;
        }
        if (prod.length !== prod[0].length) {
          setErrorText('Product matrix A×B is not square. No inverse exists.');
          return;
        }
        const inv = invertMatrix(prod);
        if (!inv) {
          setErrorText('The multiplied product A×B is singular / non-invertible (determinant is 0).');
          return;
        }
        setResultMatrix(inv);
        onAddHistory({
          type: 'Matrices',
          expression: `(A×B)⁻¹ Inverse of size ${prod.length}x${prod[0].length}`,
          result: formatMatrixResultString(inv),
          details: {
            matrixA: activeA.map(row => [...row]),
            matrixB: activeB.map(row => [...row]),
            resultMatrix: inv.map(row => [...row]),
            operation: '(A×B)⁻¹'
          }
        });
        break;
      }
      case 'A × B⁻¹': {
        if (rowsB !== colsB) {
          setErrorText('Computing B⁻¹ requires Matrix B to be a square matrix (Matrix B size must be NxN).');
          return;
        }
        const invB = invertMatrix(activeB);
        if (!invB) {
          setErrorText('Matrix B is singular / non-invertible (determinant is 0), so B⁻¹ cannot be computed.');
          return;
        }
        const res = multiplyMatrices(activeA, invB);
        if (!res) {
          setErrorText(`Multiplication failed. Columns of A (${colsA}) must equal Rows of B⁻¹ (${invB.length}).`);
          return;
        }
        setResultMatrix(res);
        onAddHistory({
          type: 'Matrices',
          expression: `Matrix Multiply [A × B⁻¹] of size ${rowsA}x${colsB}`,
          result: formatMatrixResultString(res),
          details: {
            matrixA: activeA.map(row => [...row]),
            matrixB: activeB.map(row => [...row]),
            resultMatrix: res.map(row => [...row]),
            operation: 'A × B⁻¹'
          }
        });
        break;
      }
      case 'Cofactor(A)': {
        if (rowsA !== colsA) {
          setErrorText('Cofactor matrix requires a square matrix (Matrix A must be NxN).');
          return;
        }
        const res = getCofactorMatrix(activeA);
        setResultMatrix(res);
        onAddHistory({
          type: 'Matrices',
          expression: `Cofactor(A) of size ${rowsA}x${colsA}`,
          result: formatMatrixResultString(res),
          details: {
            matrixA: activeA.map(row => [...row]),
            resultMatrix: res.map(row => [...row]),
            operation: 'Cofactor(A)'
          }
        });
        break;
      }
      case 'adj(A)': {
        if (rowsA !== colsA) {
          setErrorText('Adjugate matrix requires a square matrix (Matrix A must be NxN).');
          return;
        }
        const cofactors = getCofactorMatrix(activeA);
        const n = cofactors.length;
        const adj: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            adj[c][r] = cofactors[r][c];
          }
        }
        setResultMatrix(adj);
        onAddHistory({
          type: 'Matrices',
          expression: `adj(A) of size ${rowsA}x${colsA}`,
          result: formatMatrixResultString(adj),
          details: {
            matrixA: activeA.map(row => [...row]),
            resultMatrix: adj.map(row => [...row]),
            operation: 'adj(A)'
          }
        });
        break;
      }
      case 'tr(A)': {
        if (rowsA !== colsA) {
          setErrorText('Trace requires a square matrix (Matrix A must be NxN).');
          return;
        }
        let sum = 0;
        for (let i = 0; i < rowsA; i++) {
          sum += activeA[i][i];
        }
        setResultScalar(sum);
        onAddHistory({
          type: 'Matrices',
          expression: `tr(A) of size ${rowsA}x${colsA}`,
          result: sum.toString(),
          details: {
            matrixA: activeA.map(row => [...row]),
            resultScalar: sum,
            operation: 'tr(A)'
          }
        });
        break;
      }
      case 'k × A': {
        let parsedFactor: number;
        if (scalarK === '') {
          parsedFactor = 1;
        } else {
          const factor = parseFloat(scalarK);
          parsedFactor = Number.isNaN(factor) ? 1 : factor;
        }
        const res = activeA.map(row => row.map(val => val * parsedFactor));
        setResultMatrix(res);
        onAddHistory({
          type: 'Matrices',
          expression: `Scalar multiplication [${parsedFactor} × A]`,
          result: formatMatrixResultString(res),
          details: {
            matrixA: activeA.map(row => [...row]),
            resultMatrix: res.map(row => [...row]),
            operation: `k × A`
          }
        });
        break;
      }
      case 'A^n': {
        if (rowsA !== colsA) {
          setErrorText('Matrix power A^n requires a square matrix (Matrix A must be NxN).');
          return;
        }
        let n: number;
        if (scalarK === '') {
          n = 2; // Baseline integer fallback
        } else {
          n = parseInt(scalarK, 10);
          if (Number.isNaN(n)) n = 2;
        }

        let base = activeA.map(row => [...row]);
        if (n < 0) {
          const invA = invertMatrix(base);
          if (!invA) {
            setErrorText('Matrix A is singular / non-invertible, cannot compute negative power A^n.');
            return;
          }
          base = invA;
          n = Math.abs(n);
        }

        let res: number[][];
        if (n === 0) {
          res = Array(rowsA).fill(0).map((_, i) => {
            const row = Array(rowsA).fill(0);
            row[i] = 1; // Identity
            return row;
          });
        } else {
          res = base.map(row => [...row]);
          for (let p = 1; p < n; p++) {
            const next = multiplyMatrices(res, base);
            if (!next) {
              setErrorText('Calculation error computing matrix power.');
              return;
            }
            res = next;
          }
        }

        setResultMatrix(res);
        onAddHistory({
          type: 'Matrices',
          expression: `Matrix Power [A^${n}] of size ${rowsA}x${colsA}`,
          result: formatMatrixResultString(res),
          details: {
            matrixA: activeA.map(row => [...row]),
            resultMatrix: res.map(row => [...row]),
            operation: `A^n`
          }
        });
        break;
      }
      default:
        break;
    }
  };
  const getCellSize = (colsCount?: number) => {
    return '95px';
  };

  const getCellInputClass = (cols?: number) => {
    return `w-[95px] h-[50px] min-w-[95px] min-h-[50px] max-w-[95px] max-h-[50px] text-sm rounded-lg text-center font-mono border focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold transition-colors ${
      isDarkMode 
        ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-700/85 hover:bg-neutral-850' 
        : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-300 hover:bg-slate-50'
    }`;
  };

  const getResultCellClass = (cols: number) => {
    if (cols >= 7) {
      return "text-[10px] font-bold text-emerald-500 min-w-[60px] px-1.5 mt-0.5 whitespace-nowrap shrink-0";
    }
    if (cols >= 5) {
      return "text-xs font-bold text-emerald-500 min-w-[68px] px-1.5 whitespace-nowrap shrink-0";
    }
    return "text-sm font-bold text-emerald-500 min-w-[80px] px-2 whitespace-nowrap shrink-0";
  };

  const getResultGapClass = (cols: number) => {
    if (cols >= 7) {
      return "grid gap-1.5 w-full";
    }
    if (cols >= 5) {
      return "grid gap-2 w-full";
    }
    return "grid gap-4 w-full";
  };

  const formatNumber = (num: number) => {
    if (Math.abs(num) < 1e-9) return '0';
    if (num.toString().includes('.')) {
      return Number(num.toFixed(4)).toString();
    }
    return num.toString();
  };

  return (
    <div className={`flex flex-col w-full h-full min-h-full overflow-y-auto pr-1 select-none text-xs ${isDarkMode ? 'bg-zinc-950 text-neutral-100' : 'bg-white text-slate-800'}`}>
      
      {/* Scrollable stacking panel */}
      <div id="matrices-panel" className="space-y-4 pb-4">

        {/* Dimensions and Cells Matrix A */}
        <div className={`p-4 rounded-xl border shadow-sm transition-all duration-150 ${isDarkMode ? 'bg-neutral-900 border-neutral-800/70' : 'bg-slate-50 border-slate-200/60'}`}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className={`font-black uppercase tracking-wider text-[11px] ${isDarkMode ? 'text-amber-500' : 'text-slate-800'}`}>Matrix A ({rowsA}x{colsA})</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                id="btn-clear-a"
                onClick={() => { if (triggerFeedback) triggerFeedback(); clearMatrix('A'); }}
                className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition-all border ${
                  isDarkMode 
                    ? 'bg-neutral-800 hover:bg-neutral-750 border-neutral-700/50 text-neutral-300' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Clear
              </button>
              <button
                id="btn-random-a"
                onClick={() => { if (triggerFeedback) triggerFeedback(); fillRandom('A'); }}
                className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition-all border ${
                  isDarkMode 
                    ? 'bg-neutral-800 hover:bg-neutral-750 border-neutral-700/50 text-neutral-300' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Randomize
              </button>
            </div>
          </div>

          {/* Dimension selectors Row/Cols */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Rows</p>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                  <button
                    key={v}
                    id={`btn-dim-rowsA-${v}`}
                    onClick={() => { if (triggerFeedback) triggerFeedback(); handleDimensionChange('A', 'rows', v); }}
                    className={`py-1 rounded-md font-semibold text-[9px] text-center transition-all ${
                      rowsA === v 
                        ? 'bg-amber-500 text-neutral-900 shadow-sm font-bold' 
                        : (isDarkMode ? 'bg-neutral-800 border border-neutral-700/65 text-neutral-300 hover:bg-neutral-750' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100/60')
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Columns</p>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                  <button
                    key={v}
                    id={`btn-dim-colsA-${v}`}
                    onClick={() => { if (triggerFeedback) triggerFeedback(); handleDimensionChange('A', 'cols', v); }}
                    className={`py-1 rounded-md font-semibold text-[9px] text-center transition-all ${
                      colsA === v 
                        ? 'bg-amber-500 text-neutral-900 shadow-sm font-bold' 
                        : (isDarkMode ? 'bg-neutral-800 border border-neutral-700/65 text-neutral-300 hover:bg-neutral-750' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100/60')
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Core Entry Grid wrapped in a dual-axis scroll container with unyielding dimensions */}
          <div 
            className="w-full max-h-[450px] rounded-xl select-none scrollbar-none bg-transparent border-transparent"
            style={{ overflowX: 'auto', overflowY: 'auto' }}
          >
            <div 
              id="matrix-grid-a"
              style={{ 
                gridTemplateColumns: `repeat(${colsA}, ${getCellSize(colsA)})`,
                width: 'max-content',
                height: 'max-content'
              }}
              className="grid gap-1.5 p-1.5 rounded bg-transparent mx-auto"
            >
              {Array(rowsA).fill(0).map((_, r) => (
                Array(colsA).fill(0).map((__, c) => (
                  <input
                    key={`A-${r}-${c}`}
                    id={`cell-A-${r}-${c}`}
                    type="number"
                    pattern="[0-9.-]*"
                    inputMode="decimal"
                    value={matrixA[r][c] ?? ''}
                    placeholder="0"
                    onFocus={(e) => {
                      if (matrixA[r][c] === 0 || matrixA[r][c] === '0') {
                        handleCellChange('A', r, c, '');
                      } else {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => handleCellChange('A', r, c, e.target.value)}
                    className={getCellInputClass(colsA)}
                  />
                ))
              ))}
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center py-1">
          <button
            id="btn-swap-matrices"
            type="button"
            onClick={() => {
              if (triggerFeedback) triggerFeedback();
              swapMatrices();
            }}
            className={`px-5 py-2 rounded-full border shadow-sm flex items-center justify-center space-x-1.5 transition-all text-sm uppercase tracking-wider font-sans italic font-extrabold select-none cursor-pointer active:scale-[0.97] duration-75 ${
              isDarkMode 
                ? 'bg-neutral-900/50 border-neutral-800/70 hover:bg-neutral-850/50 text-indigo-400 hover:text-indigo-300' 
                : 'bg-slate-100/40 border-slate-200 hover:bg-slate-200/40 text-indigo-600 hover:text-indigo-750'
            }`}
          >
            <span>SWAP A ⇄ B</span>
          </button>
        </div>

        {/* Dimensions and Cells Matrix B */}
        <div className={`p-4 rounded-xl border shadow-sm transition-all duration-150 ${isDarkMode ? 'bg-neutral-900 border-neutral-800/70' : 'bg-slate-50 border-slate-200/60'}`}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className={`font-black uppercase tracking-wider text-[11px] ${isDarkMode ? 'text-amber-500' : 'text-slate-800'}`}>Matrix B ({rowsB}x{colsB})</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                id="btn-clear-b"
                onClick={() => { if (triggerFeedback) triggerFeedback(); clearMatrix('B'); }}
                className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition-all border ${
                  isDarkMode 
                    ? 'bg-neutral-800 hover:bg-neutral-750 border-neutral-700/50 text-neutral-300' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Clear
              </button>
              <button
                id="btn-random-b"
                onClick={() => { if (triggerFeedback) triggerFeedback(); fillRandom('B'); }}
                className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition-all border ${
                  isDarkMode 
                    ? 'bg-neutral-800 hover:bg-neutral-750 border-neutral-700/50 text-neutral-300' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Randomize
              </button>
            </div>
          </div>

          {/* Dimension selectors Row/Cols */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Rows</p>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                  <button
                    key={v}
                    id={`btn-dim-rowsB-${v}`}
                    onClick={() => { if (triggerFeedback) triggerFeedback(); handleDimensionChange('B', 'rows', v); }}
                    className={`py-1 rounded-md font-semibold text-[9px] text-center transition-all ${
                      rowsB === v 
                        ? 'bg-amber-500 text-neutral-900 shadow-sm font-bold' 
                        : (isDarkMode ? 'bg-neutral-800 border border-neutral-700/65 text-neutral-300 hover:bg-neutral-750' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100/60')
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Columns</p>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                  <button
                    key={v}
                    id={`btn-dim-colsB-${v}`}
                    onClick={() => { if (triggerFeedback) triggerFeedback(); handleDimensionChange('B', 'cols', v); }}
                    className={`py-1 rounded-md font-semibold text-[9px] text-center transition-all ${
                      colsB === v 
                        ? 'bg-amber-500 text-neutral-900 shadow-sm font-bold font-sans' 
                        : (isDarkMode ? 'bg-neutral-800 border border-neutral-700/65 text-neutral-300 hover:bg-neutral-750' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100/60')
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Core Entry Grid wrapped in a dual-axis scroll container with unyielding dimensions */}
          <div 
            className="w-full max-h-[450px] rounded-xl select-none scrollbar-none bg-transparent border-transparent"
            style={{ overflowX: 'auto', overflowY: 'auto' }}
          >
            <div 
              id="matrix-grid-b"
              style={{ 
                gridTemplateColumns: `repeat(${colsB}, ${getCellSize(colsB)})`,
                width: 'max-content',
                height: 'max-content'
              }}
              className="grid gap-1.5 p-1.5 rounded bg-transparent mx-auto"
            >
              {Array(rowsB).fill(0).map((_, r) => (
                Array(colsB).fill(0).map((__, c) => (
                  <input
                    key={`B-${r}-${c}`}
                    id={`cell-B-${r}-${c}`}
                    type="number"
                    pattern="[0-9.-]*"
                    inputMode="decimal"
                    value={matrixB[r][c] ?? ''}
                    placeholder="0"
                    onFocus={(e) => {
                      if (matrixB[r][c] === 0 || matrixB[r][c] === '0') {
                        handleCellChange('B', r, c, '');
                      } else {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => handleCellChange('B', r, c, e.target.value)}
                    className={getCellInputClass(colsB)}
                  />
                ))
              ))}
            </div>
          </div>
        </div>

        {/* Operations Suite (Dashboard) */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
            <span className={`font-bold text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Execute Matrix Actions</span>
            <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-md border ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[9px] font-bold text-neutral-400 uppercase">k:</span>
              <input
                id="scalar-k-input"
                type="number"
                pattern="[0-9.-]*"
                inputMode="decimal"
                value={scalarK}
                onChange={(e) => setScalarK(e.target.value)}
                className={`w-9 text-center font-mono font-bold text-[9px] focus:outline-none bg-transparent ${
                  isDarkMode 
                    ? 'text-white' 
                    : 'text-slate-80'
                }`}
              />
            </div>
            <button
              id="btn-matrix-reset"
              onClick={() => { if (triggerFeedback) triggerFeedback(); resetAll(); }}
              className="text-[10px] text-rose-500 font-semibold uppercase hover:underline"
            >
              Reset
            </button>
          </div>

          {/* Dashboard actions buttons */}
          <div id="matrices-operations-suite" className="grid grid-cols-3 gap-1.5 font-sans">
            {[
              'A + B', 'A - B', 'A × B',
              'det(A)', 'det(A×B)', 'Aᵀ',
              '(A×B)ᵀ', 'A⁻¹ Inverse', '(A×B)⁻¹', 'A × B⁻¹',
              'Cofactor(A)', 'adj(A)', 'tr(A)', 'k × A', 'A^n'
            ].map((op) => {
              return (
                <button
                  key={op}
                  id={`btn-op-matrix-${op.replace(/ /g, '-').replace(/×/g, 'mul').replace(/ᵀ/g, 'trans').replace(/⁻¹/g, 'inv').replace(/\(/g, '').replace(/\)/g, '').replace(/\^/g, 'pow')}`}
                  onClick={() => { if (triggerFeedback) triggerFeedback(); handleOperation(op); }}
                  className={`py-1.5 px-0.5 rounded-lg font-bold text-[9px] text-center uppercase shadow-sm transition-transform active:scale-[0.97] duration-75 border ${
                    opLabel === op
                      ? 'bg-amber-500 text-neutral-900 border-amber-600'
                      : (isDarkMode ? 'bg-neutral-800 hover:bg-neutral-750 border-neutral-750 text-neutral-200' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700')
                  }`}
                >
                  {op}
                </button>
              );
            })}
          </div>
        </div>

        {/* Output Evaluation Error or Result Banner */}
        {(errorText || resultMatrix || resultScalar !== null) && (
          <div 
            id="matrix-evaluation-output" 
            className={`p-3 rounded-xl border transition-all duration-150 shadow-sm ${
              errorText 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-450' 
                : (isDarkMode ? 'bg-neutral-900/90 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50/50 border-emerald-500/20 text-emerald-850')
            }`}
          >
            <p className="font-bold tracking-wider uppercase text-[10px] mb-2 font-mono flex items-center space-x-1">
              <span>★ Result Log</span>
              <span className="opacity-60">{opLabel && `[ ${opLabel} ]`}</span>
            </p>

            {errorText ? (
              <p className="text-sm font-medium">{errorText}</p>
            ) : (
              <div id="matrix-result-container">
                {/* Scalar result (like determinant) */}
                {resultScalar !== null && (
                  <div id="scalar-result-box" className="text-center py-2 flex flex-col items-center">
                    <span className={`text-[9px] font-bold tracking-wide block mb-3 uppercase ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      Result Scalar
                    </span>
                    <span className={`text-2xl font-black font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {formatNumber(resultScalar)}
                    </span>
                  </div>
                )}

                {/* Matrix result */}
                {resultMatrix !== null && (
                  <div id="matrix-result-box" className="flex flex-col items-center text-center">
                    <span className={`text-[9px] font-bold tracking-wide block mb-3.5 uppercase ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      Result Dimension: {resultMatrix.length} × {resultMatrix[0].length}
                    </span>
                    
                    {/* Bracket outline matrix rendering */}
                    <div className="w-full overflow-x-auto overflow-y-hidden clear-both block">
                      <div className="inline-block min-w-full align-middle text-center p-2">
                        <div className="w-fit mx-auto flex items-center px-6 py-2 border-l-2 border-r-2 border-emerald-500/60 rounded-lg bg-transparent">
                          <div className="grid gap-2 text-center select-all font-mono">
                            {resultMatrix.map((row, rIdx) => (
                              <div 
                                key={`ans-r-${rIdx}`} 
                                style={{ gridTemplateColumns: `repeat(${row.length}, minmax(max-content, 1fr))` }}
                                className={getResultGapClass(row.length)}
                              >
                                {row.map((val, cIdx) => (
                                  <span 
                                    key={`ans-c-${cIdx}`} 
                                    title={formatNumber(val)}
                                    className={getResultCellClass(row.length)}
                                  >
                                    {formatNumber(val)}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
