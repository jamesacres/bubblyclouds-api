// @ts-expect-error build path
import factory = require('./wasm/qqwing/main.js');
class QQWing {
  private instance: any;

  private async getInstance() {
    if (this.instance) {
      return this.instance;
    }
    console.info(factory);

    this.instance = await factory({
      print: (output: string) => {
        // Change to capture output
        console.info(output);
      },
    });
    return this.instance;
  }

  async version() {
    return (await this.getInstance()).callMain(['--version']);
  }
}

// const qqwing = async () => {
//   instance.callMain(['--generate']);
//   instance.callMain([
//     '--generate',
//     '--difficulty',
//     'expert',
//     '--solution',
//     '--csv',
//   ]);
// };

const qqwing = new QQWing();
export { qqwing };
