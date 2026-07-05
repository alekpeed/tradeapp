import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Account } from '@shared/types'

function toAccount(row: unknown): Account {
  const r = row as Record<string, unknown>
  return {
    id: r.id as number,
    name: r.name as string,
    kind: r.kind as Account['kind'],
    institution: (r.institution as string) ?? null,
    costBasisMethod: r.cost_basis_method as Account['costBasisMethod'],
    createdAt: r.created_at as string
  }
}

export function registerAccountHandlers(db: Database.Database): void {
  ipcMain.handle('accounts:list', () => {
    const rows = db.prepare(`SELECT * FROM accounts ORDER BY name`).all()
    return rows.map(toAccount)
  })

  ipcMain.handle(
    'accounts:create',
    (
      _event,
      input: { name: string; kind: Account['kind']; institution?: string; costBasisMethod: Account['costBasisMethod'] }
    ) => {
      const info = db
        .prepare(
          `INSERT INTO accounts (name, kind, institution, cost_basis_method)
           VALUES (@name, @kind, @institution, @costBasisMethod)`
        )
        .run({
          name: input.name,
          kind: input.kind,
          institution: input.institution ?? null,
          costBasisMethod: input.costBasisMethod
        })
      const row = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(info.lastInsertRowid)
      return toAccount(row)
    }
  )
}
