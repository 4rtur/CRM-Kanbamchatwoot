'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Search, X, Filter, Tag, User, Inbox } from 'lucide-react'
import { usePipelineStore } from '@/lib/store/pipeline-store'

export function FilterBar() {
  const { agents, labels, inboxes, filters, setFilters, clearFilters } = usePipelineStore()

  const hasActiveFilters =
    filters.agentId !== null ||
    filters.labels.length > 0 ||
    filters.inboxId !== null ||
    filters.searchQuery !== ''

  function handleLabelToggle(label: string) {
    const current = filters.labels
    const next = current.includes(label)
      ? current.filter((l) => l !== label)
      : [...current, label]
    setFilters({ labels: next })
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar contato..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
          className="pl-8"
        />
      </div>

      {/* Agent filter */}
      <Select
        value={filters.agentId !== null ? String(filters.agentId) : undefined}
        onValueChange={(val) =>
          setFilters({ agentId: val ? Number(val) : null })
        }
      >
        <SelectTrigger size="sm" className="w-[160px]">
          <User className="size-3.5 text-muted-foreground" data-icon="inline-start" />
          <SelectValue placeholder="Agente" />
        </SelectTrigger>
        <SelectContent>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={String(agent.id)}>
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Label filter */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              <Tag className="size-3.5" data-icon="inline-start" />
              Labels
              {filters.labels.length > 0 && (
                <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-[#1F93FF] text-[10px] text-white">
                  {filters.labels.length}
                </span>
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Filtrar por label</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {labels.map((label) => (
            <DropdownMenuCheckboxItem
              key={label.id}
              checked={filters.labels.includes(label.title)}
              onCheckedChange={() => handleLabelToggle(label.title)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.title}
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Inbox filter */}
      <Select
        value={filters.inboxId !== null ? String(filters.inboxId) : undefined}
        onValueChange={(val) =>
          setFilters({ inboxId: val ? Number(val) : null })
        }
      >
        <SelectTrigger size="sm" className="w-[160px]">
          <Inbox className="size-3.5 text-muted-foreground" data-icon="inline-start" />
          <SelectValue placeholder="Inbox" />
        </SelectTrigger>
        <SelectContent>
          {inboxes.map((inbox) => (
            <SelectItem key={inbox.id} value={String(inbox.id)}>
              {inbox.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="size-3.5" data-icon="inline-start" />
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
