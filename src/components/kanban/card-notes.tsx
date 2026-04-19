'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, ArrowRightLeft, UserCheck, Send } from 'lucide-react'
import type { CrmNote } from '@/lib/chatwoot/types'

interface CardNotesProps {
  notes: CrmNote[]
  onAddNote: (note: CrmNote) => void
}

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const NOTE_TYPE_ICON = {
  note: MessageCircle,
  stage_change: ArrowRightLeft,
  agent_change: UserCheck,
}

const NOTE_TYPE_COLOR = {
  note: 'border-l-[#1F93FF]',
  stage_change: 'border-l-yellow-500',
  agent_change: 'border-l-purple-500',
}

export function CardNotes({ notes, onAddNote }: CardNotesProps) {
  const [newText, setNewText] = useState('')

  function handleAdd() {
    if (!newText.trim()) return
    const note: CrmNote = {
      id: generateId(),
      text: newText.trim(),
      author: 'Você',
      timestamp: new Date().toISOString(),
      type: 'note',
    }
    onAddNote(note)
    setNewText('')
  }

  const sortedNotes = [...notes].reverse()

  return (
    <div className="space-y-3">
      {/* Add note form */}
      <div className="flex gap-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Adicionar nota..."
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#1F93FF]/50 focus:outline-none focus:ring-1 focus:ring-[#1F93FF]/30"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
          }}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="self-end"
        >
          <Send className="size-3.5" />
        </Button>
      </div>

      {/* Timeline */}
      {sortedNotes.length === 0 ? (
        <div className="flex h-16 items-center justify-center text-xs text-muted-foreground/50">
          Nenhuma atividade registrada
        </div>
      ) : (
        <div className="space-y-2">
          {sortedNotes.map((note) => {
            const Icon = NOTE_TYPE_ICON[note.type]
            const borderColor = NOTE_TYPE_COLOR[note.type]

            return (
              <div
                key={note.id}
                className={`rounded-md border-l-2 bg-muted/20 px-3 py-2 ${borderColor}`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="size-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {note.author}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {formatTimestamp(note.timestamp)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground">{note.text}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
