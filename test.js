const WebSocketClient = require("../ganache-core-copy/node_modules/websocket").client;
const client = new WebSocketClient();
client.on("connect", (connection) => {
  connection.send("null");
});
client.connect('ws://localhost:8546')



// const map = new WeakMap()
// var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
//   if (!privateMap.has(receiver)) {
//       throw new TypeError("attempted to get private field on non-instance");
//   }
//   return privateMap.get(receiver);
// };

// class Test {
//   constructor(){
//     map.set(this, {a: 1, b: 1});
//   }
//   test1() {
//     const a = __classPrivateFieldGet(this, map).a;
//     const b = __classPrivateFieldGet(this, map).b;
//     __classPrivateFieldGet(this, map).a = a + b;
//     __classPrivateFieldGet(this, map).b = a * b;
//     return [a, b];
//   }

//   test2() {
//     const options = __classPrivateFieldGet(this, map)
//     const a = options.a;
//     const b = options.b;
//     options.a = a + b;
//     options.b = a * b;
//     return [a, b];
//   }
// }

// const c = new Test();

// let start;

// const l = 1e5;

// let array = Array.from({length: 1000}, () => Math.round(Math.random() * 100));

// start = Date.now();
// let r1;
// for (let i = 0; i < l; i++) {
//   r1 = array.map((a)=>{return a+1}).filter(a=>a%2 === 0).map(a => a*2);
// }
// console.log("functional: ", Date.now() - start);

// start = Date.now();
// let r2;
// for (let i = 0; i < l; i++) {
//   r2 = [];
//   for(let j = 0, length = array.length; j < length; j++) {
//     const step1 = array[j] + 1;
//     if (step1 % 2 === 0) {
//       r2.push(step1 * 2);
//     }
//   }
// }
// console.log("for: ", Date.now() - start);


// start = Date.now();
// let r3 = [];
// let fn = a => {
//   const step1 = a + 1;
//   if (step1 % 2 === 0) {
//     r3.push(step1 * 2);
//   }
// }
// for (let i = 0; i < l; i++) {
//   r3 = [];
//   array.forEach(a => {
//     const step1 = a + 1;
//     if (step1 % 2 === 0) {
//       r3.push(step1 * 2);
//     }
//   });
// }
// console.log("foreach: ", Date.now() - start);


// start = Date.now();
// let r4;
// let fn2 = a => {
//   const step1 = a + 1;
//   if (step1 % 2 === 0) {
//     r4.push(step1 * 2);
//   }
// }
// for (let i = 0; i < l; i++) {
//   r4 = [];
//   for(let j = 0, length = array.length; j < length; j++) {
//     fn2(array[j]);
//   }
// }
// console.log("for2: ", Date.now() - start);