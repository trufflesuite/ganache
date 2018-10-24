import {EventEmitter} from "events";

ProviderEngine

export default class ProviderEngine extends EventEmitter {
  public constructor(opts: object){
    super();

    this.setMaxListeners(30)
    // parse options
    opts = opts || {}

    // block polling
    const directProvider = { sendAsync: self._handleAsync.bind(self) }
    const blockTrackerProvider = opts.blockTrackerProvider || directProvider
    this._blockTracker = opts.blockTracker || new EthBlockTracker({
      provider: blockTrackerProvider,
      pollingInterval: opts.pollingInterval || 4000,
    })

    // handle new block
    this._blockTracker.on('block', (jsonBlock) => {
      const bufferBlock = toBufferBlock(jsonBlock)
      this._setCurrentBlock(bufferBlock)
    })

    // emit block events from the block tracker
    this._blockTracker.on('block', self.emit.bind(self, 'rawBlock'))
    this._blockTracker.on('sync', self.emit.bind(self, 'sync'))
    this._blockTracker.on('latest', self.emit.bind(self, 'latest'))

    // set initialization blocker
    this._ready = new Stoplight()
    // unblock initialization after first block
    this._blockTracker.once('block', () => {
      this._ready.go()
    })
    // local state
    this.currentBlock = null
    this._providers = []
  }


  // public
  public start(cb = noop){
    // start block polling
    this._blockTracker.start().then(cb).catch(cb)
  }

  public stop(){
    // stop block polling
    this._blockTracker.stop()
  }

  public addProvider(source){
    this._providers.push(source)
    source.setEngine(this)
  }

  public send(payload){
    throw new Error('Web3ProviderEngine does not support synchronous requests.');
  }


  public sendAsync (payload, cb) {
    this._ready.await(function(){

      if (Array.isArray(payload)) {
        // handle batch
        map(payload, this._handleAsync.bind(self), cb)
      } else {
        // handle single
        this._handleAsync(payload, cb)
      }

    })
  }

// private

  private _handleAsync (payload, finished) {
    var self = this
    var currentProvider = -1
    var result = null
    var error = null

    var stack = []

    next()

    function next(after) {
      currentProvider += 1
      stack.unshift(after)

      // Bubbled down as far as we could go, and the request wasn't
      // handled. Return an error.
      if (currentProvider >= self._providers.length) {
        end(new Error('Request for method "' + payload.method + '" not handled by any subprovider. Please check your subprovider configuration to ensure this method is handled.'))
      } else {
        try {
          var provider = self._providers[currentProvider]
          provider.handleRequest(payload, next, end)
        } catch (e) {
          end(e)
        }
      }
    }

    function end(_error, _result) {
      error = _error
      result = _result

      eachSeries(stack, function(fn, callback) {

        if (fn) {
          fn(error, result, callback)
        } else {
          callback()
        }
      }, function() {
        // console.log('COMPLETED:', payload)
        // console.log('RESULT: ', result)

        var resultObj = {
          id: payload.id,
          jsonrpc: payload.jsonrpc,
          result: result
        }

        if (error != null) {
          resultObj.error = {
            message: error.stack || error.message || error,
            code: -32000
          }
          // respond with both error formats
          finished(error, resultObj)
        } else {
          finished(null, resultObj)
        }
      })
    }
  }

  //
  // from remote-data
  //

  private _setCurrentBlock(block){
    this.currentBlock = block
    this.emit('block', block)
  }
}
// util

function toBufferBlock (jsonBlock) {
  return {
    number:           ethUtil.toBuffer(jsonBlock.number),
    hash:             ethUtil.toBuffer(jsonBlock.hash),
    parentHash:       ethUtil.toBuffer(jsonBlock.parentHash),
    nonce:            ethUtil.toBuffer(jsonBlock.nonce),
    mixHash:          ethUtil.toBuffer(jsonBlock.mixHash),
    sha3Uncles:       ethUtil.toBuffer(jsonBlock.sha3Uncles),
    logsBloom:        ethUtil.toBuffer(jsonBlock.logsBloom),
    transactionsRoot: ethUtil.toBuffer(jsonBlock.transactionsRoot),
    stateRoot:        ethUtil.toBuffer(jsonBlock.stateRoot),
    receiptsRoot:     ethUtil.toBuffer(jsonBlock.receiptRoot || jsonBlock.receiptsRoot),
    miner:            ethUtil.toBuffer(jsonBlock.miner),
    difficulty:       ethUtil.toBuffer(jsonBlock.difficulty),
    totalDifficulty:  ethUtil.toBuffer(jsonBlock.totalDifficulty),
    size:             ethUtil.toBuffer(jsonBlock.size),
    extraData:        ethUtil.toBuffer(jsonBlock.extraData),
    gasLimit:         ethUtil.toBuffer(jsonBlock.gasLimit),
    gasUsed:          ethUtil.toBuffer(jsonBlock.gasUsed),
    timestamp:        ethUtil.toBuffer(jsonBlock.timestamp),
    transactions:     jsonBlock.transactions,
  }
}
