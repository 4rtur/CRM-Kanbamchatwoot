'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, CheckSquare, Square, Calendar, User } from 'lucide-react'
import type { CrmChecklistItem, CrmPriority } from '@/lib/chatwoot/types'
import { MOCK_AGENTS } from '@/lib/chatwoot/mock-data'

interface CardChecklistProps {
  checklist: CrmChecklistItem[]
  onChange: (checklist: CrmChecklistItem[]) => void
}

function generateId(): string {
  return `cl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
}

const PRIORITY_LABELS: Record<CrmPriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

const PRIORITY_COLORS: Record<CrmPriority, string> = {
  alta: 'text-red-400',
  media: 'text-yellow-400',
  baixa: 'text-green-400',
}

export function CardChecklist({ checklist, onChange }: CardChecklistProps) {
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<CrmPriority>('media')
  const [newDueDate, setNewDueDate] = useState('')
  const [newAssignedTo, setNewAssignedTo] = useState('')

  const doneCount = checklist.filter((i) => i.done).length
  const totalCount = checklist.length
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  function handleAdd() {
    if (!newTitle.trim()) return
    const newItem: CrmChecklistItem = {
      id: generateId(),
      title: newTitle.trim(),
      done: false,
      dueDate: newDueDate || null,
      priority: newPriority,
      assignedTo: newAssignedTo || null,
    }
    onChange([...checklist, newItem])
    setNewTitle('')
    setNewDueDate('')
    setNewPriority('media')
    setNewAssignedTo('')
  }

  function handleToggle(id: string) {
    onChange(
      checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    )
  }

  function handleRemove(id: string) {
    onChange(checklist.filter((item) => item.id !== id))
  }

  function handleAssign(id: string, agentName: string) {
    onChange(
      checklist.map((item) =>
        item.id === id ? { ...item, assignedTo: agentName || null } : item,
      ),
    )
  }

  function getAgentInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{doneCount}/{totalCount} tarefas concluídas</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[#1F93FF] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-1.5">
        {checklist.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
              item.done ? 'bg-muted/30' : 'bg-card'
            }`}
          >
            <button
              onClick={() => handleToggle(item.id)}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.done ? (
                <CheckSquare className="size-4 text-[#1F93FF]" />
              ) : (
                <Square className="size-4" />
              )}
            </button>
            <span
              className={`flex-1 text-xs ${
                item.done ? 'text-muted-foreground line-through' : 'text-foreground'
              }`}
            >
              {item.title}
            </span>

            {/* Assigned agent */}
            {item.assignedTo ? (
              <span className="flex items-center gap-1 rounded-full bg-[#1F93FF]/10 px-1.5 py-0.5 text-[10px] text-[#1F93FF]">
                <span className="flex size-4 items-center justify-center rounded-full bg-[#1F93FF]/20 text-[8px] font-bold">
                  {getAgentInitials(item.assignedTo)}
                </span>
                {item.assignedTo.split(' ')[0]}
              </span>
            ) : (
              <select
                value=""
                onChange={(e) => handleAssign(item.id, e.target.value)}
                className="rounded border border-border/50 bg-transparent px-1 py-0.5 text-[10px] text-muted-foreground"
                title="Atribuir responsável"
              >
                <option value="">Atribuir</option>
                {MOCK_AGENTS.map((agent) => (
                  <option key={agent.id} value={agent.name}>
                    {agent.name}
                  </option>
                ))}
              </select>
            )}

            <span className={`text-[10px] font-medium ${PRIORITY_COLORS[item.priority]}`}>
              {PRIORITY_LABELS[item.priority]}
            </span>
            {item.dueDate && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Calendar className="size-2.5" />
                {new Date(item.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => handleRemove(item.id)}
              className="shrink-0 text-muted-foreground/50 transition-colors hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new item */}
      <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-2">
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nova tarefa..."
            className="flex-1 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
          />
          <Button variant="ghost" size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>
            <Plus className="size-3.5" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as CrmPriority)}
            className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-foreground"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-foreground"
          />
          <select
            value={newAssignedTo}
            onChange={(e) => setNewAssignedTo(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-foreground"
          >
            <option value="">
              Responsável
            </option>
            {MOCK_AGENTS.map((agent) => (
              <option key={agent.id} value={agent.name}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
