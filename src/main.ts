import Err from './errors'
import Logger from './logger'
import { ConsoleErrorHandler } from './errors/console-handler'
import { ConsoleLoggerHandler } from './logger/console-logger'
import { readFile } from 'fs/promises'
import { run } from './eval'
import repl from 'repl'
import { useDeferred } from './util'

Err.setHandler(new ConsoleErrorHandler())
Logger.setHandler(new ConsoleLoggerHandler())

function runFile(path: string) {
  return readFile(path, { encoding: 'utf-8' }).then(v => {
    run(v)
    if (Err.hadError()) {
      process.exit(65)
    }
  })
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
      console.log(`Usage: ${argv[0]} ${argv[1]} [script]`)
      return 64
    } else if (args[0]) {
      await runFile(args[0])
    } else {
      await runPrompt()
    }
  } catch (e) {
    console.error(e)
    return 1
  }

  return 0
}

main(process.argv).then(e => process.exit(e))
