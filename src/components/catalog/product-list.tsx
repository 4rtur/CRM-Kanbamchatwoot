'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { Plus, Trash2, Package, Edit2, Check, X } from 'lucide-react'
import type { CrmProduct } from '@/lib/chatwoot/types'

function generateId(): string {
  return `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

const CATEGORY_COLORS: Record<string, string> = {
  'Reparo iPhone': 'bg-blue-500/20 text-blue-400',
  'Reparo MacBook': 'bg-purple-500/20 text-purple-400',
  'Serviços': 'bg-yellow-500/20 text-yellow-400',
  'Manutenção': 'bg-green-500/20 text-green-400',
  'Upgrade': 'bg-orange-500/20 text-orange-400',
  'Acessórios': 'bg-pink-500/20 text-pink-400',
}

export function ProductList() {
  const { products, addProduct, updateProduct, deleteProduct } = usePipelineStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  function resetForm() {
    setName('')
    setPrice('')
    setCategory('')
    setDescription('')
    setShowForm(false)
    setEditingId(null)
  }

  function handleSave() {
    if (!name.trim() || !price) return

    const product: CrmProduct = {
      id: editingId ?? generateId(),
      name: name.trim(),
      price: Number(price),
      category: category.trim() || 'Geral',
      description: description.trim(),
    }

    if (editingId) {
      updateProduct(product)
    } else {
      addProduct(product)
    }

    resetForm()
  }

  function handleEdit(product: CrmProduct) {
    setEditingId(product.id)
    setName(product.name)
    setPrice(String(product.price))
    setCategory(product.category)
    setDescription(product.description)
    setShowForm(true)
  }

  const categories = [...new Set(products.map((p) => p.category))]

  return (
    <div className="space-y-4">
      {/* Category groups */}
      {categories.map((cat) => {
        const catProducts = products.filter((p) => p.category === cat)
        const colorClass = CATEGORY_COLORS[cat] ?? 'bg-muted text-muted-foreground'

        return (
          <div key={cat}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
                {cat}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {catProducts.length} produto{catProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {catProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <Package className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-green-400 font-semibold">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(product)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Edit2 className="size-3" />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Add/Edit form */}
      {showForm ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do produto"
            className="text-sm"
          />
          <div className="flex gap-2">
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Preço (R$)"
              type="number"
              className="text-sm"
            />
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria"
              className="text-sm"
            />
          </div>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || !price}>
              <Check className="size-3" data-icon="inline-start" />
              {editingId ? 'Atualizar' : 'Adicionar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="size-3" data-icon="inline-start" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="size-3.5" data-icon="inline-start" />
          Novo Produto
        </Button>
      )}
    </div>
  )
}
