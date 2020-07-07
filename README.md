# sPool (README under construction)

```ts
import { initThreadPool } from "sPool"

// a cpu-heavy function
function fib(n: number) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  
  return fib(n - 1) + fib(n - 2);
}

const [handle, workerizedFib] = initThreadPool(fib);

async function main() {
  const num = await workerizedFib(50);
}
main();
```

## What is sPool?

### Why?

- computers with e.g. 8-core hyperthreaded processors can process 16 threads simultaneously. Node.js tools can run much faster on these machines by taking advantage of Worker Threads. However,

## Why is this called sPool?

## What are the tradeoffs of using sPool?
