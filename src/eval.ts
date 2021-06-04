import Logger from './logger'
import Err from './errors'
import { Parser } from './parser/parser'
import { Scanner } from './scanner/scanner'
import print from './ast/printer'

export function run(source: string): void {
  const scanner = new Scanner(source)
  const tokens = scanner.scanTokens()
  const parser = new Parser(tokens)
  const expression = parser.parse()

  if (Err.hadError() || !expression) return;

  Logger.stdout(print(expression))
}
