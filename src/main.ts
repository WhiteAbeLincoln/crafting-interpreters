import Err from './errors/errors'
import Logger from './logger/logger'
import { ConsoleLoggerHandler } from './logger/console-logger'
import { LoggerErrorHandler } from './errors/console-handler'
import { readFile } from 'fs/promises'
import repl from 'repl'
import { useDeferred } from './util/util'
import { Parser } from './parser/parser'
import { Scanner } from './scanner/scanner'
import { interpret } from './interpreter/interpreter'
import { Environment } from './environment/environment'
import { print } from './ast/printer'

Logger.setHandler(new ConsoleLoggerHandler())
Err.setHandler(new LoggerErrorHandler())

function getAst(source: string, inRepl = false) {
  const scanner = new Scanner(source)
  const tokens = scanner.scanTokens()
  const parser = new Parser(tokens)
  const statements = parser.parse(inRepl)

  if (Err.hadError() || statements.length === 0) {
    return null
  }

  return statements
}

function run(source: string, env = new Environment(), inRepl = false): void {
  const statements = getAst(source, inRepl)
  if (statements) {
    interpret(statements, env)
  }
}

function printAst(text: string) {
    const ast = getAst(text)
    if (ast) {
      return ast.map(print).join('\n')
    }
    return '[Error]'
}

const withFile = (fn: (contents: string) => void) => async (path: string) => {
  const v = await readFile(path, { encoding: 'utf-8' })
  fn(v)
  if (Err.hadError()) {
    process.exit(65)
  }
  if (Err.hadRuntimeError()) {
    process.exit(70)
  }
}

const runFile = withFile(run)
const printFileAst = withFile(text => Logger.stdout(printAst(text)))

function runPrompt() {
  const [promise, res] = useDeferred<undefined>()
  const isRecoverableError = (_e: Error) => {
    return false
  }

  let env = new Environment()

  const replEval: repl.REPLEval = function replEval(
    evalCmd,
    _context,
    _file,
    cb,
  ) {
    let result: string | undefined
    try {
      // we tell the parser to first attempt to parse the entire input as an expression
      // if that succeeds, then the expression is wrapped in a print statement for the repl
      // otherwise we parse as a statement
      run(evalCmd, env, true)
      if (Err.hadError()) {
        Err.reset()
      }
    } catch (e) {
      if (!(e instanceof Error)) return cb(new Error('unknown error ' + e), undefined)
      if (isRecoverableError(e)) {
        return cb(new repl.Recoverable(e), undefined)
      } else {
        return cb(e, undefined)
      }
    }

    cb(null, result)
  }

  const writer: repl.REPLWriter = function writer(obj) {
    return obj
  }

  const replServer = repl.start({
    prompt: '> ',
    eval: replEval,
    writer,
    ignoreUndefined: true,
  })
  replServer.defineCommand('reset', {
    help: 'Reset the execution environment',
    action() {
      this.clearBufferedCommand()
      env = new Environment()
      replServer.output.write('Environment reset')
    }
  })
  replServer.defineCommand('env', {
    help: 'Print the execution environment',
    action() {
      this.clearBufferedCommand()
      replServer.output.write(env.print())
    }
  })
  replServer.defineCommand('ast', {
    help: 'Print the ast of the given code',
    action(text) {
      this.clearBufferedCommand()
      replServer.output.write(printAst(text))
    }
  })

  replServer.on('exit', () => {
    res(undefined)
  })

  return promise
}

async function main(argv: string[]): Promise<number> {
  let args = argv.slice(2)
  let showAst = false
  if (args[0] == '--ast') {
    showAst = true
    args = args.slice(1)
  }

  try {
    if (args.length > 1) {
      Logger.stdout(`Usage: tslox [--ast] [script]`)
      return 64
    } else if (args[0]) {
      if (showAst) {
        await printFileAst(args[0])
      }
      else {
        await runFile(args[0])
      }
    } else {
      await runPrompt()
    }
  } catch (e) {
    Logger.stderr(String(e))
    return 1
  }

  return 0
}

main(process.argv).then(e => process.exit(e))
