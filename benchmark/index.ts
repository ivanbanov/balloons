import { Bench } from 'tinybench'
import { assertParity, runMicrotaskProbe, scenarios } from './scenarios'

// sanity first: the numbers only mean anything if both engines agree
console.log(await assertParity())

const bench = new Bench({ time: 500 })

for (const scenario of scenarios) {
  bench.add(scenario.name, scenario.run)
}

console.log('\nsingle compute + fan-out (offset + flip + shift, corner reference)\n')
await bench.run()
console.table(bench.table())

console.log('\nmicrotask ticks until the result is usable (0 = same call stack)\n')
console.table(await runMicrotaskProbe())
