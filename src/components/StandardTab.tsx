import React, { useState, useEffect } from 'react';
import { Delete, Trash2 } from 'lucide-react';
import { evaluateExpression } from '../utils/mathParser';
import { HistoryItem } from '../types';

interface StandardTabProps {
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  isDarkMode: boolean;
  triggerFeedback?: () => void;
  expression: string;
  setExpression: React.Dispatch<React.SetStateAction<string>>;
  liveResult: string;
  setLiveResult: React.Dispatch<React.SetStateAction<string>>;
  historyExpression: string;
  setHistoryExpression: React.Dispatch<React.SetStateAction<string>>;
  isDeg: boolean;
  setIsDeg: React.Dispatch<React.SetStateAction<boolean>>;
  parsingError: string | null;
  setParsingError: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function StandardTab({ 
  onAddHistory, 
  isDarkMode, 
  triggerFeedback,
  expression,
  setExpression,
  liveResult,
  setLiveResult,
  historyExpression,
  setHistoryExpression,
  isDeg,
  setIsDeg,
  parsingError,
  setParsingError
}: StandardTabProps) {

  // Track if we just finished evaluating using the "=" key
  const [justEvaluated, setJustEvaluated] = useState(false);

  // Re-calculate the expression in real-time as user types
  useEffect(() => {
    if (justEvaluated) {
      setLiveResult('');
      setParsingError(null);
      return;
    }

    if (!expression || expression.trim() === '' || expression === 'Math Error' || expression === 'Error' || expression === 'Undefined') {
      setLiveResult('');
      setParsingError(null);
      return;
    }

    const { success, result, error } = evaluateExpression(expression, isDeg);
    if (success) {
      setLiveResult(result);
      setParsingError(null);
    } else {
      // Don't show confusing syntax errors immediately unless we click "="
      setLiveResult('');
      setParsingError(error || 'Syntax Error');
    }
  }, [expression, isDeg, justEvaluated]);

  // Handle key press
  const handlePress = (value: string) => {
    if (triggerFeedback) triggerFeedback();
    
    // Check if the screen is currently displaying an error message
    const isErrorState = expression === 'Math Error' || expression === 'Error' || expression === 'Undefined';

    // If we just evaluated the previous expression, handle how the next key interacts with the current result:
    if (justEvaluated && value !== '=' && value !== 'AC') {
      setJustEvaluated(false);
      if (value === '⌫') {
        // Let it fall through to regular backspace handling
      } else {
        const isOperator = ['+', '-', '×', '÷', '^', '%'].includes(value);
        if (isOperator) {
          if (isErrorState) {
            setExpression('0' + value);
          } else {
            setExpression(prev => prev + value);
          }
        } else {
          // If we type a number, decimal, or scientific function, start a clean slate
          setExpression(value);
        }
        return;
      }
    }

    if (value === 'AC') {
      setExpression('');
      setLiveResult('');
      setHistoryExpression('');
      setParsingError(null);
      setJustEvaluated(false);
    } else if (value === '⌫') {
      setJustEvaluated(false);
      if (isErrorState) {
        setExpression('');
        return;
      }
      // If we are deleting a scientific token, backspace it entirely
      // E.g. sin⁻¹(, cos⁻¹(, tan⁻¹(, csc⁻¹(, sec⁻¹(, cot⁻¹(, abs(, log(, sqrt(, ln(
      const multiCharTokens = [
        'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'csc⁻¹(', 'sec⁻¹(', 'cot⁻¹(',
        'sin(', 'cos(', 'tan(', 'csc(', 'sec(', 'cot(',
        'abs(', 'log(', 'ln(', 'abs(', '√('
      ];
      
      let deleted = false;
      for (const token of multiCharTokens) {
        if (expression.endsWith(token)) {
          setExpression(prev => prev.slice(0, -token.length));
          deleted = true;
          break;
        }
      }

      if (!deleted) {
        setExpression(prev => prev.slice(0, -1));
      }
    } else if (value === '=') {
      if (isErrorState) return;
      if (!expression || expression.trim() === '') return;

      const { success, result, error } = evaluateExpression(expression, isDeg);
      if (success && result !== 'Error') {
        const fullExpLog = expression;
        
        // Add item to global history ledger
        onAddHistory({
          type: 'Standard',
          expression: `${fullExpLog} [${isDeg ? 'DEG' : 'RAD'}]`,
          result: result
        });

        // Set state to new current result
        setHistoryExpression(fullExpLog);
        setExpression(result);
        setLiveResult('');
        setParsingError(null);
        setJustEvaluated(true);
      } else {
        const displayErr = error === 'Math Error' ? 'Math Error' : 'Error';
        setHistoryExpression(expression);
        setExpression(displayErr);
        setLiveResult('');
        setParsingError(null);
        setJustEvaluated(true);
      }
    } else {
      setJustEvaluated(false);
      if (isErrorState) {
        // If an operator is clicked, prefix with 0 to prevent syntax errors
        const isOperator = ['+', '-', '×', '÷', '^', '%'].includes(value);
        if (isOperator) {
          setExpression('0' + value);
        } else {
          setExpression(value);
        }
      } else {
        setExpression(prev => prev + value);
      }
    }
  };

  // Auto scale display text size based on length
  const getFontSizeClass = (text: string) => {
    if (text.length > 24) return 'text-xl';
    if (text.length > 18) return 'text-2xl';
    if (text.length > 12) return 'text-3xl';
    return 'text-4xl lg:text-5xl';
  };

  const sciButtons = [
    { label: 'sin', val: 'sin(' },
    { label: 'cos', val: 'cos(' },
    { label: 'tan', val: 'tan(' },
    { label: 'sin⁻¹', val: 'sin⁻¹(' },
    { label: 'cos⁻¹', val: 'cos⁻¹(' },
    { label: 'tan⁻¹', val: 'tan⁻¹(' },

    { label: 'csc', val: 'csc(' },
    { label: 'sec', val: 'sec(' },
    { label: 'cot', val: 'cot(' },
    { label: 'csc⁻¹', val: 'csc⁻¹(' },
    { label: 'sec⁻¹', val: 'sec⁻¹(' },
    { label: 'cot⁻¹', val: 'cot⁻¹(' },

    { label: 'log', val: 'log(' },
    { label: 'ln', val: 'ln(' },
    { label: '√', val: '√(' },
    { label: '^', val: '^' },
    { label: 'π', val: 'π' },
    { label: 'e', val: 'e' },

    { label: '(', val: '(' },
    { label: ')', val: ')' },
    { label: 'x²', val: '^2' },
    { label: 'x³', val: '^3' },
    { label: '|x|', val: 'abs(' },
    { label: '%', val: '%' },
  ];

  return (
    <div id="standard-tab-root" className="flex flex-col h-full w-full justify-between pb-4 overflow-hidden select-none p-1">
      <style>{`
        @media (max-height: 500px) {
          #standard-tab-root {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            overflow: hidden !important;
            padding: 2px !important;
            padding-bottom: 0px !important;
          }
          #standard-display-panel {
            min-height: 72px !important;
            max-height: 96px !important;
            padding: 0.25rem 0.5rem !important;
            margin-bottom: 0px !important;
            flex: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
          }
          #standard-display-panel > div:first-child {
            display: flex !important;
            justify-content: flex-end !important;
            margin-bottom: 0px !important;
          }
          #standard-display-panel .text-right {
            line-height: 1.25 !important;
          }
          #formula-expression {
            font-size: 1.4rem !important;
            margin-top: 0px !important;
          }
          #live-result-preview {
            height: 18px !important;
            min-height: 18px !important;
            font-size: 0.95rem !important;
            margin-top: 2px !important;
          }
          #standard-keyboard-container {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5rem !important;
            height: auto !important;
            flex: 1 !important;
            min-height: 0 !important;
          }
          #sci-grid {
            display: grid !important;
            grid-template-columns: repeat(6, 1fr) !important;
            grid-template-rows: repeat(4, 1fr) !important;
            gap: 0.25rem !important;
            height: 100% !important;
            flex: 1 !important;
          }
          #sci-grid button {
            height: 100% !important;
            border-radius: 0.5rem !important;
            font-size: 11px !important;
            padding: 2px !important;
          }
          #basic-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            grid-template-rows: repeat(5, 1fr) !important;
            gap: 0.25rem !important;
            height: 100% !important;
            flex: 1 !important;
          }
          #basic-grid button {
            height: 100% !important;
            border-radius: 0.5rem !important;
            font-size: 1.05rem !important;
          }
          #basic-grid svg {
            width: 16px !important;
            height: 16px !important;
          }
          #btn-eval {
            height: 100% !important;
          }
        }
      `}</style>
      {/* Top Digital Display Panel - Stretches dynamically to absorb empty space */}
      <div 
        id="standard-display-panel" 
        className={`flex-1 min-h-[120px] max-h-[160px] flex flex-col justify-between p-3 transition-all mb-1 ${
          isDarkMode 
            ? 'bg-transparent border-transparent shadow-none text-neutral-100' 
            : 'bg-transparent border-transparent shadow-none text-slate-900'
        }`}
      >
        {/* Toggle Switch at top & Module Badge */}
        <div className="flex justify-between items-center text-xs">
          <span></span>
          
          <div className={`flex items-center p-0.5 rounded-full font-mono transition-colors ${
            isDarkMode ? 'bg-[#1c1c1e]' : 'bg-slate-100'
          }`}>
            <button
              id="deg-toggle"
              type="button"
              onClick={() => setIsDeg(true)}
              className={`px-3 py-0.5 rounded-full text-[9px] font-black tracking-wider transition-all duration-150 ${
                isDeg 
                  ? 'bg-[#ff9f0a] text-white shadow-sm' 
                  : (isDarkMode ? 'text-neutral-500 hover:text-neutral-300' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              DEG
            </button>
            <button
              id="rad-toggle"
              type="button"
              onClick={() => setIsDeg(false)}
              className={`px-3 py-0.5 rounded-full text-[9px] font-black tracking-wider transition-all duration-150 ${
                !isDeg 
                  ? 'bg-[#ff9f0a] text-white shadow-sm' 
                  : (isDarkMode ? 'text-neutral-500 hover:text-neutral-300' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              RAD
            </button>
          </div>
        </div>

        {/* Expression History */}
        <div className="text-right h-5 text-sm font-mono overflow-hidden opacity-60 text-ellipsis whitespace-nowrap">
          {historyExpression || ' '}
        </div>

        {/* Active input row */}
        <div className="flex flex-col text-right justify-end overflow-hidden">
          <div 
            id="formula-expression" 
            className={`font-mono text-right overflow-x-auto whitespace-nowrap scrollbar-none transition-all ${getFontSizeClass(expression)} font-bold leading-tight`}
          >
            {expression || '0'}
          </div>

          {/* Real-time Dynamic result preview */}
          <div 
            id="live-result-preview" 
            className="text-right h-8 font-mono font-bold text-lg md:text-xl text-green-500 dark:text-green-400 mt-2 min-h-[2rem] flex items-center justify-end"
          >
            {liveResult ? `= ${liveResult}` : (parsingError && expression ? <span className="text-neutral-500/80 text-xs italic">{parsingError}</span> : '')}
          </div>
        </div>
      </div>

      {/* Master Keyboard Container */}
      <div id="standard-keyboard-container" className="flex flex-col gap-2 h-[72%] shrink-0 landscape:grid landscape:grid-cols-2 landscape:gap-2.5 landscape:h-auto landscape:flex-1">
        {/* 40% Middle Scientific Function Grid */}
        <div 
          id="sci-grid" 
          className="grid grid-cols-6 grid-rows-4 gap-1.5 w-full flex-1 min-h-0"
        >
          {sciButtons.map(({ label, val }) => (
            <button
              key={label}
              id={`btn-sci-${label.replace(/⁻¹/g, '-inv').replace(/\|/g, '').replace(/\^/g, 'pow')}`}
              onClick={() => handlePress(val)}
              type="button"
              className={`flex items-center justify-center w-full h-full text-[11px] sm:text-xs font-normal rounded-2xl transition-all duration-150 active:scale-95 ${
                isDarkMode
                  ? 'bg-[#1c1c1e] hover:bg-[#2c2c2e] text-zinc-100 active:bg-neutral-800'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 active:bg-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 35% Bottom Basic Number Pad */}
        <div 
          id="basic-grid" 
          className="grid grid-cols-4 grid-rows-5 gap-2 w-full flex-[1.4] min-h-0"
        >
          {/* Row 1 */}
          <button
            id="btn-ac"
            onClick={() => handlePress('AC')}
            className={`flex items-center justify-center w-full h-full text-sm font-bold rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode 
                ? 'bg-[#2a0b0d] hover:bg-[#3d1316] text-[#ff453a]' 
                : 'bg-rose-50 hover:bg-rose-100/80 text-rose-600 border border-rose-200/40'
            }`}
          >
            AC
          </button>
          <button
            id="btn-back"
            onClick={() => handlePress('⌫')}
            className={`flex items-center justify-center w-full h-full text-sm font-bold rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/30'
            }`}
          >
            <Delete size={18} />
          </button>
          <button
            id="btn-op-div"
            onClick={() => handlePress('÷')}
            className={`flex items-center justify-center w-full h-full text-xl font-bold rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#ff9f0a]' : 'bg-slate-100 hover:bg-slate-200 text-[#ff9f0a] border border-slate-200/30'
            }`}
          >
            ÷
          </button>
          <button
            id="btn-op-mul"
            onClick={() => handlePress('×')}
            className={`flex items-center justify-center w-full h-full text-xl font-bold rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#ff9f0a]' : 'bg-slate-100 hover:bg-slate-200 text-[#ff9f0a] border border-slate-200/30'
            }`}
          >
            ×
          </button>

          {/* Row 2 */}
          <button
            id="btn-num-7"
            onClick={() => handlePress('7')}
            className={`flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            7
          </button>
          <button
            id="btn-num-8"
            onClick={() => handlePress('8')}
            className={`flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            8
          </button>
          <button
            id="btn-num-9"
            onClick={() => handlePress('9')}
            className={`flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            9
          </button>
          <button
            id="btn-op-sub"
            onClick={() => handlePress('-')}
            className={`flex items-center justify-center w-full h-full text-xl font-bold rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#ff9f0a]' : 'bg-slate-100 hover:bg-slate-200 text-[#ff9f0a] border border-slate-200/30'
            }`}
          >
            -
          </button>

          {/* Row 3 */}
          <button
            id="btn-num-4"
            onClick={() => handlePress('4')}
            className={`flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            4
          </button>
          <button
            id="btn-num-5"
            onClick={() => handlePress('5')}
            className={`flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            5
          </button>
          <button
            id="btn-num-6"
            onClick={() => handlePress('6')}
            className={`flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            6
          </button>
          <button
            id="btn-op-add"
            onClick={() => handlePress('+')}
            className={`flex items-center justify-center w-full h-full text-xl font-bold rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#ff9f0a]' : 'bg-slate-100 hover:bg-slate-200 text-[#ff9f0a] border border-slate-200/30'
            }`}
          >
            +
          </button>

          {/* Column layout for 1,2,3,0,.,= with safety orange = spanning 2-rows heights to bottom-right */}
          <button
            id="btn-num-1"
            onClick={() => handlePress('1')}
            className={`flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            1
          </button>
          <button
            id="btn-num-2"
            onClick={() => handlePress('2')}
            className={`flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            2
          </button>
          <button
            id="btn-num-3"
            onClick={() => handlePress('3')}
            className={`flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            3
          </button>

          {/* Safety Orange "=" Button (Row 4 and 5 block position) */}
          <button
            id="btn-eval"
            onClick={() => handlePress('=')}
            className={`row-span-2 flex items-center justify-center text-white w-full h-full font-bold text-3xl shadow-md cursor-pointer transition-all active:scale-95 rounded-2xl bg-[#ff9f0a] hover:bg-[#ffb340] active:brightness-95`}
          >
            =
          </button>

          {/* Row 5 */}
          <button
            id="btn-num-0"
            onClick={() => handlePress('0')}
            className={`col-span-2 flex items-center justify-center w-full h-full text-xl font-medium rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 font-medium hover:bg-slate-200'
            }`}
          >
            0
          </button>
          <button
            id="btn-num-dot"
            onClick={() => handlePress('.')}
            className={`flex items-center justify-center w-full h-full text-xl font-bold rounded-2xl active:scale-95 transition-all duration-150 ${
              isDarkMode ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' : 'bg-slate-100/95 text-slate-800 border border-slate-200/30 hover:bg-slate-200 font-bold'
            }`}
          >
            .
          </button>
        </div>
      </div>
    </div>
  );
}
