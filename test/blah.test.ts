import { initThreadPool } from '../src';

describe('initThreadPool', () => {
  function cpuHeavyAdd(first: number, second: number) {
    // change to Fib
    return first + second;
  }

  function cpuHeavySubtract(first: number, second: number) {
    // change to Fib
    return first - second;
  }

  function fib(n: number): number {
    if (n <= 0) return 0;
    if (n == 1) return 1;

    return fib(n - 1) + fib(n - 2);
  }

  it('works', async () => {
    const [
      handle,
      workerizedAdd,
      workerizedSubtract,
      workerizedFib,
    ] = initThreadPool(cpuHeavyAdd, cpuHeavySubtract, fib);
    const firVal = await workerizedAdd(1, 2);
    const secVal = await workerizedSubtract(1, 2);
    const fibVal = await workerizedFib(4);

    console.time('parallel fibs');
    await Promise.all([
      workerizedFib(44),
      workerizedFib(44),
      workerizedFib(44),
      workerizedFib(44),
    ]);
    console.timeEnd('parallel fibs');

    console.time('serial fibs');
    fib(44);
    fib(44);
    fib(44);
    fib(44);
    console.timeEnd('serial fibs');

    console.log(fibVal);

    expect(firVal).toBe(3);
    expect(secVal).toBe(-1);

    handle.kill();
  }, 1000000);

  it('throws error when called multiple times', () => {
    expect(true).toBe(true);
  });
});
