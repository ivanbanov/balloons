import { assertParity, runMicrotaskProbe, scenarios } from '../../scenarios'

const runButton = document.querySelector<HTMLButtonElement>('#run')!
const results = document.querySelector<HTMLDivElement>('#results')!

// Deliberately simple wall-clock sampling — the demo is a visual snapshot;
// the tinybench suite in benchmark/ is the one the /benchmark flow trusts.
async function opsPerSecond(run: () => unknown, milliseconds = 300): Promise<number> {
  const start = performance.now()
  let operations = 0
  while (performance.now() - start < milliseconds) {
    const result = run()
    if (result instanceof Promise) await result
    operations++
  }
  return Math.round((operations / (performance.now() - start)) * 1000)
}

function renderTable(rows: [string, string][]): string {
  const body = rows.map(([name, value]) => `<tr><td>${name}</td><td>${value}</td></tr>`).join('')
  return `<table><tr><th>case</th><th>result</th></tr>${body}</table>`
}

runButton.addEventListener('click', () => {
  void (async () => {
    runButton.disabled = true
    results.textContent = 'running…'
    const rows: [string, string][] = []
    rows.push(['parity', await assertParity()])
    for (const scenario of scenarios) {
      rows.push([scenario.name, `${(await opsPerSecond(scenario.run)).toLocaleString()} ops/s`])
    }
    const [probe] = await runMicrotaskProbe()
    for (const [name, ticks] of Object.entries(probe)) {
      rows.push([`microtask ticks - ${name}`, String(ticks)])
    }
    results.innerHTML = renderTable(rows)
    runButton.disabled = false
  })()
})
