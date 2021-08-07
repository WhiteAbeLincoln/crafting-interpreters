import { Expression, Expr, Statement } from './ast'
import { matcher } from '../util/util'

export const print: (v: Expression | Statement) => string = matcher<
  Expression | Statement
>()({
  Binary: ({ op, left, right }) => parenthesize(op.lexeme, left, right),
  Logical: ({ op, left, right }) => parenthesize(op.lexeme, left, right),
  Grouping: ({ expr }) => parenthesize('group', expr),
  Literal: ({ value }) =>
    value === null
      ? 'nil'
      : typeof value === 'string'
      ? `"${value}"`
      : value.toString(),
  Unary: ({ op, expr }) => parenthesize(op.lexeme, expr),
  Variable: ({ name }) => name.lexeme,
  Assign: ({ name, value }) =>
    parenthesize('set', Expr.Variable({ name }), value),
  Declaration: ({ name, initializer }) =>
    initializer
      ? parenthesize('declare', Expr.Variable({ name }), initializer)
      : parenthesize('declare', Expr.Variable({ name })),
  Block: ({ statements }) => parenthesize('block', ...statements),
  Print: ({ expr }) => parenthesize('print', expr),
  Expression: ({ value }) => print(value),
  If: ({ condition, thenBranch, elseBranch }) =>
    elseBranch
      ? parenthesize('if', condition, thenBranch, elseBranch)
      : parenthesize('if', condition, thenBranch),
  While: ({ condition, body }) => parenthesize('while', condition, body),
  Break: ({ label }) => parenthesize('break', label?.lexeme),
  Continue: ({ label }) => parenthesize('continue', label?.lexeme),
  Label: ({ stmt, label }) => parenthesize('label', label, stmt),
  ContinuePoint: ({ stmt }) => print(stmt)
})

function parenthesize(name: string, ...exprs: (Expression | Statement | string | undefined | null)[]): string {
  return `(${name}${exprs.map(e => !e ? '' : ` ${typeof e === 'string' ? e : print(e)}`).join('')})`;
}

export default print
