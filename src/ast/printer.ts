import { Expression } from './ast'

export function print(expr: Expression): string {
  switch (expr.kind) {
    case 'binary': return parenthesize(expr.op.lexeme, expr.left, expr.right)
    case 'grouping': return parenthesize("group", expr.expr)
    case 'literal': return (expr.value === null ? "nil"
                           : typeof expr.value === 'string' ? `"${expr.value}"`
                           : expr.value.toString())
    case 'unary': return parenthesize(expr.op.lexeme, expr.expr)
  }
}

function parenthesize(name: string, ...exprs: Expression[]): string {
  return `(${name}${exprs.map(e => ` ${print(e)}`).join('')})`;
}

export default print
