type Comparator<T> = (values: T[], a: number, b: number) => boolean;

class Heap<T> {
  public length: number;
  public array: T[];
  protected readonly less: Comparator<T>;

  /**
   * Creates a priority-queue heap where the highest priority element,
   * as determined by the `less` function, is at the tip/root of the heap.
   * To read the highest priority element without removing it call peek(). To
   * read and remove the element call `shift()`
   * @param size the size of the heap
   * @param less the comparator function
   */
  constructor(less: Comparator<T>) {
    this.less = less;
  }

  public init(array: T[]) {
    this.array = array;
    const length = this.length = array.length;
    for (let i = ((length / 2) | 0) - 1; i >= 0;) {
      this.down(i--, length);
    }
  }

  /**
   * Pushes a new element onto the heap
   * @param value 
   */
  public push(value: T) {
    const i = this.length++;
    this.array[i] = value;
    this.up(i);
  }

  public size() {
    return this.length;
  }

  /**
   * Return the current best element. Do not remove it
   */
  public peek(): T {
    return this.array[0];
  }

  /**
   * Removes and returns the element with the highest priority from the heap.
   * The complexity is O(log n) where n = this.size().
   * @returns the element with the highest priority
   */
  public shift(): T {
    const array = this.array;
    const length = this.length;

    // if we are empty or about to be empty...
    if (length <= 1) {
        if (length === 0) return;
        const element = array[0];
        // finaly clear the array
        this.length = array.length = 0;
        return element;
    }
    // otherwise...
  
    // remember the best element
    const best = array[0];
    const newLength = this.length = length - 1;
    // put our last element at the start of the heap
    array[0] = array[newLength];
    // then sort from the new first element to the second to last element
    this.down(0, newLength);
    return best;
  }

  /**
   * Removes the highest priority element from the queue, replacing it with
   * the new element. This is equivalent to, but faster than, calling
   * `replace(0, newValue);`.
   * If you call this on an empty heap (`this.size() === 0`) you may find
   * unexpected behavior.
   * @param newValue 
   */
  public replaceBest(newValue: T) {
    this.array[0] = newValue;
    this.down(0, this.length);
  }

  /**
   * Replaces the element at position `i` with the `newValue`. If the element at 
   * position `i` doesn't exist, or if `i < 0` or `i > this.size()` you may
   * find unexpected behavior.
   * @param i 
   * @param newValue 
   */
  public replace(i: number, newValue: T) {
    this.array[i] = newValue;
    this.fix(i);
  }

  /**
   * Removes the element at position `i`.
   * The complexity is O(log n) where n = this.size().
   * @param i the element to remove
   */
  public remove(i: number) {
    const newLength = --this.length;
    if (newLength !== i) {
      this.swap(i, newLength);
      if (!this.down(i, newLength)) {
        this.up(i);
      }
    }
  }

  /**
   * Removes the element with the highest priority from the heap
   * The complexity is O(log n) where n = this.size().
   */
  public removeBest() {
    const array = this.array;
    const length = this.length;
    if (length === 1) {
        // finally, clear the array	
        this.length = array.length = 0		
        return;		
    }

    const newLength = --this.length;
    // put our last element at the start of the heap
    array[0] = array[newLength];
    // then sort from the new first element to the second to last element
    this.down(0, newLength);
  }

  /**
   * Re-establishes the heap ordering after the element at index `i` changes
   * its value. Changing the value of the element at index `i` and then 
   * calling fix is equivalent to, but faster than, calling
   * `remove(i); push(newValue);`.
   * The complexity is O(log n) where n = this.size().
   * @param i 
   */
  public fix(i: number) {
    if (!this.down(i, this.length)) {
      this.up(i);
    }
  }

  private up(j: number,) {
    const less = this.less.bind(null, this.array);
    for (let i: number; ((i = (j - 1) / 2 | 0), i !== j && less(j, i)); j = i) {
      this.swap(i, j);
    }
  }

  private down(i0: number, l: number): boolean {
    const less = this.less.bind(null, this.array);
    let i = i0;
    for (let j1: number; (j1 = 2 * i + 1) < l;) {
      let j = j1; // left child
      let j2 = j1 + 1;
      if (j2 < l && less(j2, j1)) {
        j = j2; // = 2 * i + 2  // right child
      }
      if (!less(j, i)) {
        break;
      }
      this.swap(i, j);
      i = j;
    }
    return i > i0;
  }

  /**
   * Swaps the elements in the heap
   * @param i The first element
   * @param j The second element
   */
  private swap(i: number, j: number) {
    const array = this.array;
    const first = array[i];
    array[i] = array[j];
    array[j] = first;
  }
}

var d = new Heap<number>((values, a, b) => values[a] < values[b]);
d.init([5,6,7,8,1,2,7,9,4,654,46,7,1,3,74,1,4,89,3621,74]);
console.log(d.array.length)
let c =  0;
let i: number;
while(i = d.shift()){
  console.log(i);
  c++;
}
console.log(c);
console.log(d.array);

// type HeapHeapMap<T, U extends Heap<T>> = {heap: U, value: T};

// export class HeapHeap<T, U extends Heap<T> = Heap<T>, V extends HeapHeapMap<T, U> = HeapHeapMap<T, U>> extends Heap<V> {
//     // public insert(value: V)
//     // public insert(value: U)
//     // public insert(value: U | V) {
//     //     super.insert({
//     //         value: (value as U).peek(),
//     //         heap: this
//     //     } as any);
//     // }
//     public peek(): V
//     public peek(): T
//     public peek(): T | V {
//         const best = super.peek();
//         return best.value as T;
//     }
//     public shift() {
//         const heap = super.peek().heap;
//         if (heap.size() > 0) {
//             // replace the old with the new:
//             this.array[this.best] = heap.peek() as any as V;
//             // TODO: fix the ordering

//         } else {
//             // we're done with this account, shorten our heap
//             this.best++;
//         }
//     }
// }

// export default Heap;

// type Account = {nonce: number, gasPrice: number};
// const byNonce = (a:any, b:any): boolean => a.nonce < b.nonce;
// const account1 = new Heap<Account>(2, byNonce);
// account1.insert({nonce: 2, gasPrice: 3});
// account1.insert({nonce: 1, gasPrice: 2});

// const account2 = new Heap<Account>(3, byNonce);
// account2.insert({nonce: 2, gasPrice: 3});
// account2.insert({nonce: 3, gasPrice: 4});
// account2.insert({nonce: 5, gasPrice: 9});

// const accounts = [account1, account2];
// const byPrice = (a:any, b:any): boolean => a.gasPrice > b.gasPrice;

// const all = new HeapHeap<Account>(accounts.length, byPrice);
// for (var i = 0; i < accounts.length; i++) {
//     var account = accounts[i];
//     all.insert(account);
// }

// const a = all.peek();


// type account = {gasPrice: number};
// const a = new Heap<account>((values: account[], a: number, b: number) => {
//     return values[a].gasPrice < values[b].gasPrice;
// });

// var values = [{gasPrice: 9}, {gasPrice: 7}, {gasPrice: 9}, {gasPrice: 4}, {gasPrice: 6}];

// a.init(values);
// var best = a.peek(values);
// console.log(best.gasPrice == 4);
// a.replace(values, 0, {gasPrice: 11});
// var best = a.peek(values);
// console.log(best.gasPrice == 6);
// a.shift();
// var best = a.peek(values);
// console.log(best.gasPrice == 7);

// a.replaceBest(values, {gasPrice: 99});
// var best = a.peek(values);
// console.log(best.gasPrice == 9);

// a.replaceBest(values, {gasPrice: 1});
// var best = a.peek(values);
// console.log(best.gasPrice == 1);

export default Heap;