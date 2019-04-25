type Comparator<T> = (values: T[], a: number, b: number) => boolean;
class Heap<T> {
    public best: number = 0;
    public length: number;
    public array: T[];
    protected readonly less: Comparator<T>;

    /**
     * @param size the size of the heap
     * @param less the comparator function
     */
    constructor(less: Comparator<T>) {
        this.less = less;
    }

    public init(values: T[]) {
        this.array = values;
        const l = this.length = values.length;
        for (let i = ((l / 2) | 0) - 1; i >= 0;) {
            this.down(i--, l);
        }
    }

    /**
     * 
     * @param value 
     */
    public insert(value: T) {
        const i = this.length++;
        this.array[i] = value;
        this.up(i, this.best);
    }

    public size() {
        return this.length - this.best;
    }

    /**
     * Return the current best element. Do not remove it
     */
    public peek(): T {
        return this.array[this.best];
    }

    /**
     * Remove the current best element
     * @param map 
     */
    public shift() {
        // TODO: fix the tree as the best is not neccessarily at best++
        this.best++;
    }

    /**
     * Removes the last element
     */
    public pop() {
        this.length--;
    }

    public replaceBest(newValue: T) {
        const i = this.best;
        this.array[i] = newValue;
        this.fix(i);
    }

    public fix(i: number) {
        if (!this.down(i, this.length)) {
            this.up(i, this.best);
        }
    }

    private up(j: number, best: number) {
        const values = this.array;
        const less = this.less.bind(null, values);
        for (let i: number; ((i = (j - 1) / 2 | 0 + best), i !== j && less(j, i)); j = i) {
            this.swap(i, j);
        }
    }
    private down(i0: number, l: number): boolean {
        const values = this.array;
        let i = i0;
        for (let j1: number; (j1 = 2 * i + 1) < l;) {
            let j = j1; // left child
            let j2 = j1 + 1;
            if (j2 < l && this.less(values, j2, j1)) {
                j = j2; // = 2 * i + 2  // right child
            }
            if (!this.less(values, j, i)) {
                break;
            }
            this.swap(i, j);
            i = j;
        }
        return i > i0;
    }

    private swap(i: number, j: number) {
        const values = this.array;
        [values[j], values[i]] = [values[i], values[j]];
    }
}

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