import { Expression, match } from './ast'

export const print = match({
    'binary': ({ op, left, right }) => parenthesize(op.lexeme, left, right),
    'grouping': ({ expr }) => parenthesize("group", expr),
    'literal': ({ value }) => (value === null ? "nil"
                              : typeof value === 'string' ? `"${value}"`
                              : value.toString()),
    'unary': ({ op, expr }) => parenthesize(op.lexeme, expr)
})

function parenthesize(name: string, ...exprs: Expression[]): string {
  return `(${name}${exprs.map(e => ` ${print(e)}`).join('')})`;
}

export default print
