export interface ProductOption {
  id: string
  name: string
  required: boolean
  type: 'single' | 'multi'
  min?: number
  max?: number
  choices: ProductOptionChoice[]
}

export interface ProductOptionChoice {
  id: string
  label: string
  priceDelta: number
  defaultSelected?: boolean
}

export type SelectedOptions = Record<string, string[]>

export function computeOptionsTotal(options: ProductOption[], selected: SelectedOptions): number {
  let total = 0
  for (const opt of options) {
    const picks = selected[opt.id] ?? []
    for (const pickId of picks) {
      const choice = opt.choices.find((c) => c.id === pickId)
      if (choice) total += choice.priceDelta
    }
  }
  return total
}

export function validateSelection(
  options: ProductOption[],
  selected: SelectedOptions,
): { ok: boolean; missingOptionName?: string } {
  for (const opt of options) {
    const picks = selected[opt.id] ?? []
    if (opt.required && picks.length === 0) return { ok: false, missingOptionName: opt.name }
    if (opt.type === 'multi') {
      if (opt.min && picks.length < opt.min) return { ok: false, missingOptionName: opt.name }
      if (opt.max && picks.length > opt.max) return { ok: false, missingOptionName: opt.name }
    }
    if (opt.type === 'single' && picks.length > 1) return { ok: false, missingOptionName: opt.name }
  }
  return { ok: true }
}

export function initialSelection(options: ProductOption[] | undefined): SelectedOptions {
  const out: SelectedOptions = {}
  if (!options) return out
  for (const opt of options) {
    const defaults = opt.choices.filter((c) => c.defaultSelected).map((c) => c.id)
    if (defaults.length > 0) out[opt.id] = opt.type === 'single' ? defaults.slice(0, 1) : defaults
  }
  return out
}

export function selectedLabels(options: ProductOption[], selected: SelectedOptions): string[] {
  const labels: string[] = []
  for (const opt of options) {
    const picks = selected[opt.id] ?? []
    for (const pickId of picks) {
      const choice = opt.choices.find((c) => c.id === pickId)
      if (choice) labels.push(choice.label)
    }
  }
  return labels
}
