// action wrappers shared across commands
import chalk from 'chalk';

export function withTiming<T extends unknown[]>(next: (...args: T) => Promise<void>): (...args: T) => Promise<void> {
  return async (...args: T) => {
    const start = performance.now();
    process.once('exit', () => {
      const elapsed = performance.now() - start;
      const display = elapsed < 10 ? `${elapsed.toFixed(2)}ms` : `${(elapsed / 1000).toFixed(2)}s`;
      console.log(chalk.dim(`done in ${display}`));
    });
    await next(...args);
  };
}

export function withErrorHandling<T extends unknown[]>(
  next: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await next(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(message));
      process.exit(1);
    }
  };
}
