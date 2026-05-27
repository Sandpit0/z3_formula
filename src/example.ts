import { Z3Solver } from './index';

// ─── Example 1: Simple integer arithmetic ────────────────────────────────────
// Find two numbers that add up to 10, where x is larger than y.
async function example1() {
  const solver = new Z3Solver();

  solver.Int('x').Int('y');
  solver.assert('x + y == 10');
  solver.assert('x > y');
  solver.assert('y >= 0');

  const result = await solver.solve();
  console.log('Example 1 – x + y = 10, x > y ≥ 0');
  console.log(' ', result); // e.g. { x: 6n, y: 4n }
}

// ─── Example 2: Boolean logic ─────────────────────────────────────────────────
// Find an assignment of boolean variables satisfying a simple formula.
async function example2() {
  const solver = new Z3Solver();

  solver.Bool('a').Bool('b').Bool('c');
  solver.assert('a || b');       // at least one of a, b must be true
  solver.assert('!a || !b');     // they cannot both be true (XOR-like)
  solver.assert('c == a');       // c mirrors a

  const result = await solver.solve();
  console.log('Example 2 – Boolean XOR-like constraint');
  console.log(' ', result); // e.g. { a: true, b: false, c: true }
}

// ─── Example 3: Real-valued constraints ──────────────────────────────────────
// Find a positive real x such that 2x + 1 = 5.5
async function example3() {
  const solver = new Z3Solver();

  solver.Real('x');
  solver.assert('2 * x + 1 == 5.5');
  solver.assert('x > 0');

  const result = await solver.solve();
  console.log('Example 3 – 2x + 1 = 5.5');
  console.log(' ', result); // { x: 2.25 }
}

// ─── Example 4: Unsat (no solution) ──────────────────────────────────────────
// Detect when constraints are contradictory.
async function example4() {
  const solver = new Z3Solver();

  solver.Int('x');
  solver.assert('x > 10');
  solver.assert('x < 5');

  const result = await solver.solve();
  console.log('Example 4 – x > 10 AND x < 5 (contradictory)');
  console.log(' ', result === null ? 'No solution (unsat) ✓' : result);
}

// ─── Example 5: Bit-vector arithmetic ────────────────────────────────────────
// Find an 8-bit value where masking the lower nibble gives 0b0101 (= 5).
// Note: when mixing bitwise (&) with equality (==), use parentheses —
//       & has lower precedence than ==, just like in JavaScript.
async function example5() {
  const solver = new Z3Solver();

  solver.BitVec('flags', 8);
  solver.assert('(flags & 15) == 5');  // lower 4 bits must be 0101
  solver.assert('flags >= 0');

  const result = await solver.solve();
  console.log('Example 5 – BitVec: lower nibble = 5');
  if (result && typeof result.flags === 'bigint') {
    console.log(`  flags = ${result.flags} (binary: ${result.flags.toString(2).padStart(8, '0')})`);
  }
}

// ─── Example 6: Mixed types + chaining ───────────────────────────────────────
// A small puzzle: find positive integers a, b, c where
//   a + b = c  and  a * c = 12  and  a > b
// Solution: a=3, b=1, c=4  (3+1=4, 3*4=12)
async function example6() {
  const result = await new Z3Solver()
    .Int('a').Int('b').Int('c')
    .assert('a + b == c')
    .assert('a * c == 12')
    .assert('a > b')
    .assert('b > 0')
    .solve();

  console.log('Example 6 – a + b = c, a * c = 12, a > b > 0');
  console.log(' ', result);
}

// ─── Run all examples ─────────────────────────────────────────────────────────
(async () => {
  await example1();
  await example2();
  await example3();
  await example4();
  await example5();
  await example6();
})().catch(console.error);
