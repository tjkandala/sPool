import { Worker } from 'worker_threads';
import { cpus } from 'os';

/*
 * sPool library: Easy Type-Safe Worker Thread Pools
 *
 * attempt at finding a good API for an abstraction
 * layer over Node.js workers.
 *
 * after, implement thread pooling
 *
 * two parts to this library:
 *  1) promisifying functions for worker threads
 *  2) easy thread pools for those functions
 *
 * TODOs:
 * - make it isomorphic! (compat w Web Workers & Node.js Workers)? optional
 * - benchmark against single-threaded versions
 * - error handling (check stack trace)
 * - abortable
 * - use SharedArrayBuffer!
 * - finally, demonstrate a real-world use-case! (load testing?????)
 * - solve dining philosophers problem in sPool! the only node solution I found uses clusters, not workers!
 *
 * NOTEs:
 * - don't make an overloaded main function! separate api for function and for files... wait nvm. might be more elegant to overload
 * - cool perks! no syncronization needed bc no shared address space/memory
 *
 * final steps: read all of mraleph, optimize perf
 *
 * Tradeoffs:
 * - duplicating function definitions in all threads
 * - can't reference enclosing scopes in functions
 * - have to pass in functions at creation time
 *
 * References:
 * https://www.ibm.com/developerworks/java/library/j-jtp0730/index.html
 *
 * Why?
 *  - I was a little exhausted from constantly code-golfing for front-end libraries. On Node.js libraries,
 *    I can focus on API design and runtime performance, without bundle size getting in the way. no worries
 * about RegeneratorRuntime
 */

type AsyncWorkerStub<T extends Callback> = {
  (...args: Parameters<T>): Promise<ReturnType<T>>;
  kill: string;
};

type Callback = (...args: any) => any;

let alreadyPooled = false;

/**
 *
 * thread pool init should return the worker creation function!!
 * this is a better design choice because the worker fn depends on
 * the existence of + reference to the thread pool!
 *
 * The "worker factory" returns "client stub" functions
 *
 * TODO: look into passing variadic amount of functions. each function is given an
 * id at create time. generate wrapper functions which send messages to a worker with
 * function id and args!
 *
 * @param fn
 * @param threads
 */

export async function initThreadPool<T extends Callback>(...funcs: T[]) {
  if (alreadyPooled) {
    const err = new Error('A thread pool already exists!');
    err.name = 'MultipleThreadPoolError';
    throw err;
  }

  alreadyPooled = true;

  // this is a 2-core/4-thread processor, cpus().length is returning 4
  // seems it is accounting for hyperthreading
  const threads = cpus().length;

  const idleWorkers: Worker[] = [];
  const activeWorkers: Worker[] = [];

  // create string of array of fns
  const funcString = funcs[0].toString();
  const fns: Callback[] = [
    function() {
      console.log('an arreee');
    },
    function() {
      console.log('boba two');
    },
  ];
  let fnsString = '[';
  for (let i = 0; i < fns.length; i++) {
    fnsString += fns[i].toString();
    fnsString += ',';
  }
  fnsString += ']';

  console.log(fnsString);

  const workerScript = `
    const {parentPort} = require("worker_threads");

    ${funcString}

    const fns = ${fnsString}
    fns[0]()
    fns[1]()
  
    parentPort?.on("message", (val) => {
        switch(val.type) {
            case "call": {
                const data = ${funcs[0].name}(...val.args);
                parentPort?.postMessage({ status: "received", data });
                break;
            }

            case "replaceFunc": {
                console.log("repl")
                break;
            }
        }
    });
    `;

  for (let i = 0; i < threads; i++) {
    idleWorkers.push(
      new Worker(workerScript, {
        eval: true,
      })
    );
  }

  const invocationQueue: any[] = [];

  const handle = {
    kill() {},
    log() {},
  };

  async function asyncWorkerStub(...args: Parameters<T>) {
    const myWorker = idleWorkers[0];
    myWorker.postMessage({
      type: 'replaceFunc',
    });

    invocationQueue.push(['func0', args]);
    console.log(invocationQueue);

    myWorker.postMessage({
      type: 'call',
      args,
    });

    return new Promise<ReturnType<T>>(resolve => {
      function cleanup(val: { status: string; data: ReturnType<T> }) {
        if (val && val.status === 'received') {
          resolve(val.data);
          myWorker.off('message', cleanup);
        }
      }

      myWorker.on('message', cleanup);
    });
  }

  asyncWorkerStub.kill = 'hi';

  async function* workQueue() {
    yield 12;
    yield 'tj';
  }

  const asyncGenWQ = workQueue();

  /**
   * don't forget to keep track of thread ids!
   *
   *
   * also, functions should be associated with an id by reference (map/weakmap?).
   * when the stub for an id is called, send "call" message to a worker along with
   * stringified function and args!
   *
   * make a module-global variable to keep track of whether a thread pool has been
   * created already! throw exception if user tries to create multiple thread pools (that makes no sense, bad for perf)
   */

  /**
   * returning worker function and "handle interface" as separate elements
   * of a tuple for easy passing-around of function!
   */

  return new Promise<[typeof handle, typeof asyncWorkerStub]>(async res => {
    /**
     * kick off work queue, then resolve promise
     */
    for await (const val of asyncGenWQ) {
      console.log(val);
    }

    res([handle, asyncWorkerStub]);
  });
}

/**
 * TODO
 */
// class Queue<T> {}

// function tupleInference<T>(...args: T[]) {
//   return args;
// }

// TODO: find the types that make this work
// const [first, second] = tupleInference('tj', 22);
