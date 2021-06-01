type AST<Kind extends string, Extra extends {} = {}> = { kind: Kind } & Extra

export type Expression = Literal
                       | Unary
                       | Binary
                       | Grouping

export type Literal = Num | Str | Bool | Nil

export type Str = AST<'string', { value: string }>
export type Num = AST<'number', { value: number }>
export type Bool = AST<'bool', { value: boolean }>
export type Nil = AST<'nil'>

export type Unary = AST<'unary', { expr: Expression, op: UnOp }>

export type Binary = AST<'binary', {
  left: Expression,
  right: Expression
  op: BinOp
}>

export type Grouping = AST<'grouping', { expr: Expression }>

export type UnOp  = '-'  | '!'
export type BinOp = '==' | '!=' | '<'
                  | '<=' | '>'  | '>='
                  | '+'  | '-'  | '*'
                  | '/'
