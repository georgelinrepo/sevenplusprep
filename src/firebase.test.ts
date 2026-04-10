// src/firebase.test.ts
import { describe, it, expect, vi } from 'vitest'

// We test the shape of functions, not Firebase internals
describe('firebase module', () => {
  it('exports db and functions', async () => {
    // Just verify the module loads without error
    const mod = await import('./firebase')
    expect(mod.db).toBeDefined()
    expect(mod.fns).toBeDefined()
  })
})
