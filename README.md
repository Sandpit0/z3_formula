# z3-formula

A TypeScript wrapper around [z3-solver](https://www.npmjs.com/package/z3-solver) that lets you write SMT constraints as plain strings instead of using the chained programmatic API.

```ts
// Without the wrapper (raw z3-solver API)
const x = Int.const('x');
const y = Int.const('y');
solver.add(x.add(y).eq(10));
solver.add(x.gt(y));

// With this wrapper
solver.Int('x').Int('y');
solver.assert('x + y == 10');
solver.assert('x > y');
```

## Installation

```bash
npm install z3-formula
```

`z3-solver` is a peer dependency and must be installed alongside it:

```bash
npm install z3-formula z3-solver
```

## Usage

```ts
import { Z3Solver } from 'z3-formula';

const solver = new Z3Solver();

// 1. Declare variables
solver.Int('x');
solver.Int('y');

// 2. Add constraints as strings
solver.assert('x + y == 10');
solver.assert('x > y');
solver.assert('y >= 0');

// 3. Solve
const result = await solver.solve();
// { x: 10n, y: 0n }  — or null if unsatisfiable
```

All methods return `this`, so you can chain everything:

```ts
const result = await new Z3Solver()
  .Int('a').Int('b').Int('c')
  .assert('a + b == c')
  .assert('a * c == 12')
  .assert('a > b').assert('b > 0')
  .solve();
// { a: 3n, b: 1n, c: 4n }
```

## Variable types

| Method | Z3 type | Return type in model |
|---|---|---|
| `.Int('x')` | Integer | `bigint` |
| `.Real('x')` | Real (rational) | `number` |
| `.Bool('x')` | Boolean | `boolean` |
| `.BitVec('x', n)` | n-bit vector | `bigint` |

## Supported operators

### Arithmetic (`Int`, `Real`, `BitVec`)

| Operator | Meaning |
|---|---|
| `+` `-` `*` `/` `%` | add, subtract, multiply, divide, modulo |
| `**` | power (exponentiation) |

### Comparisons (all types)

`==`  `!=`  `<`  `>`  `<=`  `>=`

### Logical (`Bool`)

| Operator | Meaning |
|---|---|
| `&&` | and |
| `\|\|` | or |
| `!` | not |

### Bitwise (`BitVec` only)

| Operator | Meaning |
|---|---|
| `&` `\|` `^` | bitwise and, or, xor |
| `~` | bitwise not (unary) |
| `<<` `>>` | left shift, logical right shift |

## Examples

### Integer arithmetic

```ts
const result = await new Z3Solver()
  .Int('x').Int('y')
  .assert('x + y == 10')
  .assert('x > y').assert('y >= 0')
  .solve();
// { x: 10n, y: 0n }
```

### Boolean logic

```ts
const result = await new Z3Solver()
  .Bool('a').Bool('b').Bool('c')
  .assert('a || b')    // at least one true
  .assert('!a || !b')  // not both true
  .assert('c == a')    // c mirrors a
  .solve();
// { a: false, b: true, c: false }
```

### Real numbers

```ts
const result = await new Z3Solver()
  .Real('x')
  .assert('2 * x + 1 == 5.5')
  .assert('x > 0')
  .solve();
// { x: 2.25 }
```

### Detecting unsatisfiable constraints

`.solve()` returns `null` when no solution exists:

```ts
const result = await new Z3Solver()
  .Int('x')
  .assert('x > 10')
  .assert('x < 5')
  .solve();
// null
```

### Bit vectors

```ts
const result = await new Z3Solver()
  .BitVec('flags', 8)
  .assert('(flags & 15) == 5')  // lower nibble must be 0101
  .solve();
// { flags: 5n }  →  binary: 00000101
```

> **Note on operator precedence:** Bitwise operators (`&`, `|`, `^`) have *lower* precedence than comparisons (`==`, `!=`, …), just like in JavaScript. Always use parentheses when combining them:
> ```ts
> // ✗ parsed as: flags & (15 == 5)
> solver.assert('flags & 15 == 5');
>
> // ✓ correct
> solver.assert('(flags & 15) == 5');
> ```

## Running the examples

```bash
npm run example
```

## Project structure

```
src/
  index.ts    — Z3Solver class (public API)
  parser.ts   — string formula → z3 expression (jsep-based AST walker)
  types.ts    — VarType, Z3Value, SolveResult
  example.ts  — runnable examples
```

## Dependencies

- [`z3-solver`](https://www.npmjs.com/package/z3-solver) — official Z3 WebAssembly bindings
- [`jsep`](https://www.npmjs.com/package/jsep) — lightweight expression parser
