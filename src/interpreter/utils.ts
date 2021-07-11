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

export function isTruthy(val: ExpressionValue): boolean {
  if (val == null) return false
  if (typeof val === 'boolean') return val
  return true
}

export function isEqual(a: ExpressionValue, b: ExpressionValue): boolean {
  if (a == null && b == null) return true
  if (a == null) return false
  return a === b
}
