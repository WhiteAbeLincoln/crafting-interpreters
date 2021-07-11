import type { ExpressionValue } from '../ast/ast'

export function stringify(val: ExpressionValue) {
  if (val == null) return 'nil'
  if (typeof val === 'number') {
    let text = val.toString()
    if (text.endsWith('.0')) {
      text = text.substring(0, text.length - 2)
    }
    return text
  }
  return val.toString()
}
