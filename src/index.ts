import { init } from 'z3-solver';
import type { Arith, Bool, BitVec } from 'z3-solver';
import { parseFormula } from './parser';
import type { VarType, SolveResult } from './types';

export type { SolveResult, Z3Value } from './types';

type Z3Var = Arith<'main'> | Bool<'main'> | BitVec<number, 'main'>;

// Cache the init promise so wasm loads only once per process
let initPromise: ReturnType<typeof init> | null = null;
function getZ3() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

export class Z3Solver {
  private varDecls = new Map<string, VarType>();
  private constraints: string[] = [];

  Int(name: string): this {
    this.varDecls.set(name, 'Int');
    return this;
  }

  Real(name: string): this {
    this.varDecls.set(name, 'Real');
    return this;
  }

  Bool(name: string): this {
    this.varDecls.set(name, 'Bool');
    return this;
  }

  BitVec(name: string, size: number): this {
    this.varDecls.set(name, { BitVec: size });
    return this;
  }

  assert(formula: string): this {
    this.constraints.push(formula);
    return this;
  }

  async solve(): Promise<SolveResult> {
    const api = await getZ3();
    const ctx = new api.Context('main');
    const solver = new ctx.Solver();

    // Create z3 variables from declarations
    const vars = new Map<string, Z3Var>();
    for (const [name, type] of this.varDecls) {
      if (type === 'Int') {
        vars.set(name, ctx.Int.const(name));
      } else if (type === 'Real') {
        vars.set(name, ctx.Real.const(name));
      } else if (type === 'Bool') {
        vars.set(name, ctx.Bool.const(name));
      } else {
        vars.set(name, ctx.BitVec.const(name, (type as { BitVec: number }).BitVec));
      }
    }

    // Parse and add each string constraint
    for (const formula of this.constraints) {
      solver.add(parseFormula(formula, vars, ctx));
    }

    const status = await solver.check();
    if (status !== 'sat') return null;

    const model = solver.model();
    const result: Record<string, import('./types').Z3Value> = {};

    for (const [name, varType] of this.varDecls) {
      const v = vars.get(name)!;

      if (varType === 'Int') {
        const evaled = model.eval(v as Arith<'main'>, true);
        if (ctx.isIntVal(evaled)) result[name] = evaled.value();
      } else if (varType === 'Real') {
        const evaled = model.eval(v as Arith<'main'>, true);
        if (ctx.isRealVal(evaled)) result[name] = evaled.asNumber();
      } else if (varType === 'Bool') {
        const evaled = model.eval(v as Bool<'main'>, true);
        result[name] = ctx.isTrue(evaled);
      } else {
        const evaled = model.eval(v as BitVec<number, 'main'>, true);
        if (ctx.isBitVecVal(evaled)) result[name] = evaled.value();
      }
    }

    return result;
  }
}

export default Z3Solver;
