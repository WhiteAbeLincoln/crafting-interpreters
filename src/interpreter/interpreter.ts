import type { Expression, Statement, ExpressionValue } from '../ast/ast'
import type { Token } from '../scanner/token-type'
import type { Assertion } from '../util/types'
import { Expr, Stmt } from '../ast/ast'
import { ge, gt, le, lt, sub, neg, div, mul } from '../util/util'
import Logger from '../logger/logger'
import { runtimeError, RuntimeError } from '../errors/errors'
import { Environment } from '../environment/environment'
import { stringify, isTruthy, isEqual } from './utils'

class BreakException { constructor(readonly label?: string) {} }
class ContinueException { constructor(readonly label?: string) {} }

type ExprFn<Args extends ExpressionValue[], B extends ExpressionValue> = (...params: { [k in keyof Args]: Args[k] & B }) => ExpressionValue
function checkOps<B extends ExpressionValue, Args extends ExpressionValue[]>(pred: Assertion<ExpressionValue, B>, fn: ExprFn<Args, B>) {
  return (...params: Args): ExpressionValue => {
    params.forEach(pred)
    return fn(...params as { [k in keyof Args]: Args[k] & B })
  }
}

const assertNumber = (op: Token) => (a: ExpressionValue): asserts a is number => {
  if (typeof a != 'number') {
    throw new RuntimeError(op, 'Operand must be a number.')
  }
}

const checkNumOps = <Args extends ExpressionValue[]>(t: Token, fn: ExprFn<Args, number>) => checkOps(assertNumber(t), fn)

export const evaluate: (env: Environment) => (e: Expression) => ExpressionValue = env => Expr.match({
  'Literal': ({ value }) => value,
  'Grouping': ({ expr }) => evaluate(env)(expr),
  'Unary': expr => {
    const right = evaluate(env)(expr.expr)
    switch (expr.op.type) {
      case 'MINUS': return checkNumOps(expr.op, neg)(right)
      case 'BANG': return !isTruthy(right)
    }
  },
  'Binary': expr => {
    const left = evaluate(env)(expr.left)
    const right = evaluate(env)(expr.right)
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
        if (typeof left === 'string' || typeof right === 'string') {
          return stringify(left) + stringify(right)
        }
        throw new RuntimeError(expr.op, 'Operands must both be numbers or one must be a string.')
      }
      case 'SLASH': return checkNumOps(expr.op, (left: number, right: number) => {
        if (right === 0) {
          throw new RuntimeError(expr.op, 'Divide by zero error.')
        }
        return div(left, right)
      })(left, right)
      case 'STAR': return checkNumOps(expr.op, mul)(left, right)
      case 'BANG_EQUAL': return !isEqual(left, right)
      case 'EQUAL_EQUAL': return isEqual(left, right)
    }
  },
  'Variable': ({ name }) => env.get(name),
  'Assign': ({ value, name }) => {
    const val = evaluate(env)(value)
    env.assign(name, val)
    return val
  },
  'Logical': expr => {
    const left = evaluate(env)(expr.left)
    if (expr.op.type === 'OR') {
      if (isTruthy(left)) return left
    }
    else {
      if (!isTruthy(left)) return left
    }

    return evaluate(env)(expr.right)
  }
})

const execute = (env: Environment) =>
  Stmt.match({
    Expression: ({ value }) => {
      evaluate(env)(value)
    },
    Print: ({ expr }) => {
      const v = evaluate(env)(expr)
      Logger.stdout(stringify(v))
    },
    Declaration: ({ initializer, name }) => {
      const value =
        initializer === null ? undefined : evaluate(env)(initializer)
      env.define(name.lexeme, value)
    },
    Block: ({ statements }) => {
      // We do not need a separate executeBlock function.
      // The call stack handles restoring the environment since we pass in our environment as a parameter.
      // each recursive call corresponds exactly to a block and exiting the call returns us to the
      // previous call, which contains the parent environment

      // this is even mentioned in Crafting Interpreters (see a sidebar at 8.5.2)
      // Bob Nystrom said that adding an environment parameter to each visit method was too verbose/tedious
      // but since we are using pattern matching instead of visitors, we only have to add it in one place
      // (two to handle expression evaluation)
      statements.forEach(execute(new Environment(env)))
    },
    If: ({ condition, thenBranch, elseBranch }) => {
      if (isTruthy(evaluate(env)(condition))) {
        execute(env)(thenBranch)
      } else if (elseBranch) {
        execute(env)(elseBranch)
      }
    },
    While: ({ condition, body }) => {
      while (isTruthy(evaluate(env)(condition))) {
        try {
          execute(env)(body)
        } catch (e) {
          if (e instanceof BreakException && !e.label) {
            break
          } else {
            throw e
          }
        }
      }
    },
    Break: ({ label }) => {
      // exceptions are a convenient way to break execution accross function boundaries
      // the nearest enclosing while loop will catch this exception
      throw new BreakException(label?.lexeme)
    },
    Continue: ({ label }) => { throw new ContinueException(label?.lexeme) },
    Label: ({ label, stmt }) => {
      try {
        execute(env)(stmt)
      } catch (e) {
        if (e instanceof BreakException && e.label === label) {
          return
        }

        throw e
      }
    },
    ContinuePoint: ({ label, stmt }) => {
      try {
        execute(env)(stmt)
      } catch (e) {
        if (e instanceof ContinueException && (!e.label || e.label == label)) {
          return
        }

        throw e
      }
    }
  })

export function interpret(statements: Statement[], env = new Environment()) {
  try {
    const executer = execute(env)
    for (const stmt of statements) {
      executer(stmt)
    }
  } catch (err) {
    if (err instanceof RuntimeError) {
      runtimeError(err)
    } else {
      throw err
    }
  }
}
