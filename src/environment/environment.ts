import type { ExpressionValue } from '../ast/ast'
import type { Token } from '../scanner/token-type'
import { RuntimeError } from '../errors/errors'

export class Environment {
  private values: Record<string, ExpressionValue> = {}
  constructor(private parent: Environment | null = null) {}
  get(name: Token): ExpressionValue {
    const val = this.values[name.lexeme]
    if (val === undefined) {
      if (this.parent) {
        return this.parent.get(name)
      }
      throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
    }
    return val
  }
  define(name: string, value: ExpressionValue) {
    this.values[name] = value
  }
  assign(name: Token, value: ExpressionValue): ExpressionValue {
    if (this.values[name.lexeme] === undefined) {
      if (this.parent) {
        return this.parent.assign(name, value)
      }
      throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
    }
    this.values[name.lexeme] = value
    return value
  }
  print(): string {
    const entries: Array<[string, ExpressionValue]> = Object.entries(this.values)
    if (entries.length == 0) {
      return '[Empty Environment]'
    }
    return entries
            .map(([name, value]) => `${name} = ${value}`)
            .join('\n')
  }
}
