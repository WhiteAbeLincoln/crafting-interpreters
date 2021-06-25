import Err from './errors'
import Logger from './logger'
import { ConsoleLoggerHandler } from './logger/console-logger'
import { LoggerErrorHandler } from './errors/console-handler'
import { readFile } from 'fs/promises'
import repl from 'repl'
import { useDeferred } from './util'
import { Parser } from './parser/parser'
import { Scanner } from './scanner/scanner'
import { interpret } from './interpreter/interpreter'

Logger.setHandler(new ConsoleLoggerHandler())
Err.setHandler(new LoggerErrorHandler())

function run(source: string): void {
  const scanner = new Scanner(source)
  const tokens = scanner.scanTokens()
  const parser = new Parser(tokens)
  const statements = parser.parse()

  if (Err.hadError() || statements.length === 0) return;

  interpret(statements)
}

async function runFile(path: string) {
  const v = await readFile(path, { encoding: 'utf-8' })
  run(v)
  if (Err.hadError()) {
    process.exit(65)
  }
  if (Err.hadRuntimeError()) {
    process.exit(70)
  }
}

function runPrompt() {
  const [promise, res] = useDeferred<undefined>()
  const isRecoverableError = (_e: Error) => {
    return false
  }

  const replEval: repl.REPLEval = function replEval(
    evalCmd,
    _context,
    _file,
    cb,
  ) {
    let result: string | undefined
    try {
      run(evalCmd)
      if (Err.hadError()) {
        Err.reset()
      }
    } catch (e) {
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

  replServer.on('exit', () => {
    res(undefined)
  })

  return promise
}

async function main(argv: string[]): Promise<number> {
  const args = argv.slice(2)

  try {
    if (args.length > 1) {
      Logger.stdout(`Usage: ${argv[0]} ${argv[1]} [script]`)
      return 64
    } else if (args[0]) {
      await runFile(args[0])
    } else {
      await runPrompt()
    }
  } catch (e) {
    Logger.stderr(e)
    return 1
  }

  return 0
}

main(process.argv).then(e => process.exit(e))
