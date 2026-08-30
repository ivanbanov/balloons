import { defineConfig } from 'vite'

// BASE_PATH is set by deploy-benchmark.yml so the Pages deploy serves from
// /balloons/benchmark/demo/.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
})
