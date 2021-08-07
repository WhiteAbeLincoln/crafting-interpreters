import type { Expression, Statement } from '../ast/ast'
import type { Token, GetTok, TokenType, TokenBase } from '../scanner/token-type'
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
  private inLoop = false
  private labelStack: string[] = []
  private loopLabelStack: string[] = []
  constructor(private tokens: Token[]) {}

  parse(expr = false): Statement[] {
    if (expr) {
      const s = this.tryExpr()
      if (s) {
        return [s]
      } else {
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
    } finally {
      this.reportErr = true
    }
  }

  private varDeclaration(): Statement {
    const name = this.consume('IDENTIFIER', 'Expect variable name.')
    const initializer = this.match('EQUAL') ? this.expression() : null
    this.consume('SEMICOLON', "Expect ';' after variable declaration.")
    return Stmt.Declaration({ name, initializer })
  }

  private blockStatement(label?: TokenBase<'IDENTIFIER'>): Statement | null {
    if (this.match('FOR')) return this.forStatement(label ?? null)
    if (this.match('IF')) return this.ifStatement()
    if (this.match('WHILE')) return this.whileStatement(label ?? null)
    if (this.match('LEFT_BRACE')) return Stmt.Block({ statements: this.block() })

    return null
  }

  private label(): Statement {
    const label = this.consume('IDENTIFIER', "Expect label after ':'.")

    this.labelStack.push(label.lexeme)
    const block = this.blockStatement(label)
    if (!block) {
      throw this.error(this.peek(), 'Expect a block after a label.')
    }
    this.labelStack.pop()

    return Stmt.Label({ label: label.lexeme, stmt: block })
  }

  private statement(): Statement {
    // we use colon as a label prefix rather than the traditional suffix
    // form because I didn't want to introduce lookahead and didn't
    // want to rewrite the rest of the statement parser
    if (this.match('COLON')) return this.label()

    const blockStmt = this.blockStatement()
    if (blockStmt) return blockStmt

    if (this.match('PRINT')) return this.printStatement()
    const breaktok = this.match('BREAK')
    if (breaktok) {
      if (!this.canBreak()) {
        throw this.error(breaktok, 'Illegal break statement.')
      }
      return this.breakStatement()
    }

    const continuetok = this.match('CONTINUE')
    if (continuetok) {
      if (!this.inLoop) {
        throw this.error(continuetok, 'Illegal continue statement.')
      }
      return this.continueStatement()
    }

    return this.expressionStatement()
  }

  private canBreak(): boolean {
    return this.labelStack.length !== 0 || this.inLoop
  }

  private breakStatement(): Statement {
    const label = this.match('IDENTIFIER');
    if (label && !this.labelStack.includes(label.lexeme)) {
      throw this.error(label, `Enclosing labeled block not found: ${label.lexeme}.`)
    }
    this.consume('SEMICOLON', "Expect ';' after break statement.")
    return Stmt.Break({ label })
  }

  private continueStatement(): Statement {
    const label = this.match('IDENTIFIER');
    if (label && !this.loopLabelStack.includes(label.lexeme)) {
      throw this.error(label, `Enclosing labeled loop not found: ${label.lexeme}.`)
    }
    this.consume('SEMICOLON', "Expect ';' after continue statement.")
    return Stmt.Continue({ label })
  }

  private loopBodyStatement(label: TokenBase<'IDENTIFIER'> | null): Statement {
    if (label) {
      this.loopLabelStack.push(label.lexeme)
    }
    const wasInLoop = this.inLoop
    this.inLoop = true
    const stmt = this.statement()
    this.inLoop = wasInLoop
    if (label) {
      this.loopLabelStack.pop()
    }
    return stmt
  }

  private forStatement(label: TokenBase<'IDENTIFIER'> | null): Statement {
    this.consume('LEFT_PAREN', "Expect '(' after 'for'.")
    const initializer = this.match('SEMICOLON')
      ? null
      : this.match('VAR')
      ? this.varDeclaration()
      : this.expressionStatement()

    const condition = !this.check('SEMICOLON') ? this.expression() : Expr.Literal({ value: true })
    this.consume('SEMICOLON', "Expect ';' after for loop condition.")
    const increment = !this.check('RIGHT_PAREN') ? this.expression() : null
    this.consume('RIGHT_PAREN', "Expect ')' after for loop clause.")
    let body = Stmt.ContinuePoint({ label: label?.lexeme, stmt: this.loopBodyStatement(label) })

    if (increment != null) {
      body = Stmt.Block({ statements: [body, Stmt.Expression({ value: increment })] })
    }

    body = Stmt.While({ condition, body })

    if (initializer != null) {
      body = Stmt.Block({ statements: [initializer, body] })
    }

    return body
  }

  private whileStatement(label: TokenBase<'IDENTIFIER'> | null): Statement {
    this.consume('LEFT_PAREN', "Expect '(' after 'while'.")
    const condition = this.expression()
    this.consume('RIGHT_PAREN', "Expect ')' after condition.")
    const body = Stmt.ContinuePoint({ label: label?.lexeme, stmt: this.loopBodyStatement(label) })

    return Stmt.While({ condition, body })
  }

  private ifStatement(): Statement {
    this.consume('LEFT_PAREN', "Expect '(' after 'if'.")
    const condition = this.expression()
    this.consume('RIGHT_PAREN', "Expect ')' after condition.")

    const thenBranch = this.statement()
    const elseBranch = this.match('ELSE') ? this.statement() : null

    return Stmt.If({ condition, thenBranch, elseBranch })
  }

  private block(): Statement[] {
    const statements: Statement[] = []
    while (!this.check('RIGHT_BRACE') && !this.isAtEnd()) {
      const decl = this.declaration()
      if (decl) {
        statements.push(decl)
      }
    }

    this.consume('RIGHT_BRACE', "Expect '}' after block.")
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
    const expr = this.or()

    {
      const lit = this.match('EQUAL')
      if (lit) {
        const equals = lit
        const value = this.assignment()

        if (expr.kind === 'Variable') {
          const name = expr.name
          return Expr.Assign({ name, value })
        }

        tokError(equals, 'Invalid assignment target.')
      }
    }

    return expr
  }

  private or(): Expression {
    let expr = this.and()

    this.whileMatching('OR', op => {
      const right = this.and()
      expr = Expr.Logical({ left: expr, op, right })
    })

    return expr
  }

  private and(): Expression {
    let expr = this.equality()

    this.whileMatching('AND', op => {
      const right = this.equality()
      expr = Expr.Logical({ left: expr, op, right })
    })

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

    return expr
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
      const expr = this.expression()
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

  private whileMatching<Toks extends TokenType>(
    ...args: [...types: Toks[], fn: (matched: GetTok<Toks>) => void]
  ): void {
    const types = args.slice(0, args.length - 1) as Toks[]
    const fn = args[args.length - 1] as (matched: GetTok<Toks>) => void

    for (
      let matched: GetTok<Toks> | null = null;
      (matched = this.match(...types)) !== null;

    ) {
      fn(matched)
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.peek().type == type
  }

  private advance(): Token {
    const curr = this.peek()
    if (!this.isAtEnd()) this.current++
    return curr
  }

  private isAtEnd(): boolean {
    return this.peek().type == 'EOF'
  }

  private peek(): Token {
    const tok = this.tokens[this.current]
    if (!tok) {
      throw new Error('Fatal failure in parser - token idx out of bounds')
    }
    return tok
  }

  private consume<T extends TokenType>(type: T, message: string): GetTok<T> {
    const tok = this.match(type)

    if (!tok)
      throw this.error(this.peek(), message)

    return tok
  }

  private error(token: Token, message: string) {
    if (this.reportErr) {
      tokError(token, message)
    }
    return new ParseError()
  }

  // we don't use synchronize yet
  private synchronize(): void {
    let prev = this.advance()

    while (!this.isAtEnd()) {
      if (prev.type == 'SEMICOLON') return

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

      prev = this.advance()
    }
  }
}
