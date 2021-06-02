import { token } from '../scanner/token'
import { Expression, binary, unary, literal, grouping } from './ast'
import Err from '../errors'
import Logger from '../logger'
import { ConsoleLoggerHandler } from '../logger/console-logger'
import { LoggerErrorHandler } from '../errors/console-handler'

export function print(expr: Expression): string {
  switch (expr.kind) {
    case 'binary': return parenthesize(expr.op.lexeme, expr.left, expr.right)
    case 'grouping': return parenthesize("group", expr.expr)
    case 'literal': return expr.value === null ? "nil" : expr.value.toString()
    case 'unary': return parenthesize(expr.op.lexeme, expr.expr)
  }
}

function parenthesize(name: string, ...exprs: Expression[]): string {
  return `(${name}${exprs.map(e => ` ${print(e)}`).join('')})`;
}

export default print

// TODO: remove this once we have a parser

Logger.setHandler(new ConsoleLoggerHandler())
Err.setHandler(new LoggerErrorHandler())

const expression = binary(
                      unary(
                          token('MINUS', '-', 1),
                          literal(123)),
                      token('STAR', '*', 1),
                      grouping(
                          literal(45.67)))

Logger.stdout(print(expression))
