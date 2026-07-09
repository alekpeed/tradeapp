import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { NetWorthItem, NewNetWorthItemInput } from '@shared/types'

function toNetWorthItem(row: unknown): NetWorthItem {
  const r = row as Record<string, unknown>
  return {
    id: r.id as number,
    category: r.category as NetWorthItem['category'],
    name: r.name as string,
    value: r.value as number,
    originalValue: (r.original_value as number) ?? null,
    acquiredDate: (r.acquired_date as string) ?? null,
    notes: (r.notes as string) ?? null,
    createdAt: r.created_at as string
  }
}

export function registerNetWorthItemHandlers(db: Database.Database): void {
  ipcMain.handle('netWorthItems:list', () => {
    const rows = db.prepare(`SELECT * FROM net_worth_items ORDER BY category, name`).all()
    return rows.map(toNetWorthItem)
  })

  ipcMain.handle('netWorthItems:create', (_event, input: NewNetWorthItemInput) => {
    const info = db
      .prepare(
        `INSERT INTO net_worth_items (category, name, value, original_value, acquired_date, notes)
         VALUES (@category, @name, @value, @originalValue, @acquiredDate, @notes)`
      )
      .run({
        category: input.category,
        name: input.name,
        value: input.value,
        originalValue: input.originalValue ?? null,
        acquiredDate: input.acquiredDate ?? null,
        notes: input.notes ?? null
      })
    const row = db.prepare(`SELECT * FROM net_worth_items WHERE id = ?`).get(info.lastInsertRowid)
    return toNetWorthItem(row)
  })

  ipcMain.handle('netWorthItems:update', (_event, id: number, input: NewNetWorthItemInput) => {
    db.prepare(
      `UPDATE net_worth_items
       SET category = @category, name = @name, value = @value,
           original_value = @originalValue, acquired_date = @acquiredDate, notes = @notes
       WHERE id = @id`
    ).run({
      id,
      category: input.category,
      name: input.name,
      value: input.value,
      originalValue: input.originalValue ?? null,
      acquiredDate: input.acquiredDate ?? null,
      notes: input.notes ?? null
    })
    const row = db.prepare(`SELECT * FROM net_worth_items WHERE id = ?`).get(id)
    return toNetWorthItem(row)
  })

  ipcMain.handle('netWorthItems:delete', (_event, id: number) => {
    db.prepare(`DELETE FROM net_worth_items WHERE id = ?`).run(id)
  })
}
