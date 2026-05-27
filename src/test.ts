import { Z3Solver } from './index';

async function run() {
  // Test 1: Int arithmetic + comparison
  console.log('Test 1: x + y == 10, x > y');
  const s1 = new Z3Solver();
  s1.Int('x').Int('y');
  s1.assert('x + y == 10').assert('x > y');
  const r1 = await s1.solve();
  if (r1 && typeof r1.x === 'bigint' && typeof r1.y === 'bigint') {
    const ok = r1.x + r1.y === 10n && r1.x > r1.y;
    console.log(`  x=${r1.x}, y=${r1.y} — ${ok ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('  FAIL (unexpected result):', r1);
  }

  // Test 2: Unsat
  console.log('Test 2: x > 0 && x < 0 (unsat)');
  const s2 = new Z3Solver();
  s2.Int('x');
  s2.assert('x > 0').assert('x < 0');
  const r2 = await s2.solve();
  console.log(`  result=${r2} — ${r2 === null ? 'PASS' : 'FAIL'}`);

  // Test 3: Bool variable
  console.log('Test 3: flag == true');
  const s3 = new Z3Solver();
  s3.Bool('flag');
  s3.assert('flag');
  const r3 = await s3.solve();
  console.log(`  flag=${r3?.flag} — ${r3?.flag === true ? 'PASS' : 'FAIL'}`);

  // Test 4: BitVec — note: parens needed because & has lower precedence than ==
  console.log('Test 4: (bits & 15) == 5  (bits is BitVec 8)');
  const s4 = new Z3Solver();
  s4.BitVec('bits', 8);
  s4.assert('(bits & 15) == 5');
  const r4 = await s4.solve();
  if (r4 && typeof r4.bits === 'bigint') {
    const ok = (r4.bits & 15n) === 5n;
    console.log(`  bits=${r4.bits} — ${ok ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('  FAIL (unexpected result):', r4);
  }

  // Test 5: Real variable
  console.log('Test 5: x + 0.5 == 1.5  (Real)');
  const s5 = new Z3Solver();
  s5.Real('x');
  s5.assert('x + 0.5 == 1.5');
  const r5 = await s5.solve();
  if (r5 && typeof r5.x === 'number') {
    const ok = Math.abs(r5.x - 1) < 1e-9;
    console.log(`  x=${r5.x} — ${ok ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('  FAIL (unexpected result):', r5);
  }

  // Test 6: Chaining
  console.log('Test 6: chained assert calls');
  const s6 = new Z3Solver();
  const r6 = await s6
    .Int('a').Int('b')
    .assert('a * b == 6').assert('a > b').assert('b > 0')
    .solve();
  if (r6 && typeof r6.a === 'bigint' && typeof r6.b === 'bigint') {
    const ok = r6.a * r6.b === 6n && r6.a > r6.b && r6.b > 0n;
    console.log(`  a=${r6.a}, b=${r6.b} — ${ok ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('  FAIL (unexpected result):', r6);
  }
}

run().catch(console.error);
