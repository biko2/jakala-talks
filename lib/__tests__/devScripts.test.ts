import { readFileSync } from 'fs'
import { join } from 'path'

describe('scripts de desarrollo', () => {
  it('yarn dev:mock debe ser alias de yarn dev', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '../../package.json'), 'utf8')
    ) as { scripts: Record<string, string> }

    expect(pkg.scripts['dev:mock']).toBe(pkg.scripts.dev)
  })
})
