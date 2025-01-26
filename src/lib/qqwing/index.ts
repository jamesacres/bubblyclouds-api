import { Difficulty } from '@/types/enums/difficulty.enum.js';

// @ts-expect-error build path
import factory = require('./wasm/qqwing/main.js');

class QQWing {
  private async getInstance({ output }: { output: (output: string) => void }) {
    return await factory({
      print: output,
    });
  }

  async version(): Promise<string> {
    let result: string | undefined;
    await (
      await this.getInstance({
        output: (output: string) => {
          result = output;
        },
      })
    ).callMain(['--version']);
    if (!result) {
      throw Error('Failed to get version');
    }
    return result;
  }

  async generate(difficulty: Difficulty): Promise<{
    initial: string;
    final: string;
  }> {
    let result: string | undefined;
    await (
      await this.getInstance({
        output: (output: string) => {
          result = output;
        },
      })
    ).callMain([
      '--generate',
      '--difficulty',
      difficulty,
      '--solution',
      '--csv',
    ]);
    if (!result) {
      throw Error('Failed to generate');
    }
    const [initial, final] = result.split(',');
    return { initial, final };
  }
}

const qqwing = new QQWing();
export { qqwing };
