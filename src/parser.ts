import jsep from 'jsep';
import type { Arith, Bool, BitVec, Context } from 'z3-solver';

type Z3Var = Arith<'main'> | Bool<'main'> | BitVec<number, 'main'>;
type Z3ExprOrLit = Z3Var | number | bigint | boolean;

function litToArith(v: number | bigint, ctx: Context<'main'>, preferReal = false): Arith<'main'> {
  // When the other operand is Real, create a Real literal to avoid Int/Real sort mismatch.
  if (preferReal) return ctx.Real.val(typeof v === 'bigint' ? Number(v) : v);
  if (typeof v === 'bigint') return ctx.from(v);
  if (Number.isInteger(v)) return ctx.from(BigInt(v));
  return ctx.from(v) as Arith<'main'>;
}

function toBool(v: Z3ExprOrLit, ctx: Context<'main'>): Bool<'main'> {
  if (ctx.isBool(v)) return v as Bool<'main'>;
  if (typeof v === 'boolean') return ctx.from(v);
  throw new Error(`Expected Bool expression`);
}

function applyBinaryOp(
  op: string,
  left: Z3ExprOrLit,
  right: Z3ExprOrLit,
  ctx: Context<'main'>,
): Z3ExprOrLit {
  // Logical
  if (op === '&&') return ctx.And(toBool(left, ctx), toBool(right, ctx));
  if (op === '||') return ctx.Or(toBool(left, ctx), toBool(right, ctx));

  // Arithmetic (left is z3 Arith)
  if (ctx.isArith(left)) {
    const a = left as Arith<'main'>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = right as any;
    switch (op) {
      case '+': return a.add(r);
      case '-': return a.sub(r);
      case '*': return a.mul(r);
      case '/': return a.div(r);
      case '%': return a.mod(r);
      case '**': return a.pow(r);
      case '==': return a.eq(r);
      case '!=': return a.neq(r);
      case '<': return a.lt(r);
      case '>': return a.gt(r);
      case '<=': return a.le(r);
      case '>=': return a.ge(r);
    }
  }

  // Arithmetic (right is z3 Arith, literal on left)
  if ((typeof left === 'number' || typeof left === 'bigint') && ctx.isArith(right)) {
    const a = litToArith(left, ctx, ctx.isReal(right));
    const r = right as Arith<'main'>;
    switch (op) {
      case '+': return a.add(r);
      case '-': return a.sub(r);
      case '*': return a.mul(r);
      case '/': return a.div(r);
      case '%': return a.mod(r);
      case '**': return a.pow(r);
      case '==': return a.eq(r);
      case '!=': return a.neq(r);
      case '<': return a.lt(r);
      case '>': return a.gt(r);
      case '<=': return a.le(r);
      case '>=': return a.ge(r);
    }
  }

  // Bool equality
  if (ctx.isBool(left)) {
    const b = left as Bool<'main'>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = right as any;
    if (op === '==') return b.eq(r);
    if (op === '!=') return b.neq(r);
    throw new Error(`Operator '${op}' is not supported for Bool expressions`);
  }

  // BitVec (left is z3 BitVec)
  if (ctx.isBitVec(left)) {
    const bv = left as BitVec<number, 'main'>;
    // Arithmetic and bitwise ops accept CoercibleToBitVec (number | bigint | BitVec) directly.
    // Equality ops use CoercibleToExpr which coerces numbers to Int — incompatible with BitVec.
    // So for equality/comparison we must produce a same-sized BitVec literal from raw numbers.
    const toBvLit = (v: Z3ExprOrLit) => {
      if (ctx.isBitVec(v)) return v as BitVec<number, 'main'>;
      if (typeof v === 'number') return ctx.BitVec.val(BigInt(v), bv.size());
      if (typeof v === 'bigint') return ctx.BitVec.val(v, bv.size());
      throw new Error('BitVec operand must be a bitvector or numeric literal');
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = right as any;
    switch (op) {
      case '+': return bv.add(r);
      case '-': return bv.sub(r);
      case '*': return bv.mul(r);
      case '/': return bv.udiv(r);
      case '%': return bv.urem(r);
      case '&': return bv.and(r);
      case '|': return bv.or(r);
      case '^': return bv.xor(r);
      case '<<': return bv.shl(r);
      case '>>': return bv.lshr(r);
      case '==': return bv.eq(toBvLit(right));
      case '!=': return bv.neq(toBvLit(right));
      case '<': return bv.ult(toBvLit(right));
      case '>': return bv.ugt(toBvLit(right));
      case '<=': return bv.ule(toBvLit(right));
      case '>=': return bv.uge(toBvLit(right));
    }
  }

  // Both literals — evaluate in JS
  if (typeof left === 'number' && typeof right === 'number') {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
    }
  }

  throw new Error(`Operator '${op}' is not supported for the given operand types`);
}

function walk(
  node: jsep.Expression,
  vars: Map<string, Z3Var>,
  ctx: Context<'main'>,
): Z3ExprOrLit {
  switch (node.type) {
    case 'Literal': {
      const { value } = node as jsep.Literal;
      if (typeof value === 'number' || typeof value === 'boolean') return value;
      throw new Error(`Unsupported literal value: ${String(value)}`);
    }

    case 'Identifier': {
      const { name } = node as jsep.Identifier;
      if (name === 'true') return true;
      if (name === 'false') return false;
      const v = vars.get(name);
      if (v === undefined) throw new Error(`Unknown variable: "${name}"`);
      return v;
    }

    case 'UnaryExpression': {
      const { operator, argument } = node as jsep.UnaryExpression;
      const arg = walk(argument, vars, ctx);
      switch (operator) {
        case '!':
          return ctx.Not(toBool(arg, ctx));
        case '-':
          if (ctx.isArith(arg)) return (arg as Arith<'main'>).neg();
          if (ctx.isBitVec(arg)) return (arg as BitVec<number, 'main'>).neg();
          if (typeof arg === 'number') return -arg;
          if (typeof arg === 'bigint') return -arg;
          throw new Error(`Unary '-' not supported for this expression type`);
        case '+':
          return arg;
        case '~':
          if (ctx.isBitVec(arg)) return (arg as BitVec<number, 'main'>).not();
          throw new Error(`'~' requires a BitVec expression`);
        default:
          throw new Error(`Unsupported unary operator: '${operator}'`);
      }
    }

    case 'BinaryExpression': {
      const { operator, left, right } = node as jsep.BinaryExpression;
      return applyBinaryOp(
        operator,
        walk(left, vars, ctx),
        walk(right, vars, ctx),
        ctx,
      );
    }

    default:
      throw new Error(`Unsupported expression node type: '${node.type}'`);
  }
}

export function parseFormula(
  formula: string,
  vars: Map<string, Z3Var>,
  ctx: Context<'main'>,
): Bool<'main'> {
  const ast = jsep(formula);
  const result = walk(ast, vars, ctx);
  if (ctx.isBool(result)) return result as Bool<'main'>;
  if (typeof result === 'boolean') return ctx.from(result);
  throw new Error(
    `Formula "${formula}" does not produce a boolean constraint. ` +
    `Wrap it in a comparison (e.g. "x == 5" instead of "x + 5").`,
  );
}
