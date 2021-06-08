import { Expression, match } from '../ast/ast'
import Token from '../scanner/token'
import { ge, gt, le, lt, sub, neg, div, mul, Assertion } from '../util'
import Logger from '../logger'
import { runtimeError, RuntimeError } from '../errors'

type ExpressionValue = string | number | boolean | null

function isTruthy(val: ExpressionValue): boolean {
  if (val == null) return false
  if (typeof val === 'boolean') return val
  return true
}

function isEqual(a: ExpressionValue, b: ExpressionValue): boolean {
  if (a == null && b == null) return true
  if (a == null) return false
  return a === b
}

type ExprFn<Args extends ExpressionValue[], B extends ExpressionValue> = (...params: { [k in keyof Args]: Args[k] & B }) => ExpressionValue
function checkOps<B extends ExpressionValue, Args extends ExpressionValue[]>(pred: Assertion<ExpressionValue, B>, fn: ExprFn<Args, B>) {
  return (...params: Args): ExpressionValue => {
    params.forEach(pred)
    return fn(...params as { [k in keyof Args]: Args[k] & B })
  }
}

const assertNumber = (op: Token) => (a: ExpressionValue): asserts a is number => {
  if (typeof a != 'number') {
    throw new RuntimeError(op, "Operand must be a number.")
  }
}

const checkNumOps = <Args extends ExpressionValue[]>(t: Token, fn: ExprFn<Args, number>) => checkOps(assertNumber(t), fn)

export const evaluate: (e: Expression) => ExpressionValue = match<ExpressionValue>({
  'literal': ({ value }) => value,
  'grouping': ({ expr }) => evaluate(expr),
  'unary': expr => {
    const right = evaluate(expr.expr)
    switch (expr.op.type) {
      case 'MINUS': return checkNumOps(expr.op, neg)(right)
      case 'BANG': return !isTruthy(right)
    }
  },
  'binary': expr => {
    const left = evaluate(expr.left)
    const right = evaluate(expr.right)
    switch (expr.op.type) {
      case 'GREATER': return checkNumOps(expr.op, gt)(left, right)
      case 'GREATER_EQUAL': return checkNumOps(expr.op, ge)(left, right)
      case 'LESS': return checkNumOps(expr.op, lt)(left, right)
      case 'LESS_EQUAL': return checkNumOps(expr.op, le)(left, right)
      case 'MINUS': return checkNumOps(expr.op, sub)(left, right)
      case 'PLUS': {
        if (typeof left === 'number' && typeof right === 'number') {
          return left + right
        }
        if (typeof left === 'string' && typeof right === 'string') {
          return left + right
        }
        throw new RuntimeError(expr.op, "Operands must both be numbers or both be strings.")
      }
      case 'SLASH': return checkNumOps(expr.op, div)(left, right)
      case 'STAR': return checkNumOps(expr.op, mul)(left, right)
      case 'BANG_EQUAL': return !isEqual(left, right)
      case 'EQUAL_EQUAL': return isEqual(left, right)
    }
  }
})

function stringify(val: ExpressionValue) {
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

export function interpret(expr: Expression) {
  try {
    const value = evaluate(expr)
    Logger.stdout(stringify(value))
  } catch (err) {
    if (err instanceof RuntimeError) {
      runtimeError(err)
    } else {
      throw err
    }
  }
}
