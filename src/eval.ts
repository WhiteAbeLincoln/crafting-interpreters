import Logger from './logger'
import { Scanner } from './scanner/scanner'
import { toString } from './scanner/token'

export function run(source: string): void {
  const scanner = new Scanner(source);
  const tokens = scanner.scanTokens()

  for (const token of tokens) {
    Logger.stdout(toString(token))
  }
}
