import type { Expression, Statement } from '../ast/ast'
import type { Token, GetTok, TokenType } from '../scanner/token-type'
import { Expr, Stmt } from '../ast/ast'
import { report } from '../errors/errors'

function tokError(token: Token, message: string) {
  if (token.type === 'EOF') {
    report(token.line, " at end", message)
  } else {
    report(token.line, ` at '${token.lexeme}'`, message)
  }
}

class ParseError extends Error {}

export class Parser {
  private current = 0
  private reportErr = true
  constructor(private tokens: Token[]) {}

  parse(expr = false): Statement[] {
    if (expr) {
      const s = this.tryExpr()
      if (s) {
        return [s]
      }
      else {
        this.current = 0
      }
    }

    const statements: Statement[] = []
    while (!this.isAtEnd()) {
      const decl = this.declaration()
      if (decl) {
        statements.push(decl)
      }
    }

    return statements
  }

  private declaration(): Statement | null {
    try {
      if (this.match('VAR')) return this.varDeclaration()

      return this.statement()
    } catch (err) {
      if (err instanceof ParseError) {
        this.synchronize()
        return null
      } else {
        throw err
      }
    }
  }

  private tryExpr(): Statement | null {
    try {
      this.reportErr = false
      const v = this.expression()
      if (!this.isAtEnd()) {
        return null
      }
      return Stmt.Print({ expr: v })
    } catch (err) {
      if (err instanceof ParseError) {
        return null
      } else {
        throw err
      }
    }
    finally {
      this.reportErr = true
    }
  }

  private varDeclaration(): Statement {
    const name = this.consume('IDENTIFIER', "Expect variable name.")
    const initializer = this.match('EQUAL') ? this.expression() : null
    this.consume('SEMICOLON', "Expect ';' after variable declaration.")
    return Stmt.Declaration({ name, initializer })
  }

  private statement(): Statement {
    if (this.match('PRINT')) return this.printStatement()
    if (this.match('LEFT_BRACE')) return Stmt.Block({ statements: this.block() })

    return this.expressionStatement()
  }

  private block(): Statement[] {
    const statements: Statement[] = []
    while (!this.check('RIGHT_BRACE') && !this.isAtEnd()) {
      const decl = this.declaration()
      if (decl) {
        statements.push(decl)
      }
    }

    this.consume('RIGHT_BRACE', "Expect '}' after block.");
    return statements
  }

  private printStatement(): Statement {
    const value = this.expression()
    this.consume('SEMICOLON', "Expect ';' after value.")
    return Stmt.Print({ expr: value })
  }

  private expressionStatement(): Statement {
    const value = this.expression()
    this.consume('SEMICOLON', "Expect ';' after expression.")
    return Stmt.Expression({ value })
  }

  private expression(): Expression {
    return this.assignment()
  }

  private assignment(): Expression {
    const expr = this.equality()

    {
      const lit = this.match('EQUAL')
      if (lit) {
        const equals = lit
        const value = this.assignment()

        if (expr.kind === 'Variable') {
          const name = expr.name
          return Expr.Assign({ name, value })
        }

        tokError(equals, "Invalid assignment target.")
      }
    }

    return expr
  }

  private equality(): Expression {
    let expr = this.comparison()

    this.whileMatching('BANG_EQUAL', 'EQUAL_EQUAL', op => {
      const right = this.comparison()
      expr = Expr.Binary({ left: expr, op, right })
    })

    return expr
  }

  private comparison(): Expression {
    let expr = this.term()

    this.whileMatching('GREATER', 'GREATER_EQUAL', 'LESS', 'LESS_EQUAL', op => {
      const right = this.term()
      expr = Expr.Binary({ left: expr, op, right })
    })

    return expr
  }

  private term(): Expression {
    let expr = this.factor()

    this.whileMatching('MINUS', 'PLUS', op => {
      const right = this.factor()
      expr = Expr.Binary({ left: expr, op, right })
    })

    return expr
  }

  private factor(): Expression {
    let expr = this.unary()

    this.whileMatching('SLASH', 'STAR', op => {
      const right = this.unary()
      expr = Expr.Binary({ left: expr, op, right })
    })

    return expr;
  }

  private unary(): Expression {
    const op = this.match('BANG', 'MINUS')
    if (op) {
      const expr = this.unary()
      return Expr.Unary({ op, expr })
    }

    return this.primary()
  }

  private primary(): Expression {
    if (this.match('FALSE')) return Expr.Literal({ value: false })
    if (this.match('TRUE')) return Expr.Literal({ value: true })
    if (this.match('NIL')) return Expr.Literal({ value: null })

    {
      const lit = this.match('NUMBER', 'STRING')
      if (lit) return Expr.Literal({ value: lit.literal })
    }

    {
      const lit = this.match('IDENTIFIER')
      if (lit) return Expr.Variable({ name: lit })
    }

    if (this.match('LEFT_PAREN')) {
      const expr = this.expression();
      this.consume('RIGHT_PAREN', "Expected ')' after expression.")
      return Expr.Grouping({ expr })
    }

    throw this.error(this.peek(), 'Expect expression.')
  }

  private match<Toks extends TokenType>(...types: Toks[]): GetTok<Toks> | null {
    if (types.some(type => this.check(type))) {
      return this.advance() as GetTok<Toks>
    }

    return null
  }

  private whileMatching<Toks extends TokenType>(...args: [...types: Toks[], fn: (matched: GetTok<Toks>) => void]): void {
    const types = args.slice(0, args.length - 1) as Toks[]
    const fn = args[args.length - 1] as (matched: GetTok<Toks>) => void

    for (let matched: GetTok<Toks> | null = null; (matched = this.match(...types)) !== null;) {
      fn(matched)
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.peek().type == type;
  }

  private advance(): Token {
    const curr = this.peek();
    if (!this.isAtEnd()) this.current++
    return curr
  }

  private isAtEnd(): boolean {
    return this.peek().type == 'EOF'
  }

  private peek(): Token {
    const tok = this.tokens[this.current]
    if (!tok) { throw new Error('Fatal failure in parser - token idx out of bounds') }
    return tok
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance()

    throw this.error(this.peek(), message)
  }

  private error(token: Token, message: string) {
    if (this.reportErr) {
      tokError(token, message)
    }
    return new ParseError()
  }

  // we don't use synchronize yet
  private synchronize(): void {
    let prev = this.advance();

    while (!this.isAtEnd()) {
      if (prev.type == 'SEMICOLON') return;

      switch (this.peek().type) {
        case 'CLASS':
        case 'FUN':
        case 'VAR':
        case 'FOR':
        case 'IF':
        case 'WHILE':
        case 'PRINT':
        case 'RETURN':
          return
      }

      prev = this.advance();
    }
  }
}
