'use client'

import { useState, useMemo } from 'react'
import { PipelineProvider, usePipelineStore } from '@/lib/store/pipeline-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  Sun,
  Moon,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme'
import type { CrmProduct } from '@/lib/chatwoot/types'
import { useUser } from '@/lib/auth/use-user'
import { hasPermission } from '@/lib/auth/permissions'

const DEFAULT_CATEGORIES = ['Tela', 'Bateria', 'Placa', 'Dados', 'Acessório', 'Outro']

const COLOR_PALETTE = [
  { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', hex: '#3b82f6' },
  { bg: 'bg-green-500/10 dark:bg-green-500/15', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20', hex: '#22c55e' },
  { bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20', hex: '#a855f7' },
  { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', hex: '#f59e0b' },
  { bg: 'bg-pink-500/10 dark:bg-pink-500/15', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20', hex: '#ec4899' },
  { bg: 'bg-cyan-500/10 dark:bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/20', hex: '#06b6d4' },
  { bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', hex: '#ef4444' },
  { bg: 'bg-indigo-500/10 dark:bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20', hex: '#6366f1' },
  { bg: 'bg-teal-500/10 dark:bg-teal-500/15', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/20', hex: '#14b8a6' },
  { bg: 'bg-zinc-500/10 dark:bg-zinc-500/15', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-500/20', hex: '#71717a' },
]

const STORAGE_KEY = 'chatwoot-crm-categories'

function loadCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { return DEFAULT_CATEGORIES }
  }
  return DEFAULT_CATEGORIES
}

function saveCategories(cats: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats))
}

function getCategoryStyle(category: string) {
  const cats = loadCategories()
  const index = cats.indexOf(category)
  return COLOR_PALETTE[index >= 0 ? index % COLOR_PALETTE.length : COLOR_PALETTE.length - 1]
}

function CategoryManager({
  categories,
  onUpdate,
}: {
  categories: string[]
  onUpdate: (cats: string[]) => void
}) {
  const [newCat, setNewCat] = useState('')

  function handleAdd() {
    const name = newCat.trim()
    if (!name || categories.includes(name)) return
    const updated = [...categories, name]
    onUpdate(updated)
    saveCategories(updated)
    setNewCat('')
  }

  function handleRemove(cat: string) {
    const updated = categories.filter((c) => c !== cat)
    onUpdate(updated)
    saveCategories(updated)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Adicione categorias personalizadas para organizar seus produtos. Cada cliente pode ter suas próprias categorias.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {categories.map((cat, i) => {
          const style = COLOR_PALETTE[i % COLOR_PALETTE.length]
          return (
            <span
              key={cat}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.text}`}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: style.hex }} />
              {cat}
              <button
                onClick={() => handleRemove(cat)}
                className="ml-0.5 opacity-60 hover:opacity-100"
                title={`Remover "${cat}"`}
              >
                <X className="size-3" />
              </button>
            </span>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Input
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          placeholder="Nova categoria..."
          className="text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
        />
        <Button size="sm" onClick={handleAdd} disabled={!newCat.trim() || categories.includes(newCat.trim())}>
          <Plus className="size-3.5" data-icon="inline-start" />
          Adicionar
        </Button>
      </div>
    </div>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function generateId(): string {
  return `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
}

function ProductForm({
  initial,
  onSave,
  onCancel,
  categories,
}: {
  initial?: CrmProduct
  onSave: (product: CrmProduct) => void
  onCancel: () => void
  categories: string[]
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? 'Outro')
  const [description, setDescription] = useState(initial?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !price) return

    onSave({
      id: initial?.id ?? generateId(),
      name: name.trim(),
      price: Number(price),
      category,
      description: description.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do produto"
          required
        />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Preço (R$)</label>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            type="number"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição opcional"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!name.trim() || !price}>
          {initial ? 'Atualizar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function ProdutosContent() {
  const { products, addProduct, updateProduct, deleteProduct } = usePipelineStore()
  const { theme, toggleTheme } = useTheme()
  const { user } = useUser()
  const canCreate = hasPermission(user, 'products:create')
  const canEdit = hasPermission(user, 'products:edit')
  const canDelete = hasPermission(user, 'products:delete')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<CrmProduct | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>(loadCategories)

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterCategory !== 'all' && p.category !== filterCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [products, searchQuery, filterCategory])

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))]
    return cats.sort()
  }, [products])

  const totalValue = filteredProducts.reduce((sum, p) => sum + p.price, 0)

  function handleAdd(product: CrmProduct) {
    addProduct(product)
    setAddOpen(false)
  }

  function handleEdit(product: CrmProduct) {
    updateProduct(product)
    setEditProduct(null)
  }

  function handleDelete(id: string) {
    deleteProduct(id)
    setDeleteConfirm(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon-sm" className="hover:bg-muted">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2.5">
                <Package className="size-5 text-muted-foreground" />
                <h1 className="text-lg font-bold tracking-tight">Produtos</h1>
              </div>
              <span className="text-xs text-muted-foreground">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm" onClick={() => setCatManagerOpen(true)}>
                      <Package className="size-3.5" data-icon="inline-start" />
                      Categorias ({customCategories.length})
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Gerenciar Categorias</DialogTitle>
                  </DialogHeader>
                  <CategoryManager
                    categories={customCategories}
                    onUpdate={setCustomCategories}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={addOpen && canCreate} onOpenChange={(v) => canCreate && setAddOpen(v)}>
                {canCreate && (
                  <DialogTrigger
                    render={
                      <Button size="sm">
                        <Plus className="size-3.5" data-icon="inline-start" />
                        Novo Produto
                      </Button>
                    }
                  />
                )}
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Produto</DialogTitle>
                  </DialogHeader>
                  <ProductForm
                    onSave={handleAdd}
                    onCancel={() => setAddOpen(false)}
                    categories={customCategories}
                  />
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              >
                {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <div className="relative" style={{ flex: '1 1 250px', maxWidth: '400px' }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou categoria..."
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            <button
              onClick={() => setFilterCategory('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                filterCategory === 'all'
                  ? 'bg-foreground text-background'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => {
              const style = getCategoryStyle(cat)
              const isActive = filterCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(isActive ? 'all' : cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-foreground text-background'
                      : `${style.bg} ${style.text} hover:opacity-80`
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
          {totalValue > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              Valor total: <span className="font-semibold text-foreground">{formatCurrency(totalValue)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Product grid */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-8">
        {filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-12 text-center">
            <Package className="size-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterCategory !== 'all'
                ? 'Nenhum produto encontrado com esses filtros.'
                : 'Nenhum produto cadastrado. Clique em "Novo Produto" para começar.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {filteredProducts.map((product) => {
              const catStyle = getCategoryStyle(product.category)
              return (
                <div
                  key={product.id}
                  style={{ flex: '1 1 280px', minWidth: '280px', maxWidth: '400px' }}
                  className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-4 transition-colors hover:border-border"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${catStyle.bg}`}>
                        <Package className={`size-5 ${catStyle.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{product.name}</p>
                        <Badge variant="secondary" className={`mt-0.5 text-[10px] ${catStyle.bg} ${catStyle.text} border-none`}>
                          {product.category}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatCurrency(product.price)}
                    </p>
                  </div>

                  {product.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50 dark:border-white/[0.06]">
                    {!canEdit && !canDelete && (
                      <p className="text-[11px] text-muted-foreground">
                        Somente leitura.
                      </p>
                    )}
                    {canEdit && (
                    <Dialog open={editProduct?.id === product.id} onOpenChange={(open) => { if (!open) setEditProduct(null) }}>
                      <DialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditProduct(product)}
                          >
                            <Edit2 className="size-3" data-icon="inline-start" />
                            Editar
                          </Button>
                        }
                      />
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Editar Produto</DialogTitle>
                        </DialogHeader>
                        {editProduct && (
                          <ProductForm
                            initial={editProduct}
                            onSave={handleEdit}
                            onCancel={() => setEditProduct(null)}
                            categories={customCategories}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                    )}

                    {canDelete && (
                    <Dialog open={deleteConfirm === product.id} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
                      <DialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(product.id)}
                          >
                            <Trash2 className="size-3" data-icon="inline-start" />
                            Excluir
                          </Button>
                        }
                      />
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmar Exclusão</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                          Tem certeza que deseja excluir <span className="font-semibold text-foreground">{product.name}</span>?
                          Esta ação não pode ser desfeita.
                        </p>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancelar
                          </Button>
                          <Button variant="destructive" onClick={() => handleDelete(product.id)}>
                            Excluir
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProdutosPage() {
  return (
    <PipelineProvider>
      <ProdutosContent />
    </PipelineProvider>
  )
}
