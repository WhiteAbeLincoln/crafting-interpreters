import type { ExpressionValue } from '../ast/ast'
import type { Token } from '../scanner/token-type'
import { RuntimeError } from '../errors/errors'
import { stringify } from '../interpreter/utils'

const uninitSym = Symbol('uninitialized')

export class Environment {
  private values: Record<string, ExpressionValue | typeof uninitSym> = {}
  constructor(private parent: Environment | null = null) {}
  get(name: Token): ExpressionValue {
    const val = this.values[name.lexeme]
    if (val === undefined) {
      if (this.parent) {
        return this.parent.get(name)
      }
      throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
    }
    if (val === uninitSym) {
      throw new RuntimeError(name, `Uninitialized variable '${name.lexeme}'.`)
    }
    return val
  }
  define(name: string, value: ExpressionValue | undefined) {
    if (value === undefined) {
      this.values[name] = uninitSym
    }
    else {
      this.values[name] = value
    }
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
    const entries: Array<[string, ExpressionValue | typeof uninitSym]> = Object.entries(this.values)
    if (entries.length == 0) {
      return '[Empty Environment]'
    }
    return entries
            .map(([name, value]) => `${name} = ${value === uninitSym ? '[uninitialized]' : stringify(value)}`)
            .join('\n')
  }
}
