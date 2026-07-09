import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const SRC = join(__dirname, '../../src')

function collectCssFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) results.push(...collectCssFiles(full))
    else if (entry.endsWith('.css')) results.push(full)
  }
  return results
}

describe('text design tokens', () => {
  const variablesCss = readFileSync(join(SRC, 'styles/variables.css'), 'utf8')
  const allCssFiles  = collectCssFiles(SRC)

  it('variables.css defines --text-primary', () => {
    expect(variablesCss).toMatch(/--text-primary\s*:/)
  })

  it('variables.css defines --text-secondary', () => {
    expect(variablesCss).toMatch(/--text-secondary\s*:/)
  })

  it('variables.css does not define --text-muted', () => {
    expect(variablesCss).not.toMatch(/--text-muted\s*:/)
  })

  it('variables.css does not define --text-subtle', () => {
    expect(variablesCss).not.toMatch(/--text-subtle\s*:/)
  })

  it('no CSS module references --text-muted', () => {
    const offenders = allCssFiles.filter(f => readFileSync(f, 'utf8').includes('--text-muted'))
    expect(offenders).toEqual([])
  })

  it('no CSS module references --text-subtle', () => {
    const offenders = allCssFiles.filter(f => readFileSync(f, 'utf8').includes('--text-subtle'))
    expect(offenders).toEqual([])
  })

  it('direction-a light-mode --text-primary is correct', () => {
    const match = variablesCss.match(/\[data-dir="a"\]\[data-theme="light"\][\s\S]*?--text-primary\s*:\s*([^;]+)/)
    expect(match?.[1].trim()).toBe('oklch(0.24 0.02 60)')
  })

  it('direction-a light-mode --text-secondary is correct', () => {
    const match = variablesCss.match(/\[data-dir="a"\]\[data-theme="light"\][\s\S]*?--text-secondary\s*:\s*([^;]+)/)
    expect(match?.[1].trim()).toBe('oklch(0.55 0.015 60)')
  })

  it('direction-a dark-mode --text-primary is correct', () => {
    const match = variablesCss.match(/\[data-dir="a"\]\[data-theme="dark"\][\s\S]*?--text-primary\s*:\s*([^;]+)/)
    expect(match?.[1].trim()).toBe('oklch(0.95 0.008 80)')
  })

  it('direction-a dark-mode --text-secondary is correct', () => {
    const match = variablesCss.match(/\[data-dir="a"\]\[data-theme="dark"\][\s\S]*?--text-secondary\s*:\s*([^;]+)/)
    expect(match?.[1].trim()).toBe('oklch(0.7 0.012 70)')
  })
})
