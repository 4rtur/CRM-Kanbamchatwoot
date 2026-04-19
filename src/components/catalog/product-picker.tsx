'use client'

import { usePipelineStore } from '@/lib/store/pipeline-store'
import { Package, Check } from 'lucide-react'

interface ProductPickerProps {
  selectedProductIds: string[]
  onChange: (productIds: string[]) => void
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

export function ProductPicker({ selectedProductIds, onChange }: ProductPickerProps) {
  const { products } = usePipelineStore()

  function toggleProduct(productId: string) {
    if (selectedProductIds.includes(productId)) {
      onChange(selectedProductIds.filter((id) => id !== productId))
    } else {
      onChange([...selectedProductIds, productId])
    }
  }

  const totalValue = products
    .filter((p) => selectedProductIds.includes(p.id))
    .reduce((sum, p) => sum + p.price, 0)

  const categories = [...new Set(products.map((p) => p.category))]

  return (
    <div className="space-y-3">
      {/* Total */}
      {selectedProductIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-green-500/10 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {selectedProductIds.length} produto{selectedProductIds.length !== 1 ? 's' : ''} selecionado{selectedProductIds.length !== 1 ? 's' : ''}
          </span>
          <span className="text-sm font-semibold text-green-400">
            {formatCurrency(totalValue)}
          </span>
        </div>
      )}

      {/* Products by category */}
      {categories.map((cat) => {
        const catProducts = products.filter((p) => p.category === cat)
        return (
          <div key={cat}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {cat}
            </p>
            <div className="space-y-1">
              {catProducts.map((product) => {
                const isSelected = selectedProductIds.includes(product.id)
                return (
                  <button
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#1F93FF]/40 bg-[#1F93FF]/5'
                        : 'border-border/50 bg-card hover:border-border'
                    }`}
                  >
                    <div className={`flex size-5 items-center justify-center rounded ${
                      isSelected ? 'bg-[#1F93FF] text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isSelected ? (
                        <Check className="size-3" />
                      ) : (
                        <Package className="size-3" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{product.name}</p>
                      {product.description && (
                        <p className="truncate text-[10px] text-muted-foreground">{product.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-green-400">
                      {formatCurrency(product.price)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
