const steem = require('dsteem');
const steemState = require('steem-state');
const steemTransact = require('steem-transact');
const readline = require('readline');
const safeEval = require('safe-eval')
const IPFS = require('ipfs-api');
const ipfs = new IPFS({ host: 'ipfs.infura.io', port: 5001, protocol: 'https'});
const args = require('minimist')(process.argv.slice(2));
const express = require('express')
const cors = require('cors')
const steemClient = require('steem')
const fs = require('fs');
const config = require('./config');
//const RSS = require('rss-generator');
// Attempts to get the hash of that state file.

const crypto = require('crypto')
const bs58 = require('bs58')
const hashFunction = Buffer.from('12', 'hex')
function hashThis(data) {
  const digest = crypto.createHash('sha256').update(data).digest()
  const digestSize = Buffer.from(digest.byteLength.toString(16), 'hex')
  const combined = Buffer.concat([hashFunction, digestSize, digest])
  const multihash = bs58.encode(combined)
  return multihash.toString()
}
const testing = true
const VERSION = 'v0.0.2a'
const api = express()
var http = require('http').Server(api);
//const io = require('socket.io')(http)
var escrow = false
var broadcast = 1
const wif = steemClient.auth.toWif(config.username, config.active, 'active')
const resteemAccount = 'dlux-io';
var startingBlock = 	29565257;
var current, dsteem, testString

const prefix = 'dlux_dex_';
const streamMode = args.mode || 'irreversible';
console.log("Streaming using mode", streamMode);
var client = new steem.Client(config.clientURL);
var processor;

var pa = []

const Unixfs = require('ipfs-unixfs')
const {DAGNode} = require('ipld-dag-pb')

function hashThis2(datum) {
  const data = Buffer.from(datum, 'ascii')
  const unixFs = new Unixfs('file', data)
  DAGNode.create(unixFs.marshal(), (err, dagNode) => {
    if (err){return console.error(err)}
    console.log(hashThis2(JSON.stringify(dagNode)))
    return hashThis2(JSON.stringify(dagNode)) // Qmf412jQZiuVUtdgnB36FXFX7xg5V6KEbSJ4dpQuhkLyfD
  })
}
// Read line for CLI access
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Cycle through good public IPFS gateways
var cycle = 0
function cycleipfs(num){
  //ipfs = new IPFS({ host: state.gateways[num], port: 5001, protocol: 'https' });
}

if (config.active && config.NODEDOMAIN) {
  escrow = true
  dsteem = new steem.Client('https://api.steemit.com')
}
api.use(cors())
api.get('/', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify({stats: state.stats, node: config.username, VERSION, realtime: current}, null, 3))
});
api.get('/@:un', (req, res, next) => {
  let un = req.params.un
  var bal, pb, lp, lb
  try {
    bal = state.balances[un] || 0
  } catch(e){
    bal = 0
  }
  try {
    pb = state.pow[un] || 0
  } catch(e){
    pb = 0
  }
  try {
    lp = state.pow.n[un] || 0
  } catch(e){
    lp = 0
  }
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({balance: bal, poweredUp: pb, powerBeared: lp}, null, 3))
});
api.get('/stats', (req, res, next) => {
  var totalLiquid = 0, totalPower = state.pow.t, totalNFT = 0
  for(var bal in state.balances){
    totalLiquid += state.balances[bal]
  }
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({stats: state.stats, totalLiquid, totalPower, totalNFT, totalcheck: (totalLiquid+totalPower+totalNFT), node: config.username, VERSION, realtime: current}, null, 3))
});
api.get('/state', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({state: state, node: config.username, VERSION, realtime: current}, null, 3))
});
api.get('/pending', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(NodeOps, null, 3))
});
api.get('force', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({stats: state, node: config.username, VERSION, realtime: current}, null, 3))
});
api.get('/runners', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({stats: state.runners, node: config.username, VERSION, realtime: current}, null, 3))
});
api.get('/markets', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({markets: state.markets, stats: state.stats, node: config.username, VERSION, realtime: current}, null, 3))
});
api.get('/dex', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({markets: state.dex, node: config.username, VERSION, realtime: current}, null, 3))
});
api.get('/priv/list/:un', (req, res, next) => {
  let un = req.params.un
  res.setHeader('Content-Type', 'application/json');
  var lists = Utils.getAllContent(un)
  lists.then(function(list){
    res.send(JSON.stringify({list, access_level: Utils.accessLevel(un), node: config.username, VERSION, realtime: current}, null, 3))
  });
});
api.get('/report/:un', (req, res, next) => {
  let un = req.params.un
  let report = state.markets.node[un].report || ''
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({[un]: report, node: config.username, hash: state.stats.hashLastIBlock, VERSION, realtime: current}, null, 3))
});
api.get('/private/:un/:pl', (req, res, next) => {
  let un = req.params.un
  let pl = req.params.pl
  res.setHeader('Content-Type', 'application/json');
  Utils.getContent(pl, un).then(value => {
    Utils.sealer(value.body,un).then(enc => {
      value.body = enc
      res.send(JSON.stringify({[pl]: value, node: config.username, VERSION, realtime: current}, null, 3))
    })
  });
});
//api.listen(port, () => console.log(`DLUX token API listening on port ${port}!\nAvailible commands:\n/@username =>Balance\n/stats\n/markets`))
http.listen(config.port, function(){
  console.log(`DLUX token API listening on port ${config.port}`);
});
var utils = {
  chronoSort: function (){state.chrono.sort(function(a, b){return a.block - b.block});},
  cleaner: function(num, prune){
    for (var node in state.markets.node){
      if (state.markets.node[node].report.block < num - prune || 28800){
        if (state.markets.node[node].report.stash && state.markets.node[node].report.stash.length < 255 && typeof state.markets.node[node].report.stash.length === 'string'){
          var temp = {
            stash: state.markets.node[node].report.stash,
            hash: state.markets.node[node].report.hash
          }
          delete state.markets.node[node].report
          state.markets.node[node].report = temp
        } else {
          delete state.markets.node[node].report
        }
      }
    }
  },
  agentCycler: function (){var x=state.queue.shift();state.queue.push(x);return x},
  cleanExeq: function (id){
    for (var i = 0; i < state.exeq.length;i++){
      if (state.exeq[i][1] == id) {
        state.exeq.splice(i,1)
        i--;
      }
    }
  }
}

var state = {
  limbo: {},
  listeners: [],
  balances: {
    ra: 0, //reward_account
    rb: 0, //reward_budget for PRs and Bounties ... falls over to content
    rc: 0, //reward_content for distribution to steem content and it's curators
    rd: 0, //reward_delegation for distribution to delegators paid ever 25.2 hours on daily block
    re: 0, //reward_earn for distribution over powered up dlux
    ri: 0, //reward_ipfs for IPFS distribution
    rr: 0, //reward_relays for relays
    rn: 0, //reward_nodes
    rm: 0, //reward_marketing
    'kellie.leigh': 30000000,
    surfyogi: 12000000,
    sunlakeslady: 3000000,
    bitduck86: 2000000,
    'a1-shroom-spores': 366930893,
    vasqus: 2000000,
    'phteven.withap':2000000,
    'cowboys.angel':5000000,
    'paint.baller':7500000,
    'dlux-io': 1076534619,
    disregardfiat: 609782131,
    eastmael: 2642016252,
    elgeko: 1541678003,
    gabbagallery: 154048506,
    cryptoandzen: 9678522360,
    markegiles: 351607424,
    whatsup: 354120054,
    'd-pend': 115971555,
    flash07: 14835383,
    onealfa: 330684833,
    kriptonik: 3781392824,
    gabbynhice: 98966309,
    ackza: 17334875,
    pangoli: 337242993,
    fyrstikken: 2876970756,
    angelveselinov: 13871442,
    michelios: 765105346,
    masterthematrix: 300536260,
    taskmaster4450: 303228702,
    direwolf: 1457368336,
    jznsamuel: 117465501,
    'bobby.madagascar': 851326728,
    itstime: 251729602,
    igster: 327224585,
    deybacsi: 1414164,
    protegeaa: 404618037,
    gattino: 53820121,
    mannacurrency: 23483466,
    seareader1: 58685485,
    pocketrocket: 11454529,
    preparedwombat: 297184552,
    jasnusface: 228763194,
    nataboo: 13324208,
    j85063: 9932060,
    'b-s': 285971198,
    theycallmedan:	257417202,
    tkept260:	2084821208,
    runicar:	230367158,
    acidyo:	3322027278,
    lanmower:	46531833,
    tarazkp:	1595993135,
    juvyjabian:	471523822,
    stackin:	18253398,
    dera123:	180762943,
    rovill:	137550256,
    tracilin:	4501508255,
    doon:	164596226,
  },
  pow: {
    n:{},
    t: 56800000000,
    disregardfiat: 1000000000, //cofounder
    markegiles: 1000000000, //cofounder
    shredz7: 100000000, //contributor
    'a1-shroom-spores': 100000000, //contributor
    caramaeplays: 100000000,  //incubator
    'dlux-io': 35000000000, // 5M community initiatives + 30M bank
    'robotolux':19500000000 //17.5M auction 2M delegators
  },
  rolling: {},
  nft: {},
  chrono: [],
  pending: [],
  exeq: [],
  exes: [],
  limbo: {},
  queue: ['dlux-io'],
  escrow: [],
  bannedNodes: [],
  agents: {
    'dlux-io':{
      self:'dlux-io',
      queue:[],
      online: true
    }
  },
  expired: [
  ],
  contracts: {},
  posts: [],
  delegations: [
    {delegator:'ackza',vests:202000000000},
    {delegator:'b-s',vests:161000000000},
    {delegator:'blockcryptochain',vests:20000000000},
    {delegator:'bobby.madagascar',vests:403000000000},
    {delegator:'bryan-imhoff',vests:202000000000},
    {delegator:'bubke',vests:1009000000000},
    {delegator:'dera123',vests:100000000000},
    {delegator:'direwolf',vests:21000000000},
    {delegator:'disregardfiat',vests:20000000000},
    {delegator:'east.autovote',vests:24000000000},
    {delegator:'eastmael',vests:202000000000},
    {delegator:'elementm',vests:201000000000},
    {delegator:'flash07',vests:20000000000},
    {delegator:'igster',vests:202000000000},
    {delegator:'j85063',vests:202000000000},
    {delegator:'jznsamuel',vests:202000000000},
    {delegator:'kriptonik',vests:201000000000},
    {delegator:'masterthematrix',vests:301000000000},
    {delegator:'michelios',vests:3579000000000},
    {delegator:'okean123',vests:50000000000},
    {delegator:'preparedwombat',vests:202000000000},
    {delegator:'protegeaa',vests:2017000000000},
    {delegator:'shellyduncan',vests:404000000000},
    {delegator:'snubbermike',vests:2019000000000},
    {delegator:'superlotto',vests:251000000000},
    {delegator:'tarazkp',vests:1206000000000},
    {delegator:'taskmaster4450',vests:202000000000},
    {delegator:'whatsup',vests:1009000000000},
  ],
  ico: [],
  br: [],
  stats: {
    hashLastIBlock: '',
    lastBlock: 0,
    tokenSupply: 100000000000,
    interestRate: 2100000,
    nodeRate: 1000,
    IPFSRate: 2000,
    budgetRate: 2000,
    maxBudget: 1000000000,
    savingsRate: 1000,
    marketingRate: 1000,
    resteemReward: 10000,
    delegationRate: 1000,
    currationRate: 2500,
    am:{
      pool: 16,
      cost: 10000,
      surgeCost: 10000,
      dailyPool: 3,
      surgePool: 3,
      createdR: [0,0,0,0,0],
      claimedR: [0,0,0,0,0],
      costR: [10000,10000,10000,10000,10000],
    },
    accountMarket: {
      'dlux-io': {
        claimed: 16,
        created: 0,
        createdToday: 0,
      }
    }
  },
  dex: {
    steem: {
      tick: '',
      buyOrders: [],
      sellOrders: [],
      his: [],
      days: [],
      weeks: [],
      months: []
    },
    sbd: {
      tick: '',
      buyOrders: [],
      sellOrders: [],
      his: [],
      days: [],
      weeks: [],
      months: []
    }
  },
  runners: {
    'dlux-io': {
      self: 'dlux-io',
      domain: 'https://token.dlux.io'
    }
  },
  markets: {
    node: {
      'dlux-io': {
        self: 'dlux-io',
        domain: 'https://token.dlux.io',//'https://dlux-token.herokuapp.com',
        bidRate: 2000,
        marketingRate: 2000,
        attempts: 10000,
        yays: 10000,
        wins: 10000,
        contracts: 0,
        lastGood: 0,
        transfers: 0,
        report: {
          agreements:{
            'dlux-io': {
              node:	"dlux-io",
              agreement:	true
            },
          },
          hash: "",
          block:	0
          }
      }
    }
  }
}

var plasma = {}
var NodeOps = []

const transactor = steemTransact(client, steem, prefix);
var selector = 'dlux-io'
if (config.username == selector){selector = 'markegiles'}
/*
fetch(`${state.markets.node[selector].domain}/markets`)
  .then(function(response) {
    return response.json();
  })
  .then(function(myJson) {
      if(myJson.markets.node[config.username]){
        if (myJson.markets.node[config.username].report.stash){
          ipfs.cat(myJson.markets.node[config.username].report.stash, (err, file) => {
            if (!err){
              var data = JSON.parse(file);
              Private = data;
              console.log(`Starting from ${myJson.markets.node[config.username].report.hash}\nPrivate encrypted data recovered`)
              startWith(myJson.markets.node[config.username].report.hash)
            } else {
              console.log(`Lost Stash... Abandoning and starting from ${myJson.stats.hashLastIBlock}`) //maybe a recovery fall thru?
              startWith(myJson.markets.node[selector].report.hash);
            }
          });
        } else {
          console.log(`No Private data found\nStarting from ${myJson.stats.hashLastIBlock}`)
          startWith(myJson.markets.node[selector].report.hash)//myJson.stats.hashLastIBlock);
        }
      } else {
        console.log(`Starting from ${myJson.markets.node[selector].report}`)
        startWith(myJson.markets.node[selector].report.hash);
      }
  }).catch(error => {console.log(error, `\nStarting 'startingHash': ${config.engineCrank}`);startWith(config.engineCrank);});
*/

startWith(config.engineCrank)

function startWith (sh){
  if (sh){
console.log(`Attempting to start from IPFS save state ${sh}`);
  ipfs.cat(sh, (err, file) => {
    if (!err){
      var data = JSON.parse(file);
      startingBlock = data[0]
      state = data[1];
      startApp();
    } else {
      startWith (config.engineCrank)
      console.log(`${sh} failed to load, Replaying from genesis.\nYou may want to set the env var STARTHASH\nFind it at any token API such as token.dlux.io`)
    }
  });
} else { startApp()}
}


function startApp() {
  processor = steemState(client, steem, startingBlock, 10, prefix, streamMode);

  processor.on('send', function(json, from) {
    //check json.memo to contracts for resolution
    if (json.memo){
      for (var i = 0;i < state.listeners.length;i++){
        if(json.memo == state.listeners[i][0]){
          if (state.contracts[state.listeners[i][1]] && state.contracts[state.listeners[i][1]].listener[0] && state.contracts[state.listeners[i][1]].listener[0][2] == json.to && state.contracts[state.listeners[i][1]].listener[0][3] == json.amount){
            //set up contract execution
          }
        }
      }
    }
    if(json.to && typeof json.to == 'string' && typeof json.amount == 'number' && (json.amount | 0) === json.amount && json.amount >= 0 && state.balances[from] && state.balances[from] >= json.amount) {

      if(state.balances[json.to] === undefined) {
        state.balances[json.to] = 0;
      }
      if (json.to == config.username && Private.models.length > 0){
        for (var i = 0;i < Private.models.length;i++){
          if (json.amount == Private.models[i][2] && json.tier == Private.models[i][1]){
            Utils.assignLevel(from, json.tier, processor.getCurrentBlockNumber() + Private.models[i][0] )
            break;
          }
        }
      }
      state.balances[json.to] += json.amount;
      state.balances[from] -= json.amount;
      console.log(current + `:Send occurred from ${from} to ${json.to} of ${json.amount}DLUX`)
    } else {
      console.log(current + `:Invalid send operation from ${from}`)
    }
  });


/* Custom node software */
  processor.on(config.username, function(json, from) { //redesign for private stash
    if (from == config.username){
      switch (json.exe) {
        case 'schedule':
          pa.push([
            json.id,
            json.blockrule,
            json.op,
            json.params
            ])
          break;
        case 'cancel':
          for(var i = 0;i<pa.length;i++){
            if(json.id == pa[i][0]){
              pa.splice(i,1)
              break;
            }
          }
          break;
        default:

      }

    }
  });

// power up tokens
  processor.on('power_up', function(json, from) {
    var amount = parseInt(json.amount)
    if(typeof amount == 'number' && amount >= 0 && state.balances[from] && state.balances[from] >= amount) {
      if(state.pow[from] === undefined) {
        state.pow[from] = amount;
        state.pow.t += amount
        state.balances[from] -= amount
      } else {
        state.pow[from] += amount;
        state.pow.t += amount
        state.balances[from] -= amount
      }
      console.log(current + `:Power up occurred by ${from} of ${json.amount} DLUX`)
    } else {
      console.log(current + `:Invalid power up operation from ${from}`)
    }
  });

// power down tokens
  processor.on('power_down', function(json, from) {
    var amount = parseInt(json.amount)
    if(typeof amount == 'number' && amount >= 0 && state.pow[from] && state.pow[from] >= amount) {
      var odd = parseInt(amount % 13), weekly = parseInt(amount / 13)
      for (var i = 0;i<13;i++){
        if (i==12){weekly += odd}
        state.chrono.push({block: parseInt(processor.getCurrentBlockNumber()+(200000 * (i+1))), op:'power_down', amount: weekly, by: from})//fix current!!!
      }
      utils.chronoSort()
      console.log(current + `:Power down occurred by ${from} of ${amount} DLUX`)
    } else {
      console.log(current + `:Invalid power up operation from ${from}`)
    }
  });

// vote on content
  processor.on('vote_content', function(json, from) {
    if(state.pow[from] >= 1){
      for (var i = 0;i <state.posts.length;i++){
        if (state.posts[i].author === json.author && state.posts[i].permlink === json.permlink){
          if (!state.rolling[from]){
            state.rolling[from] = (state.pow.n[from] || 0) + state.pow[from] * 10
          }
          if (json.weight > 0 && json.weight < 10001){
          state.posts[i].weight += parseInt(json.weight * state.rolling[from] / 100000)
          state.posts[i].voters.push({from: from, weight:parseInt(10000 * state.rolling[from] / 100000)})
          state.rolling[from] -= parseInt(json.weight * state.rolling[from] / 100000)
        } else {
          state.posts[i].weight += parseInt(10000 * state.rolling[from] / 100000)
          state.posts[i].voters.push({from: from, weight:parseInt(10000 * state.rolling[from] / 100000)})
          state.rolling[from] -= parseInt(10000 * state.rolling[from] / 100000)
        }
        } else {
          console.log(current + `:${from} tried to vote for an unknown post`)
        }
      }
    } else {
      console.log(current + `:${from} doesn't have the dlux power to vote`)
    }
  });


//create nft
  processor.on('create_nft', function(json, from) {
    var self = 'DLUX' + hashThis(from + processor.getCurrentBlockNumber()), error = '', actions = [0]//fix current with block num

    var nft = {
      self,
      block: processor.getCurrentBlockNumber(),//fix current with blocknum
      creator: from,
      bearers: [from],
      owners: [{[from]:1}],
      owns: [],
      bal: 0,
      pow: 0,
      fee: 0,
      deposits: {},
      auths: { //planned, nft
        //'*':[2,3],//'*' anyone,'s' authedArray, 'specific', 'a' agent, 'b' bearer, 'c' creator
        //'a':[0,1,2,3,4,6,7,8,9],//permissions 1 continue, 2 deposit, 3 complex deposit, 4 withdraw, 5 withdraw pow
        //'c':[5],//6 release table 0, 7 release table 1, 8 transfer, 9 change to assets, 10 change of expiration
        //'b':[0,4],//
      },//0 destroy?
      authed: ['user'],
      pubKey: '', //private key on physical item. sumbitter hashes private key to their steem name, easy to verify at network level
      weight: 1,//for multisig authed change on expires?? A always requires 2 if distributed
      behavior: -1,// -1 fail to depositors, -(2 + n) release to [n]table, 0 custom, 1 auction, 2 simple equity deposit, 3 simple bet(code 0/1), 4 key purchase, 5 ad, 6 quest
      rule: '',//SP bearer inst // equity loan / auction with raffle / fair bet / 6 quest rule: [['keyPub','code',[0,1,2,'preReq'],[dlux, asset > asset n],complete, 'clue'],...]
      memo: '',
      icon: '',//ipfs address
      withdraw: [],
      withdrawPow: {},
      withdrawAsset: [],
      incrementer: 0,
      stack: [],
      votes: [],
      icon: '',
      api: '',
      ipfsItem: '',
      benifactors: [[{u:from,d:json.nft.bal || 0}],[]],
      assetBenifactors: [[],[]],
      lastExecutor: [from, processor.getCurrentBlockNumber()],
      listener: [],// to set up custom pulls from steem stream, for instance json sm gifts
      matures: processor.getCurrentBlockNumber(),
      expires: processor.getCurrentBlockNumber() + 100000,
    }
    if(json.nft.pow){
      if(state.pow[from]){
        if (state.pow[from] > json.nft.pow){
          actions.append(2)
        } else {error += ':Insufficient POW to create NFT:'}
      } else {error += ':Insufficient POW to create NFT:'}
    }
    nft.pow = json.nft.pow || 0
    if(json.nft.bal){
      if(state.balances[from]){
        if (state.balances[from] > json.nft.pow){
          actions.append(1)
          nft.deposits = {[from]:json.nft.bal}
        } else {error += ':Insufficient DLUX to create NFT:'}
      } else {error += ':Insufficient DLUX to create NFT:'}
    }
    nft.bal = json.nft.bal || 0
    if(json.nft.pool){
      if(state.balances[from]){
        if (state.balances[from] > json.nft.pool + nft.bal){
          actions.append(1)
          if(json.nft.fee > 0 && json.nft.fee < 25){nft.fee = json.nft.fee}
          else {if(json.nft.behavior > 1){nft.fee = 0}else{nft.fee=1}}
        } else {error += ':Insufficient DLUX to create NFT:'}
      } else {error += ':Insufficient DLUX to create NFT:'}
    }
    nft.fee = json.nft.fee || 0
    if (!nft.fee){error += ':Insuffiecient Fee:'}
    if (json.nft.behavior >= 0 && json.nft.behavior < 7) {//cases for contracts
      nft.behavior = json.nft.behavior
    }
    if(nft.behavior == -1){error += 'Contract Behavior not Understood'}
    if(json.nft.authed){nft.authed = json.nft.authed}
    if(typeof json.nft.weight === 'number' && json.nft.weight <= nft.authed.length && json.nft.weight >= 0){nft.authed = json.nft.authed}
    else {nft.weight = 1}
    if (nft.behavior == 0){nft.rule = json.nft.rule}
    nft.memo = json.nft.memo || ''
    nft.icon = json.nft.icon  || ''
    nft.stack = json.nft.stack  || []
    //nft.listener = json.nft.listener || []
    if (json.nft.expires > processor.getCurrentBlockNumber()){
      nft.expires = json.nft.expires
    } else {error += ':NFT Expires in past:'}
    if (json.nft.matures && json.nft.matures < json.nft.expires){
      nft.matures = json.nft.matures
    }
    if(!error){
      if (actions.indexOf(1) >= 0){
        state.balances[from] -= nft.bal + nft.pool
        nft.deposits[from] = nft.bal
      }
      if (actions.indexOf(2) >= 0){
        state.pow[from] -= nft.pow
        if(state.pow.n[from] === undefined){state.pow.n[from] = 0}
        state.pow.n[from] += nft.pow
      }
      state.contracts[self] = nft
      if (state.nft[from] === undefined){state.nft[from] = [nft.self]}
      else {state.nft[from].push(nft.self)}
      console.log(`${self} created with ${nft.bal} DLUX and ${nft.pow} DLUX POW\n${self} has a ${nft.behavior} behavior`)
    } else {
      console.log(error)
    }
  });


  processor.on('transfer_nft', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    var bearer = '', error = '', to = '', i = 0, c = 0
    if (state.contracts[json.nftid]){bearer = state.contracts[json.nftid].bearers[-1]}
    if (json.to.charAt(0) == 'D'){
      if (json.to == state.contracts[json.to].self){to = json.to;c=1}
    } else {to = json.to}
    if (!bearer){error += ' Reciepient Contract not found'}
    if (bearer != from){error +=' NFT Transfer not authorized.'}
    if(!to){error += ' Recipient Contract not Found.'}
    if (!error){
      for(; i < state.nft[from].length;i++){
        if(state.nft[from][i] == json.nftid){
          state.nft[from].splice(i,1)
          break;
        }
      }
      if(!c){
        if (state.nft[to] === undefined){state.nft[to] = [json.nftid]}
        else {state.nft[to].push(json.nftid)}
      } else {
        //run nft as asset thru nft process
      }
      state.contracts[json.nftid].bearers.push(json.to)
      if(state.contracts[json.nftid].pow > 0){
        state.pow.n[state.contracts[json.nftid].bearers[-2]] -= state.contracts[json.nftid].pow
        if (state.pow.n[json.to] === undefined){state.pow.n[json.to] = 0}
        state.pow.n[json.to] += state.contracts[json.nftid].pow
        state.pow.n[from] -= state.contracts[json.nftid].pow
      }
    } else {console.log(error)}
  });

  processor.on('custom_cms_' + config.username + '_add', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.addContent(json.content)
    }
  });

  processor.on('custom_cms_' + config.username + '_set_level', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.setContentLevel(json.content, json.level)
    }
  });

  processor.on('custom_cms_' + config.username + '_delete', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.deleteContent(json.content)
    }
  });

  processor.on('custom_cms_' + config.username + '_tier_add', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.addAccessLevel()
    }
  });

  processor.on('custom_cms_' + config.username + '_tier_delete', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.removeAccessLevel(json.tier)
    }
  });

  processor.on('custom_cms_' + config.username + '_model_add', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.addModel(json.num,json.tier, json.dlux)
    }
  });

  processor.on('custom_cms_' + config.username + '_model_delete', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.deleteModel(json.num,json.tier, json.dlux)
    }
  });

  processor.on('custom_cms_' + config.username + '_add_user', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.assignLevel(json.name, json.tier, json.expires)
    }
  });

  processor.on('custom_cms_' + config.username + '_ban_user', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.ban(json.name)
    }
  });

  processor.on('custom_cms_' + config.username + '_unban_user', function(json, from) {//json.to valid contract or random name json.nftid valid contract beared
    if (from == config.username){
      Utils.unban(json.name)
    }
  });

  processor.on('delete_nft', function(json, from) {
    var e = 1
    if(json.nftid && typeof json.nftid === 'string' && state.contracts[from]){
        for (var i = 0;i<state.contracts[from].length;i++){
          if (state.contracts[from][i][0]==json.nftid){
            state.contracts[from].splice(i,1)
            console.log(current + `:${from} deleted an NFT`)
            e=0
            break;
          }
        }
    }
    if (e){console.log(current + `:${from} tried to delete an NFT that wasn't theirs`)}
  });

  processor.on('nft_op', function(json, from) {
    var i,j, auth = false, ex = ''
    for (i = 0; i < state.exeq.length;i++){
      if(state.exeq[i][1] == json.nftid){
        if (from == state.exeq[i][0]){
          state.exeq.splice(i,1)
          auth = true
        }
        ex = json.nftid

        break;
      }
    }//check to see if agent elected
    if(auth && ex){
      for (j = 0; j < state.exes.length; j++){
        if(state.exes[j].id == json.nftid){
          state.exes[j].op.push([json.proposal,json.completed,json.runtime])
          auth = 'updated'
          break;
        }
        if(auth == 'updated' && state.exes[j].op.length == 2){
          if (state.exes[j].op[0].proposal == state.exes[j].op[1].proposal){
            state.contracts[json.nftid] = json.proposal
            state.exe.splice(j,1)
            utils.cleanExeq(json.nftid)
            console.log(current + `:${json.nftid} updated`)
          }
        } else if (auth == 'updated' && state.exes[j].op.length == 3){
          if (state.exes[j].op[0].proposal == state.exes[j].op[2].proposal){
            state.contracts[json.nftid] = json.proposal
            state.exe.splice(j,1)
            utils.cleanExeq(json.nftid)
            console.log(current + `:${json.nftid} updated`)
          } else if (state.exes[j].op[1].proposal == state.exes[j].op[2].proposal){
            state.contracts[json.nftid] = json.proposal
            state.exe.splice(j,1)
            utils.cleanExeq(json.nftid)
            console.log(current + `:${json.nftid} updated`)
          }
        }
      }
    } else if (ex){
      if (state.exes[j].op[0].proposal == json.proposal && current > 50 + state.exes[j].b){
        state.contracts[json.nftid] = json.proposal
        state.exe.splice(j,1)
        utils.cleanExeq(json.nftid)
        console.log(current + `:${json.nftid} updated`)
      } else if (state.exes[j].op[1].proposal == json.proposal && current > 50 + state.exes[j].b){
        state.contracts[json.nftid] = json.proposal
        state.exe.splice(j,1)
        utils.cleanExeq(json.nftid)
        console.log(current + `:${json.nftid} updated`)
      } else if (state.exes[j].op[2].proposal == json.proposal && current > 50 + state.exes[j].b){
        state.contracts[json.nftid] = json.proposal
        state.exe.splice(j,1)
        utils.cleanExeq(json.nftid)
        console.log(current + `:${json.nftid} updated`)
      }
    }
  });


//dex transactions
  processor.on('dex_buy', function(json, from) {
    var found = ''
    try {
      if(state.contracts[json.to][json.contract].sbd){
        for (var i = 0;i < state.dex.sbd.buyOrders.length;i++){
          if (state.dex.sbd.buyOrders[i].txid == json.contract){
            found = state.dex.sbd.buyOrders[i];break;
          }
        }
        //delete state.contracts[json.to][json.contract]
      } else {
        for (var i = 0;i < state.dex.steem.buyOrders.length;i++){
          if (state.dex.steem.buyOrders[i].txid == json.contract){
            found = state.dex.steem.buyOrders[i];break;
          }
        }
        //delete state.contracts[json.to][json.contract] leave for transaction verification
      }
    } catch(e){}
    if(found){
      if (state.balances[from] >= found.amount){
        if (state.balances[found.auths[0][1][1].to] > found.amount){
          state.balances[found.auths[0][1][1].to] -= found.amount
          state.contracts[json.to][json.contract].escrow = found.amount
          console.log(current + `:${from} sold ${state.contracts[json.to][json.contract].amount} DLUX`)
          state.balances[from] -= found.amount
          state.balances[found.from] += found.amount
          state.escrow.push(found.auths[0])
          state.escrow.push(found.auths[1])
          if (found.steem) {
            state.escrow.push([found.auths[0][1][1].to,
              [
                "transfer",
                {
                  "from": found.auths[0][1][1].to,
                  "to": from,
                  "amount": (found.steem/1000).toFixed(3) + ' STEEM',
                  "memo": `${json.contract} purchased with ${found.amount} DLUX`
                }
              ]])
            } else {
                state.escrow.push([found.auths[0][1][1].to,
                  [
                    "transfer",
                    {
                      "from": found.auths[0][1][1].to,
                      "to": from,
                      "amount": (found.sbd/1000).toFixed(3) + ' SBD',
                      "memo": `${json.contract} fulfilled with ${found.amount} DLUX`
                    }
                ]])
              }
              if(found.sbd){
                for (var i = 0;i < state.dex.sbd.buyOrders.length;i++){
                  if (state.dex.sbd.buyOrders[i].txid == json.contract){
                    state.dex.sbd.buyOrders.splice(i,1);break;
                  }
                }
                //delete state.contracts[json.to][json.contract]
              } else {
                for (var i = 0;i < state.dex.steem.buyOrders.length;i++){
                  if (state.dex.steem.buyOrders[i].txid == json.contract){
                    state.dex.steem.buyOrders.splice(i,1);break;
                  }
                }
                //delete state.contracts[json.to][json.contract] leave for transaction verification
              }
            }
          } else {
            console.log(`${json.agent} has insuficient liquidity. Contract has been voided.`)
            state.escrow.push(found.reject[0])
          }
      }
  });

  processor.on('dex_steem_sell', function(json, from) {
    var buyAmount = parseInt(json.steem)
    if (json.dlux <= state.balances[from]){
      var txid = 'DLUX' + hashThis(from + current)
      state.dex.steem.sellOrders.push({txid, from: from, steem: buyAmount, sbd: 0, amount: parseInt(json.dlux), rate:parseInt((json.dlux)/(buyAmount)), block:current, partial: json.partial || true})
      state.balances[from] -= json.dlux
      if(state.contracts[from]) {
        //arrange transfer to agent instead
        state.contracts[from][txid] = state.dex.steem.sellOrders[state.dex.steem.sellOrders.length -1]
      } else {
        state.contracts[from] = {[txid]:state.dex.steem.sellOrders[state.dex.steem.sellOrders.length -1]}
      }
      sortSellArray (state.dex.steem.sellOrders, 'rate')
      console.log(current + `:@${from} has placed order ${txid} to sell ${json.dlux} for ${json.steem} STEEM`)
    } else {console.log(current + `:@${from} tried to place an order to sell ${json.dlux} for ${json.steem} STEEM`)}
  });

  processor.on('dex_sbd_sell', function(json, from) {
    var buyAmount = parseInt(parseFloat(json.sbd) * 1000)
    if (json.dlux <= state.balances[from]){
      var txid = 'DLUX' + hashThis(from + current)
      state.dex.sbd.sellOrders.push({txid, from: from, steem: 0, sbd: buyAmount, amount: json.dlux, rate:parseInt((json.dlux)/(buyAmount)), block:current, partial: json.partial || true})
      state.balances[from] -= json.dlux
      if(state.contracts[from]) {
        state.contracts[from][txid] = state.dex.sbd.sellOrders[state.dex.sbd.sellOrders.length -1]
      } else {
        state.contracts[from] = {[txid]:state.dex.sbd.sellOrders[state.dex.sbd.sellOrders.length -1]}
      }
      sortSellArray (state.dex.sbd.sellOrders, 'rate')
      console.log(current + `:@${from} has placed an order to sell ${json.dlux} for ${json.sbd} SBD`)
    }
  });

  processor.on('dex_clear_buys', function(json, from) {
    var l = 0, t = 0
    for (var i = 0; i < state.dex.steem.buyOrders.length; i++) {
      if (state.dex.steem.buyOrders[i].from == from) {
        state.pending.push(state.dex.steem.buyOrders[i].reject)
        delete state.contracts[from][state.dex.steem.sellOrders[i].txid]
        state.dex.steem.buyOrders.splice(i,1)
      }
    }
    for (var i = 0; i < state.dex.sbd.sellOrders.length; i++) {
      if (state.dex.sbd.buyOrders[i].from == from) {
        state.pending.push(state.dex.sbd.buyOrders[i].reject)
        delete state.contracts[from][state.dex.sbd.sellOrders[i].txid]
        state.dex.sbd.buyOrders.splice(i,1)
      }
    }
    console.log(current + `:${from} has canceled ${i} orders and recouped ${t} DLUX`)
  });

  processor.on('dex_clear_sells', function(json, from) {
    var l = 0, t = 0
    for (var i = 0; i < state.dex.steem.sellOrders.length; i++) {
      if (state.dex.steem.sellOrders[i].from == from) {
        state.balances[from] += state.dex.steem.sellOrders[i].amount
        delete state.contracts[from][state.dex.steem.sellOrders[i].txid]
        t += state.dex.steem.sellOrders[i].amount
        state.dex.steem.sellOrders.splice(i,1)
        i++
      }
    }
    for (var i = 0; i < state.dex.sbd.sellOrders.length; i++) {
      if (state.dex.sbd.sellOrders[i].from == from) {
        state.balances[from] += state.dex.sbd.sellOrders[i].amount
        delete state.contracts[from][state.dex.sbd.sellOrders[i].txid]
        t += state.dex.sbd.sellOrders[i].amount
        state.dex.sbd.sellOrders.splice(i,1)
        i++
      }
    }
    console.log(current + `:${from} has canceled ${i} orders and recouped ${t} DLUX`)
  });

  processor.onOperation('escrow_transfer', function(json,from){//grab posts to reward
    var op, dextx, contract, isAgent, isDAgent
    try {
      dextx = json.json_meta.dextx
      contract = state.contracts[json.to][json.json_meta.contract]
      isAgent = state.markets.node[json.agent]
      isDAgent = state.markets.node[json.to]
    } catch(e) {}
    if (isAgent && isDAgent && dextx){//two escrow agents to fascilitate open ended transfer with out estblishing steem/sbd bank //expiration times??

      var txid = 'DLUX' + hashThis(from + current)
      var auths = [[json.agent,
        [
          "escrow_approve",
          {
            "from": json.from,
            "to": json.to,
            "agent": json.agent,
            "who": json.agent,
            "escrow_id": json.escrow_id,
            "approve": true
        }
      ]],[json.to,
        [
          "escrow_approve",
          {
            "from": json.from,
            "to": json.to,
            "agent": json.agent,
            "who": json.to,
            "escrow_id": json.escrow_id,
            "approve": true
        }
      ]]]
      var reject =[json.to,
        [
          "escrow_release",
          {
            "from": json.from,
            "to": json.to,
            "agent": json.agent,
            "who": json.to,
            "receiver": json.from,
            "escrow_id": json.escrow_id,
            "sbd_amount": json.sbd_amount,
            "steem_amount": json.steem_amount
          }
        ]]
      if(parseFloat(json.steem_amount) > 0) {
        console.log(current + `:@${json.from} signed a ${json.steem_amount.amount} STEEM buy order`)
        state.dex.steem.buyOrders.push({txid, from: json.from, steem: json.steem_amount.amount, sbd: 0, amount: dextx.dlux , rate:parseInt((dextx.dlux)*10000/json.steem_amount.amount), block:current, escrow_id:json.escrow_id, agent:json.agent, fee:json.fee.amount, partial:false, auths, reject})
        if (state.contracts[json.from]){
          state.contracts[json.from][txid] = {txid, from: json.from, steem: json.steem_amount.amount, sbd: 0, amount: dextx.dlux , rate:parseInt((dextx.dlux)*10000/json.steem_amount.amount), block:current, escrow_id:json.escrow_id, agent:json.agent, fee:json.fee.amount, partial:false, auths, reject}
        } else {
          state.contracts[json.from] = {txid, from: json.from, steem: json.steem_amount.amount, sbd: 0, amount: dextx.dlux , rate:parseInt((dextx.dlux)*10000/json.steem_amount.amount), block:current, escrow_id:json.escrow_id, agent:json.agent, fee:json.fee.amount, partial:false, auths, reject}
        }
      } else if (parseFloat(json.sbd_amount) > 0){
        console.log(current + `:@${json.from} signed a ${json.sbd_amount.amount} SBD buy order`)
        state.dex.sbd.buyOrders.push({txid, from: json.from, steem: 0, sbd: json.sbd_amount.amount, amount: dextx.dlux , rate:parseInt((dextx.dlux)*10000/json.sbd_amount.amount), block:current, escrow_id:json.escrow_id, agent:json.agent, fee:json.fee.amount, partial:false, auths, reject})
        if (state.contracts[json.from]){
          state.contracts[json.from][txid] = {txid, from: json.from, steem: 0, sbd: json.sbd_amount.amount, amount: dextx.dlux , rate:parseInt((dextx.dlux)*10000/json.sbd_amount.amount), block:current, escrow_id:json.escrow_id, agent:json.agent, fee:json.fee.amount, partial:false, auths, reject}
        } else {
          state.contracts[json.from] = {txid:{txid, from: json.from, steem: 0, sbd: json.sbd_amount.amount, amount: dextx.dlux , rate:parseInt((dextx.dlux)*10000/json.sbd_amount.amount), block:current, escrow_id:json.escrow_id, agent:json.agent, fee:json.fee.amount, partial:false, auths, reject}
        }
      }
    }
  } else if (contract && isAgent){//{txid, from: from, buying: buyAmount, amount: json.dlux, [json.dlux]:buyAmount, rate:parseFloat((json.dlux)/(buyAmount)).toFixed(6), block:current, partial: json.partial || true
      if (contract.steem == json.steem_amount.amount  && contract.sbd == json.sbd_amount.amount){
        state.balances[json.from] += contract.amount
        if (contract.steem){
          for (var i = 0; i < state.dex.steem.sellOrders.length; i++) {
            if (state.dex.steem.sellOrders[i].txid == contract.txid) {
              state.dex.steem.tick = contract.rate
              state.dex.steem.sellOrders.splice(i,1)
              break;
            }
          }
        } else {
          for (var i = 0; i < state.dex.sbd.sellOrders.length; i++) {
            if (state.dex.sbd.sellOrders[i].txid == contract.txid) {
              state.dex.sbd.tick = contract.rate
              state.dex.sbd.sellOrders.splice(i,1)
              break;
            }
          }
        }
        delete state.contracts[json.to][dextx.contract]
        state.escrow.push([json.agent,
          [
            "escrow_approve",
            {
              "from": json.from,
              "to": json.to,
              "agent": json.agent,
              "who": json.agent,
              "escrow_id": json.escrow_id,
              "approve": true
          }
        ]])

      } else if (contract.partial) {
        if (contract.steem) {
          if (contract.steem > json.steem_amount.amount) {
            const dif = contract.steem - json.steem_amount.amount
            const ratio = parseInt((json.steem_amount.amount / contract.steem) * 10000)
            const dluxFilled = parseInt((json.steem_amount.amount / contract.steem) * contract.amount)
            state.balances[json.from] += dluxFilled
            const txid = 'DLUX' + hashThis(contract.from + json.escrow_id)
            state.dex.steem.tick = contract.rate
            state.dex.steem.sellOrders.push({txid, from: contract.from, steem: dif, sbd: 0, amount: contract.amount - dluxFilled, rate:contract.rate, block:current, partial: true})
            delete state.contracts[json.to][dextx.contract]
            state.contracts[json.to][txid] = state.dex.steem.sellOrders[state.dex.steem.sellOrders.length - 1]
            sortSellArray (state.dex.steem.sellOrders, 'rate')
            state.escrow.push([json.agent,
              [
                "escrow_approve",
                {
                  "from": json.from,
                  "to": json.to,
                  "agent": json.agent,
                  "who": json.agent,
                  "escrow_id": json.escrow_id,
                  "approve": true
              }
            ]])
          }
        } else if (contract.sbd) {
          if (contract.sbd > json.sbd_amount.amount) {
            const dif = contract.sbd - json.sbd_amount.amount
            const ratio = parseInt((json.sbd_amount.amount / contract.sbd) * 10000)
            const dluxFilled = parseInt((json.sbd_amount.amount / contract.sbd) * contract.amount)
            state.balances[json.from] += dluxFilled
            const txid = 'DLUX' + hashThis(contract.from + json.escrow_id)
            state.dex.sbd.tick = contract.rate
            state.dex.sbd.sellOrders.push({txid, from: contract.from, steem: 0, sbd: dif, amount: contract.amount - dluxFilled, rate:contract.rate, block:current, partial: true})
            delete state.contracts[json.to][dextx.contract]
            state.contracts[json.to][txid] = state.dex.sbd.sellOrders[state.dex.sbd.sellOrders.length - 1]
            sortSellArray (state.dex.sbd.sellOrders, 'rate')
            state.escrow.push([json.agent,
              [
                "escrow_approve",
                {
                  "from": json.from,
                  "to": json.to,
                  "agent": json.agent,
                  "who": json.agent,
                  "escrow_id": json.escrow_id,
                  "approve": true
              }
            ]])
          }
        }
      }
    } else if (isAgent){
      state.escrow.push([json.agent,
        [
          "escrow_approve",
          {
            "from": json.from,
            "to": json.to,
            "agent": json.agent,
            "who": json.agent,
            "escrow_id": json.escrow_id,
            "approve": false //reject non coded
        }
      ]])
    }
  });

  processor.onOperation('escrow_approve', function(json) {
    var found = 0
    for (var i = 0; i < state.escrow.length; i++) {
      if (state.escrow[i][0] == json.agent && state.escrow[i][1][1].escrow_id == json.escrow_id){
        state.escrow.splice(i,1)
        found = 1
        state.markets.node[json.agent].wins++
        state.pending.push([json.to,
          [
            "escrow_approve",
            {
              "from": json.from,
              "to": json.to,
              "agent": json.agent,
              "who": json.to,
              "escrow_id": json.escrow_id,
              "approve": true
          }
        ]],current)
        break;
      }
    }
    if (!found){
      for (var i = 0; i < state.pending.length; i++) {
        if (state.pending[i][0] == json.to && state.pending[i][1][1].escrow_id == json.escrow_id){
          state.pending.splice(i,1)
          state.markets.node[json.to].wins++
          break;
        }
      }
    }
  });

  processor.onOperation('escrow_release', function(json) {
    var found = 0
    for (var i = 0; i < state.escrow.length; i++) {
      if (state.escrow[i][0] == json.agent && state.escrow[i][1][1].escrow_id == json.escrow_id){
        state.escrow.splice(i,1)
        state.markets.node[json.agent].wins++
        found = 1
        break;
      }
    }
    if (!found){
      for (var i = 0; i < state.pending.length; i++) {
        if (state.pending[i][0] == json.to && state.pending[i][1][1].escrow_id == json.escrow_id){
          state.pending.splice(i,1)
          if (state.markets.node[json.to]){
            state.markets.node[json.to].wins++
          }
          break;
        }
      }
    }
  });

  processor.on('node_add', function(json, from) {
    if(json.domain && typeof json.domain === 'string') {
      var z = false
      if(json.escrow == true){z = true}
      var int = parseInt(json.bidRate) || 0
      if (int < 1) {int = 1000}
      if (int > 1000) {int = 1000}
      var t = parseInt(json.marketingRate) || 0
      if (t < 1) {int = 2000}
      if (t > 2000) {int = 2000}
      if (state.markets.node[from]){
        state.markets.node[from].domain = json.domain
        state.markets.node[from].bidRate = int
        state.markets.node[from].escrow = z
        state.markets.node[from].marketingRate = t
      } else {
        state.markets.node[from] = {
          domain: json.domain,
          self: from,
          bidRate: int,
          marketingRate: t,
          attempts: 0,
          yays: 0,
          wins: 0,
          contracts: 0,
          escrows: 0,
          lastGood: 0,
          report: {},
          escrow: z
        }
      }
      console.log(current + `:@${from} has bid the steem-state node ${json.domain} at ${json.bidRate}`)
    } else {
      console.log(current + `:Invalid steem-state node operation from ${from}`)
    }
  });

  processor.on('node_delete', function(json, from) {
    state.markets.node[from].escrow = false
    var found = NaN
    for (var i = 0;i < state.queue.length;i++){
      if (state.queue[i] == from){
        found = i
        break;
      }
    }
    if (found >= 0){
      state.queue.splice(found,1)
    }
    delete state.markets.node[from].domain
    delete state.markets.node[from].bidRate
    delete state.markets.node[from].marketingRate
    state.markets.node[from].escrow = false
    console.log(current + `:@${from} has signed off their dlux node`)
  });

  processor.on('set_delegation_reward', function(json, from) {
    if (from == 'dlux-io' && typeof json.rate === 'number' && json.rate < 2001 && json.rate >= 0) {
      state.stats.delegationRate = json.rate
    }
    console.log(current + `:@dlux-io has updated their delegation reward rate`)
  });

/* - Not happy with these
  processor.on('set_resteem_reward', function(json, from) {
    if (from == 'dlux-io' && typeof json.reward === 'number' && json.reward < 10001 && json.reward >= 0) {
      state.stats.resteemRewad = json.reward
    }
    console.log(current + `:@dlux-io has updated their delegation reward rate`)
  });

  processor.on('expire_post', function(json, from) {
    if (from == 'dlux-io' && typeof json.permlink === 'string') {
      state.expired.push(json.permlink)
    }
    console.log(current + `:@dlux-io has expired rewards on ${json.permlink}`)
  });
*/
  processor.on('report', function(json, from) {
    var cfrom, domain, found = NaN
    try {
      cfrom = state.markets.node[from].self
      domain = state.markets.node[from].domain
    }
    catch (err) {
      console.log(err)
    }
    if (from === cfrom && domain) {
      state.markets.node[from].report = json
      for (var i = 0;i < state.queue.length;i++){
        if (state.queue[i] == from){
          found = i
          break;
        }
      }
      if (found >= 0){
        state.queue.push(state.queue.splice(found,1)[0])
      } else {
        state.queue.push(from)
      }
      console.log(current + `:@${from}'s report has been processed`)
    } else {
      if (from === config.username && config.NODEDOMAIN) {
        console.log(current + `:This node posted a spurious report and in now attempting to register`)
        transactor.json(config.username, config.active, 'node_add', {
          domain: config.NODEDOMAIN,
          bidRate: config.bidRate,
          escrow
        }, function(err, result) {
          if(err) {
            console.error(err);
          }
        })
      } else if (from === config.username) {
        console.log(current + `:This node has posted a spurious report\nPlease configure your DOAMAIN and BIDRATE env variables`)
      } else {
      console.log(current + `:@${from} has posted a spurious report`)
    }
    }
  });
/*
  processor.onNoPrefix('follow', function(json, from) {  // Follow id includes both follow and resteem.
    if(json[0] === 'reblog') {
      if(json[1].author === resteemAccount && state.balances[from] !== undefined && state.balances[from] > 0) {
        var valid = 1
        for (var i = 0; i < state.expired.length;i++){
          if(json.permlink == state.expired[i]){valid=0;break;}
        }
        if(valid && state.balances.rm > state.stats.resteemReward){
          state.balances[from] += state.stats.resteemReward;
          state.balances.rm -= state.stats.resteemReward;
          console.log(current + `:Resteem reward of ${state.stats.resteemReward} given to ${from}`);
        }
      }
    }
  });
*/

  processor.onOperation('comment_options', function(json,from){//grab posts to reward
    try{
      var filter = json.extensions[0][1].beneficiaries
    } catch(e) {
      return;
    }
    for (var i = 0; i < filter.length; i++) {
      if (filter[i].account == 'dlux-io' && filter[i].weight > 999){
        state.posts.push({author:json.author, permlink: json.permlink})
        state.chrono.push({block:parseInt(current+300000), op:'post_reward', author: json.author, permlink: json.permlink})
        utils.chronoSort()
        console.log(current + `:Added ${json.author}/${json.permlink} to dlux rewardable content`)
      }
    }
  });

  processor.onOperation('comment_benefactor_reward', function(json){//grab posts to reward
    if(json.benefactor == 'dlux-io'){
      state.br.push({to:json.author,weights:{}})
      console.log(json)
    }
  });

  processor.onOperation('transfer', function(json){//ICO calculate
    /* for sending to NFTs - not gonna happen this way
    var contract = ''
    if(json.memo.substr(0,6) == 'DLUXQm') {
      var txid = json.memo.split(' ')[0]
      if(state.contracts[json.to][txid]){
        for (var i = 0;i < state.escrow.length;i++){
          if (state.escrow[i][0] == json.from && state.escrow[i][1][1].from == json.from && state.escrow[i][1][1].to == json.to){
             if (state.contracts[json.to][txid].steem){
               if (parseInt(parseFloat(json.amount)*1000) == state.contracts[json.to][txid].steem){
                 state.balances[json.from] += state.contracts[json.to][txid].escrow
                 delete state.contracts[json.to][txid]
                 state.escrow.splice(i,1)
               }
             } else if (state.contracts[json.to][txid].sbd) {
               if (parseInt(parseFloat(json.amount)*1000) == state.contracts[json.to][txid].sbd){
                 state.balances[json.from] += state.contracts[json.to][txid].escrow
                 delete state.contracts[json.to][txid]
                 state.escrow.splice(i,1)
               }
             }
          }
        }
      }
    }
    */
    if (json.to == 'robotolux' && json.amount.split(' ')[1] == 'STEEM' && current < 31288131) {
      const icoEntry = (current - 20000) % 30240
      const weight = parseInt((Math.sqrt(1 - Math.pow(icoEntry/(30240), 2))/2 + 0.5)*1000000)
      const amount = parseInt(parseFloat(json.amount) * 1000)
      state.ico.push({[json.from]:(weight * amount)})
      console.log(current + `:${json.from} bid in DLUX auction with ${json.amount} with a ${weight} multiple`)
    }
  });

  processor.onOperation('delegate_vesting_shares', function(json,from){//grab posts to reward
    const vests = parseInt(parseFloat(json.vesting_shares)*1000000)
    if (json.delegatee == 'dlux-io' && vests){
      for (var i = 0; i < state.delegations.length;i++){
        if (state.delegations[i].delegator == json.delegator){
          state.delegations.splice(i,1)
          break;
        }
      }
        state.delegations.push({delegator:json.delegator,vests})
        console.log(current + `:${json.delegator} has delegated ${vests} vests to @dlux-io`)
    } else if (json.delegatee == 'dlux-io' && !vests){
      for (var i = 0; i < state.delegations.length;i++){
        if (state.delegations[i].delegator == json.delegator){
          state.delegations.splice(i,1)
          break;
        }
      }
      console.log(current + `:${json.delegator} has removed delegation to @dlux-io`)
    }
  });

  processor.onOperation('account_update', function(json,from){//grab posts to reward
    Utils.upKey(json.account, json.memo_key)
  });

  processor.onBlock(function(num, block) {
    current = num

    //* // virtual ops
    chronoProcess = true
    while (chronoProcess){
        if (state.chrono[0] && state.chrono[0].block == num){
        switch (state.chrono[0].op) {
          case 'power_down':
            state.balances[state.chrono[0].by] += state.chrono[0].amount
            state.pow[state.chrono[0].by] -= state.chrono[0].amount
            state.pow.t -= state.chrono[0].amount
            console.log(current + `:${state.chrono[0].by} powered down ${state.chrono[0].amount} DLUX`)
            state.chrono.shift();
            break;
          case 'post_reward':
            var post = state.posts.shift(), w=0
            for (var node in post.voters){
              w += post.voters[node].weight
            }
            state.br.push({op:dao_content, post, totalWeight: w})
            console.log(current + `:${post.author}/${post.permlink} voting expired and queued for payout`)
            state.chrono.shift();
            break;
          default:

        }
      } else {chronoProcess = false}
    }
//*
    if(num % 100 === 0 && !processor.isStreaming()) {
      client.database.getDynamicGlobalProperties().then(function(result) {
        console.log('At block', num, 'with', result.head_block_number-num, `left until real-time. DAO @ ${(num - 20000) % 30240}`)
      });
    }
    if(num % 100 === 5 && processor.isStreaming()) {
      check(num);
    }
    if(num % 100 === 50 && processor.isStreaming()) {
      report(num);
      broadcast = 2
    }
    if((num - 20000) % 30240  === 0) { //time for daily magic
      dao(num);
    }
    if(num % 100 === 0 && processor.isStreaming()) {
      client.database.getAccounts([config.username]).then(function(result) {
        var account = result[0]

      });
    }
    if(num % 100 === 0) {
      tally(num);
      const blockState = Buffer.from(JSON.stringify([num, state]))
      plasma.hashBlock = num
      plasma.hashLastIBlock = hashThis(blockState)
      console.log(current + `:Signing: ${plasma.hashLastIBlock}`)
      if(processor.isStreaming()){ipfsSaveState(num, blockState);}
    }
    for(var p = 0;p < pa.length;p++){ //automate some tasks
      var r = eval(pa[p][1])
      if(r){
        NodeOps.push([[0,0],pa[p][2],[pa[p][2],pa[p][3]]])
      }
    }
    //*
    if(config.active){
      var found = -1
      if(broadcast){broadcast--}
      while (!broadcast){
        for (var i = 0; i < state.escrow.length; i++){
          if (state.escrow[i][0] == config.username){
            for (var j = 0; j < NodeOps.length;j++){
              if(NodeOps[j][2] == state.escrow[i][1][1]){found = j}
            }
            if (found == -1){
              NodeOps.push([[0,0], state.escrow[i][1][0], state.escrow[i][1][1]]);}
            break;
          }
        }
        for (var i = 0; i < state.exeq.length; i++){
          if (state.exeq[i][0] == config.username){
            var chunk = null, op = null;
            for (var j = 0; j < state.exes.length;j++){
              if (state.exes[j].id = state.exeq[i][1]){
                chunk = state.exes[j]
                break;
              }
            }
            if (chunk){
              op = runCustomNFT(chunk.n, chunk.e, chunk.b, chunk.d, chunk.a, chunk.c, chunk,k)
              NodeOps.push([[0,0],`nft_op`,chunk.id,op[0],op[2],op[1]])
            }
            break;
          }
        }
        var task = -1
        if(NodeOps.length > 0){
          for (var i = 0; i < NodeOps.length;i++){
            if (NodeOps[i][0][0] == 0 && task == -1){
              task = i
              NodeOps[i][0][0] = 45
            } else if (NodeOps[i][0][0] != 0){
              NodeOps[i][0][0]--
            }
          }
        }
        if (task >= 0){
          switch (NodeOps[task][1]) {
            case 'escrow_transfer':
              steemClient.broadcast.escrowTransfer(
                config.active,
                NodeOps[task][2].from,
                NodeOps[task][2].to,
                NodeOps[task][2].agent,
                NodeOps[task][2].escrow_id,
                NodeOps[task][2].sbd_amount,
                NodeOps[task][2].steem_amount,
                NodeOps[task][2].fee,
                NodeOps[task][2].ratification_deadline,
                NodeOps[task][2].escrow_expiration,
                NodeOps[task][2].json_meta,
                function(err, result) {
                  if(err){
                    console.error(err)
                    noi(task)
                    broadcast=1
                  } else {
                    console.log(`#Broadcast ${result} for ${NodeOps[task][2].json_meta.contract} @ block ${result.block_num}`)
                    NodeOps.splice(task,1)
                  }
              })
              break;
            case 'escrow_approve':
              console.log('trying to sign', NodeOps[task][2])
                steemClient.broadcast.escrowApprove(
                  wif,
                  NodeOps[task][2].from,
                  NodeOps[task][2].to,
                  NodeOps[task][2].agent,
                  NodeOps[task][2].who,
                  NodeOps[task][2].escrow_id,
                  NodeOps[task][2].approve,
                  function(err, result) {
                    if(err){
                      console.error(err)
                      broadcast=1
                      noi(task)
                    } else {
                      console.log(`#Broadcast ${result} for ${NodeOps[task][2].json_meta.contract} @ block ${result.block_num}`)
                      NodeOps.splice(task,1)
                    }
                })
                break;
            case 'send':
              transactor.json(config.username, config.active, 'send', {
                to: NodeOps[task][2].to,
                amount: NodeOps[task][2].amount,
                memo: NodeOps[task][2].memo,
                tier: NodeOps[task][2].tier
              }, function(err, result) {
                if(err) {
                  console.error(err);
                  noi(task)
                } else {
                  NodeOps.splice(task,1)
                }
              })
              break;
            case 'transfer':
              steemClient.broadcast.transfer(
                config.active,
                NodeOps[task][2].from,
                NodeOps[task][2].to,
                NodeOps[task][2].amount,
                NodeOps[task][2].memo,
                function(err, result) {
                  if(err) {
                    console.error(err);
                    noi(task)
                  } else {
                    NodeOps.splice(task,1)
                  }
              });
              break;
            case 'nft_op':
              transactor.json(config.username, config.active, 'nft_op', {
                nft: NodeOps[task][2],
                completed: NodeOps[task][3],
                runtime: NodeOps[task][4],
                proposal: NodeOps[task][5]
              }, function(err, result) {
                if(err) {
                  noi(task)
                  console.error(err);
                } else {
                  NodeOps.splice(task,1)
                  broadcast=1
                }
              })
              break;
            case 'claim_account':
              steemClient.broadcast.sendOperations(
                [
                  "claim_account",
                  {
                    "fee": {
                      "amount": "0",
                      "precision": 3,
                      "nai": "@@000000021"
                    },
                    "creator": config.username,
                    "extensions": []
                  }
                ], config.active,
                function(err, result) {
                  if(err) {
                    console.error(err);
                    noi(task)
                  } else {
                    NodeOps.splice(task,1)
                  }
              });
              break;
            case 'create_claimed_account':
              steemClient.broadcast.sendOperations(
                [
                  "create_claimed_account",
                  {
                    "creator": config.username,
                    "new_account_name": NodeOps[task][2].un,
                    "owner": {
                      "weight_threshold": 1,
                      "account_auths": [],
                      "key_auths": [[NodeOps[task][2].po, 1]],
                    },
                    "active": {
                      "weight_threshold": 1,
                      "account_auths": [],
                      "key_auths": [[NodeOps[task][2].pa, 1]],
                    },
                    "posting": {
                      "weight_threshold": 1,
                      "account_auths": [],
                      "key_auths": [[NodeOps[task][2].pp, 1]],
                    },
                    "memo_key": NodeOps[task][2].pm,
                    "json_metadata": "",
                    "extensions": []
                  }
                ], config.active,
                function(err, result) {
                  if(err) {
                    console.error(err);
                    noi(task)
                  } else {
                    NodeOps.splice(task,1)
                  }
              });
              break;
            default:

          }
        }
        if(broadcast == 0 ){broadcast=1}
      }
    }
    //*/
  });

  processor.onStreamingStart(function() {
    console.log("At real time.")
    if (state.markets.node[config.username]){if(!state.markets.node[config.username].domain && config.NODEDOMAIN){
      transactor.json(config.username, config.active, 'node_add', {
        domain: config.NODEDOMAIN,
        bidRate: config.bidRate,
        escrow
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    }}
  });

  processor.start();

  rl.on('line', function(data) {
    var split = data.split(' ');

    if(split[0] === 'balance') {
      var user = split[1];
      var balance = state.balances[user];
      if(balance === undefined) {
        balance = 0;
      }
      console.log(user, 'has', balance, 'tokens')
    } else if(split[0] === 'sign-off') {
      transactor.json(config.username, config.active, `node_delete`, {
      }, function(err, result) {
        if(err) {
          console.error(err);
        } else {
          broadcast = 2
          console.log(`Signing off...`)
        }
      })
    } else if(split[0] === 'send') {
      console.log('Sending tokens...')
      var to = split[1];

      var amount = parseInt(split[2]);
      broadcast = 2
      transactor.json(config.username, config.active, 'send', {
        to: to,
        amount: amount
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } //*
    else if (split[0] === 'dex-place-ask'){ //dex-place-ask 1000(dlux) 100(type) steem(/sbd | type)
      console.log('Creating DEX Contract...')
      var dlux = split[1], amount = split[2], type = 'steem', partial = false;
      if (split[3] == 'sbd'){type='sbd'}
      broadcast = 2
      transactor.json(config.username, config.active, `dex_${type}_sell`, {
        dlux,
        [type]: amount,
        partial
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if (split[0] === 'dex-buy-ask'){ //dex-buy-ask DLUXQmxxxx 1-10000(assumes 10000 /full if blank) you can go over and buy contracts of better rates and have the remainder returned to your account
      console.log('Creating Escrow tx...')
      var txid = split[1], addr = '', receiver = '', amount, type
      //amount is steem by millisteems 1000 = 1.000 steem
      for (var i = 0; i < state.dex.steem.sellOrders.length;i++){
        if (state.dex.steem.sellOrders[i].txid == txid){
          console.log(state.dex.steem.sellOrders[i].txid)
          addr = state.dex.steem.sellOrders[i]
          reciever = state.dex.steem.sellOrders[i].from
          type = ' STEEM'
        }
      }
      if(!addr){
        type = ' SBD'
        for (var i = 0; i < state.dex.sbd.sellOrders.length;i++){
          if (state.dex.sbd.sellOrders[i].txid == txid){
            console.log(state.dex.sbd.sellOrders[i].txid)
            addr = state.dex.sbd.sellOrders[i]
            reciever = state.dex.sbd.sellOrders[i].from
          }
        }
      }
      if (addr){
        var escrowTimer = {}
        var agents = []
        var i = 0
        for (var agent in state.queue){
          if(i == 3){break}
          agents.push(state.queue[agent])
          i++;
        }
        if (agents[0] != config.username && agents[0] != addr.from){agents.push(agents[0])}
        else if (agents[1] != config.username && agents[1] != addr.from){agents.push(agents[1])}
        else {agents.push(agents[2])}
        let now = new Date();
          escrowTimer.ratifyIn = now.setHours(now.getHours()+1);
          escrowTimer.ratifyUTC = new Date(escrowTimer.ratifyIn);
          escrowTimer.ratifyString = escrowTimer.ratifyUTC.toISOString().slice(0,-5);
          escrowTimer.expiryIn = now.setDate(now.getDate()+1);
          escrowTimer.expiryUTC = new Date(escrowTimer.expiryIn);
          escrowTimer.expiryString = escrowTimer.expiryUTC.toISOString().slice(0,-5);
        var eidi = txid
        var formatter
        if (type == ' STEEM'){
          steemAmount = (addr.steem/1000).toFixed(3) + type
          sbdAmount = '0.000 SBD'
        } else if (type == ' SBD'){
          sbdAmount = (addr.sbd/1000).toFixed(3) + type
          steemAmount = '0.000 STEEM'
        }
        formatter = formatter.toFixed(3)
        let eid = parseInt('0x' + (bs58.decode(eidi.substring(6,10))).toString('hex')) //escrow_id from DLUXQmxxxx<this
        let params = {
            from: config.username,
            to: addr.from,
            sbd_amount: sbdAmount,
            steem_amount: steemAmount,
            escrow_id: eid,
            agent: agents[3],
            fee: '0.000 STEEM',
            ratification_deadline: escrowTimer.ratifyString,
            escrow_expiration: escrowTimer.expiryString,
            json_meta: JSON.stringify({
              contract: txid
          })
        }
        console.log(params)
        NodeOps.push([[0,0],'escrow_transfer',['escrow_transfer', params]]);
      }
    } else if (split[0] === 'dex-place-bid'){ //dex-place-bid 1000(dlux) 100(type) steem(/sbd | type)
      console.log('Placing bid...')
      var dlux = split[1], amount = split[2], type = split[3], steemAmount, sbdAmount
      //amount is steem by millisteems 1000 = 1.000 steem
      if (type == 'sbd'){
        type = ' SBD'
      } else {
        type = ' STEEM'
      }
      if (type == ' STEEM'){
        steemAmount = (amount/1000).toFixed(3) + type
        sbdAmount = '0.000 SBD'
      } else if (type == ' SBD'){
        sbdAmount = (amount/1000).toFixed(3) + type
        steemAmount = '0.000 STEEM'
      }
      if (addr >= 0){
        var escrowTimer = {}
        var agents = []
        var i = 0
        for (var agent in state.queue){
          if(agents.length == 1){break}
          if(state.balances[state.queue[agent]] > dlux && state.queue[agent] != config.username){
            agents.push(state.queue[agent])
          }
        }
        for (var agent in state.queue){
          if(agents.length == 1){break}
          if(state.queue[agent] != agents[0] && state.queue[agent] != config.username){
            agents.push(state.queue[agent])
          }
        }
        let now = new Date();
          escrowTimer.ratifyIn = now.setHours(now.getHours()+72);
          escrowTimer.ratifyUTC = new Date(escrowTimer.ratifyIn);
          escrowTimer.ratifyString = escrowTimer.ratifyUTC.toISOString().slice(0,-5);
          escrowTimer.expiryIn = now.setDate(now.getDate()+5);
          escrowTimer.expiryUTC = new Date(escrowTimer.expiryIn);
          escrowTimer.expiryString = escrowTimer.expiryUTC.toISOString().slice(0,-5);
        var eidi = txid
        var formatter = amount/1000
        formatter = formatter.toFixed(3)
        let eid = parseInt('0x' + (bs58.decode(eidi.substring(6,10))).toString('hex')) //escrow_id from DLUXQmxxxx<this
        let params = {
            from: config.username,
            to: agents[0],
            sbd_amount: sbdAmount,
            steem_amount: steemAmount,
            escrow_id: eid,
            agent: agents[1],
            fee: '0.000 STEEM',
            ratification_deadline: escrowTimer.ratifyString,
            escrow_expiration: escrowTimer.expiryString,
            json_meta: JSON.stringify({dextx:{dlux}})
        }
        console.log(params)
        NodeOps.push([[0,0],'escrow_transfer',['escrow_transfer', params]]);
      }
    } else if (split[0] === 'dex-buy-bid'){ //dex-buy-bid DLUXQmxxxx
      var txid = split[1], type = '', addr = '', reciever = ''
      console.log(`Buying ${txid}`)
      for (var i = 0; i < state.dex.steem.buyOrders.length;i++){
        if (state.dex.steem.buyOrders[i].txid == txid){
          console.log(state.dex.steem.buyOrders[i].txid)
          addr = state.dex.steem.buyOrders[i]
          reciever = state.dex.steem.buyOrders[i].from
          type = ' STEEM'
        }
      }
      if(!addr){
        type = ' SBD'
        for (var i = 0; i < state.dex.sbd.buyOrders.length;i++){
          if (state.dex.sbd.buyOrders[i].txid == txid){
            console.log(state.dex.sbd.buyOrders[i].txid)
            addr = state.dex.sbd.buyOrders[i]
            reciever = state.dex.sbd.buyOrders[i].from
          }
        }
      }
      if (addr){
        broadcast = 2
        transactor.json(config.username, config.active, `dex_buy`, {
          contract: txid,
          to: addr.from,

        }, function(err, result) {
          if(err) {
            console.error(err);
          }
        })
      }
    } else if (split[0] === 'power-up'){
      console.log('Sending Power Up request...')
      var amount = parseInt(split[1])
      broadcast = 2
      transactor.json(config.username, config.active, `power_up`, {
        amount
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if (split[0] === 'power-down'){
      console.log('Scheduling Power Down...')
      var amount = split[1]
      broadcast = 2
      transactor.json(config.username, config.active, `power_down`, {
        amount
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'ban') {
      var name = split[1]
      transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_ban_user', {
        name
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'unban') {
      var name = split[1]
      transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_unban_user', {
        name
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'add-user') {
      let name = split[1], tier =split[2], expires = split[3]
      transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_add_user', {
        name, tier, expires
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'add-model') {
      let num = split[1], tier =split[2], dlux = split[3]
      transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_model_add', {
        num, tier, dlux
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'delete-model') {
      let num = split[1], tier =split[2], dlux = split[3]
      transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_model_delete', {
        num, tier, dlux
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'add-tier') {
      transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_tier_add', {
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'delete-tier') {
      let tier = split[1]
      transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_tier_delete', {
        tier
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'delete') {
      let content = split[1]
      transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_delete', {
        content
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'set-level') {
      let content = split[1], level = split[2]
      transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_set_level', {
        content, level
      }, function(err, result) {
        if(err) {
          console.error(err);
        }
      })
    } else if(split[0] === 'add') {
      let file = split[1]
      var json = fs.readFileSync(`./${file}`, 'utf8');
      var temp = JSON.parse(json);
      if (temp.self && temp.level && temp.title && temp.body && config.memoKey){
        var content = {self:temp.self, level: temp.level, title: temp.title, body: temp.body}
        if (content.level > 0){content.body = Utils.sealer(content.body, config.username)}
        transactor.json(config.username, config.active, 'custom_cms_' + config.username + '_add', {
          content
        }, function(err, result) {
          if(err) {
            console.error(err);
          }
        })
      }
    } //*/
    else if(split[0] === 'exit') {
      //announce offline
      exit();
    } else if(split[0] === 'state') {
      console.log(JSON.stringify(state, null, 2));
    } else {
      console.log("Invalid command.");
    }
  });
}

function check() { //do this maybe cycle 5, gives 15 secs to be streaming behind
  plasma.markets = {
    nodes: {},
    ipfss: {},
    relays: {}
  }
  for (var account in state.markets.node) {
    var self = state.markets.node[account].self
    plasma.markets.nodes[self] = {
      self: self,
      agreement: false,
    }
    if (state.markets.node[self].domain && state.markets.node[self].domain == config.NODEDOMAIN){
      var domain = state.markets.node[self].domain
      if (domain.slice(-1) == '/') {
        domain = domain.substring(0, domain.length - 1)
      }
      fetch(`${domain}/stats`)
        .then(function(response) {
          //console.log(response)
          return response.json();
        })
        .then(function(myJson) {
          //console.log(JSON.stringify(myJson));
          if (state.stats.tokenSupply === myJson.stats.tokenSupply){
            plasma.markets.nodes[myJson.node].agreement = true
          }
        });
      }
    }
}

function tally(num) {//tally state before save and next report
  var tally = {
    agreements: {
      runners: {},
      tally: {},
      votes: 0
    },
    election: {},
    winner: {},
    results: []
  }
  for (var node in state.runners){ //find out who is in the runners group
    tally.agreements.runners[node] = state.markets.node[node] //move the state data to tally to process
    tally.agreements.tally[node] = {
      self: node,
      votes: 0
    } //build a dataset to count
  }
  for (var node in tally.agreements.runners) {
    for (var subnode in tally.agreements.runners[node].report.agreements){
      if(tally.agreements.runners[node].report.agreements[subnode].agreement == true && tally.agreements.tally[subnode]){
        tally.agreements.tally[subnode].votes++
      }
    }
  }
  var l = 0
  var consensus
  for (var node in state.runners){
      l++
    if (tally.agreements.tally[node].votes / tally.agreements.votes >= 2 / 3) {
      consensus = tally.agreements.runners[node].report.hash
      if (!testing && consensus != plasma.hashLastIBlock && node != config.username  && processor.isStreaming()) {
        var errors = ['failed Consensus']
        if (VERSION != state.markets.node[node].report.version){console.log(current + `:Abandoning ${plasma.hashLastABlock} because ${errors[0]}`)}
        const blockState = Buffer.from(JSON.stringify([num, state]))
        plasma.hashBlock = num
        plasma.hashLastABlock = hashThis(blockState)
        console.log(current + `:Abandoning ${plasma.hashLastABlock} because ${errors[0]}`)
        var abd = asyncIpfsSaveState(num, blockState)
        abd.then(function(value) {
            transactor.json(config.username, config.active, 'error_CF', {
              errors: JSON.stringify([errors]),
              reject: value
            }, function(err, result) {
              if(err) {
                console.error(err, `\nMost likely your 'active' and 'account' variables are not set!`);
                startWith(consensus)
              } else {
                console.log(current + `: Published error report and attempting to restart from consensus ${consensus}`)
                startWith(consensus)
              }
          })
        });
      }
    } else if(state.markets.node[node].report.hash !== state.stats.hashLastIBlock && l > 1) {
      delete state.runners[node]
      console.log('uh-oh:' + node +' scored '+ tally.agreements.tally[node].votes + '/' + tally.agreements.votes)
    } else if(state.markets.node[node].report.hash !== state.stats.hashLastIBlock && l == 0) {
      console.log(`uh-oh: only @${node} is running blocks`)
    }
  }
  console.log(consensus)
  state.stats.lastBlock = state.stats.hashLastIBlock
  state.stats.hashLastIBlock = consensus
  for (var node in state.markets.node) {
      state.markets.node[node].attempts++
    if (state.markets.node[node].report.hash == state.stats.hashLastIBlock) {
      state.markets.node[node].yays++
      state.markets.node[node].lastGood = num
    }
  }
  if (l < 20) {
    for (var node in state.markets.node) {
      tally.election[node] = state.markets.node[node]
    }
    tally.results = []
    for (var node in state.runners){
      delete tally.election[node]
    }
    for (var node in tally.election){
      if (tally.election[node].report.hash !== state.stats.hashLastIBlock && state.stats.hashLastIBlock){
        delete tally.election[node]
      }
    }
    var t = 0
    for (var node in tally.election){
      t++
      tally.results.push([node, parseInt(((tally.election[node].yays / tally.election[node].attempts) * tally.election[node].attempts))])
    }
    if(t){
      tally.results.sort(function(a, b) {
        return a[1] - b[1];
      })
      tally.winner = tally.results.pop()
      state.runners[tally.winner[0]]= {
        self: state.markets.node[tally.winner[0]].self,
        domain: state.markets.node[tally.winner[0]].domain
      }
    }
  }
  for (var node in state.runners) {
    state.markets.node[node].wins++
  }
  //count agreements and make the runners list, update market rate for node services
  if (num > 30000000){
    var mint = parseInt(state.stats.tokenSupply/state.stats.interestRate)
    state.stats.tokenSupply += mint
    state.balances.ra += mint
  }
}

function dao(num) {
  var i=0,j=0,b=0,t=0
  t = parseInt(state.balances.ra)
  for (var node in state.runners){ //node rate
    b = parseInt(b) + parseInt(state.markets.node[node].marketingRate ) || 1
    j = parseInt(j) + parseInt(state.markets.node[node].bidRate) || 1
    i++
    console.log(b,j,i)
  }
  if (!i){
    b = state.markets.node['dlux-io'].marketingRate
    j = state.markets.node['dlux-io'].bidRate
    i++
  }
  state.stats.marketingRate = parseInt(b/i)
  state.stats.nodeRate = parseInt(j/i)
  console.log(current + `:DAO Accounting In Progress:\n${t} has been generated today\n${state.stats.marketingRate} is the marketing rate.\n${state.stats.nodeRate} is the node rate.`)
  state.balances.rn += parseInt(t* parseInt(state.stats.nodeRate)/10000)

  state.balances.ra = parseInt(state.balances.ra) - parseInt(t* parseInt(state.stats.nodeRate)/10000)
  state.balances.rm += parseInt(t*state.stats.marketingRate/10000)
  if(state.balances.rm > 1000000000){state.balances.rc += state.balances.rm - 1000000000;state.balances.rm = 1000000000}
  state.balances.ra = parseInt(state.balances.ra) - parseInt(t*state.stats.marketingRate/10000)
  i=0,j=0
  console.log(current + `:${state.balances.rm} is availible in the marketing account\n${state.balances.rn} DLUX set asside to distribute to nodes`)
  for (var node in state.markets.node){ //tally the wins
    j = j + parseInt(state.markets.node[node].wins)
  }
  b = state.balances.rn
  for (var node in state.markets.node){ //and pay them
    i = parseInt(state.markets.node[node].wins/j*b)
    if(state.balances[node]){state.balances[node] += i}
    else {state.balances[node] = i}
    state.balances.rn -= i
    console.log(current + `:@${node} awarded ${i} DLUX for ${state.markets.node[node].wins} credited transaction(s)`)
    state.markets.node[node].wins = 0
  }
  state.balances.rd += parseInt(t*state.stats.delegationRate/10000) // 10% to delegators
  state.balances.ra -= parseInt(t*state.stats.delegationRate/10000)
  b=state.balances.rd
  j=0
  console.log(current + `:${b} DLUX to distribute to @dlux-io delegators`)
  for (i = 0; i<state.delegations.length;i++){ //count vests
    j += state.delegations[i].vests
  }
  for (i = 0; i<state.delegations.length;i++){ //reward vests
    k = parseInt(b*state.delegations[i].vests/j)
    if(state.balances[state.delegations[i].delegator] === undefined){
      state.balances[state.delegations[i].delegator] = 0
    }
    state.balances[state.delegations[i].delegator] += k
    state.balances.rd -= k
    console.log(current + `:${k} DLUX awarded to ${state.delegations[i].delegator} for ${state.delegations[i].vests} VESTS`)
  }
  if(num < 31288131){
  var dailyICODistrobution = 312500000, y=0
  for(i=0;i<state.ico.length;i++){
    for (var node in state.ico[i]){
      y += state.ico[i][node]
    }
  }
  for(i=0;i<state.ico.length;i++){
    for (var node in state.ico[i]){
      if (!state.balances[node]){state.balances[node] = 0}
      state.balances[node] += parseInt(state.ico[i][node]/y*312500000)
      dailyICODistrobution -= parseInt(state.ico[i][node]/y*312500000)
      console.log(current + `:${node} awarded  ${parseInt(state.ico[i][node]/y*312500000)} DLUX for ICO auction`)
      if (i == state.ico.length - 1){
        state.balances[node] += dailyICODistrobution
        console.log(current + `:${node} given  ${dailyICODistrobution} remainder`)
      }
    }
  }
  state.ico = []
  state.pow.robotolux -= 312500000
  state.pow.t -= 312500000
  }
  state.balances.rc = state.balances.ra
  state.balances.ra = 0
  var q = 0, r = state.balances.rc
  for (var i = 0; i < state.br.length; i++){
    q += state.br[i].totalWeight
  }
  for (var i = 0; i < state.br.length; i++){
    for (var j = 0; j < state.br[i].post.voters.length;j++){
      state.balances[state.br[i].post.author] += parseInt(state.br[i].post.voters[j].weight * 2 /q * 3)
      state.balances.rc -= parseInt(state.br[i].post.voters[j].weight/q * 3)
      state.balances[state.br[i].post.voters[j].from] += parseInt(state.br[i].post.voters[j].weight/q * 3)
      state.balances.rc -= parseInt(state.br[i].post.voters[j].weight * 2/q * 3)
      console.log(current + `:${state.br[i].post.voters[j].from} awarded ${parseInt(state.br[i].post.voters[j].weight * 2 /q * 3)} for ${state.br[i].post.author}/${state.br[i].post.permlink}`)
    }
  }
  state.br = []
  state.rolling = {}
  for(i=0;i<state.pending.length;i++){//clean up markets after 30 days
    if(state.pending[i][3]<num-864000){state.pending.splice(i,1)}
  }
  for (var contract in state.contracts){
    if (state.contracts[contract].block < num - 864000){//30 day expire orders on DEX
      state.balances[state.contracts[contract].from] += state.contracts[contract].amount
      if (state.contracts[contract].reject){
        state.pending.push(state.contracts[contract].reject)
      }
      if (state.contracts[contract].steem){
        for(i=0;i < state.dex.steem.length;i++){
          if (state.dex.steem.sellOrders[i].txid == state.contracts[contract].txid){
            state.dex.steem.sellOrders.splice(i,1)
            break;
          }
        }
        for(i=0;i < state.dex.steem.length;i++){
          if (state.dex.steem.buyOrders[i].txid == state.contracts[contract].txid){
            state.dex.steem.buyOrders.splice(i,1)
            break;
          }
        }
      } else {
        {
          for(i=0;i < state.dex.sbd.length;i++){
            if (state.dex.sbd.sellOrders[i].txid == state.contracts[contract].txid){
              state.dex.sbd.sellOrders.splice(i,1)
              break;
            }
          }
          for(i=0;i < state.dex.sbd.length;i++){
            if (state.dex.sbd.buyOrders[i].txid == state.contracts[contract].txid){
              state.dex.sbd.buyOrders.splice(i,1)
              break;
            }
          }
        }
      }
      delete state.contracts[contract]
    }
  }
  //utils.cleaner(num)
  Utils.cleaner()
}

function report(num) {
  agreements = {
    [config.username] : {
      node: config.username,
      agreement: true
    }
  }
  if (plasma.markets) {
    for (var node in plasma.markets.nodes){
      if (plasma.markets.nodes[node].agreement){
        agreements[node] = {
          node,
          agreement: true
        }
      }
    }
    for (var node in state.runners){
      var self = state.runners[node].self;
      if (agreements[self]) {
        agreements[self].top = true
      } else if (plasma.markets.nodes[self].agreement) {
        agreements[self] = {
          node: self,
          agreement: true
        }
      } else {
        agreements[self] = {
          node: self,
          agreement: false
        }
      }
    }
    transactor.json(config.username, config.active, 'report', {
        agreements: agreements,
        hash: plasma.hashLastIBlock,
        block: plasma.hashBlock,
        version: VERSION,
        escrow: escrow,
        stash: plasma.privHash
      }, function(err, result) {
        if(err) {
          console.error(err, `\nMost likely your ACCOUNT and KEY variables are not set!`);
        } else {
          console.log(current + `:Sent State report and published ${plasma.hashLastIBlock} for ${plasma.hashBlock}`)
        }
    })//sum plasma and post a transaction
  }
}

function runCustomNFT(contract, executor, blocknum, bal, assets, code, key){//assets [fee,[name,dlux],[contract],[]]
  var timedOut = false, done = false, milliseconds = Date.now()
  var valid = true
  const original = contract
  const nftJSON = JSON.stringify(contract)
  const assetsJSON = JSON.stringify(assets)
  const timer =  computeTimer(assets[0] || 0)
  var info = `function (){var nft=${nftJSON},executor=${executor},blocknum=${blocknum},dlux=${bal},assets=${assets},code=${code},key=${key};`
  while (!timedOut || !done){
    setTimeout(function(){timedOut = true}, timer)
    var proposal = safeEval(`${info}${nft.rule}}`)
    milliseconds = Date.now() - milliseconds
    done = true
  }
  proposal = checkNFT(original, proposal, executor, bal, assets, key)
  return [done,proposal,milliseconds]
}

function expireNFT(n){
  var o, p = JSON.parse(JSON.stringify(n)), f = [0];
  if(n.stack.length == 0){
    p.behavior = -2
    p.expires++
    o = [true,p,1,[0,10]]
  } else {
    p.expires = p.stack[0][1]
    p.behavior = p.stack[0][2]
    p.rule = p.stack[0][3]
    o = [true,p,1,[0,10]]
  }
}

function processNFT(o,n){

}

/*
if(o[2] > 25){
  if (parseInt(o[2]/25) < n.pool){
    n.pool -= parseInt(o[2]/25)
    state.balances.rn += parseInt(o[2]/25)
  } else {
    o[1].behavior = -1
  }
}
if(o[3].length < 2 || !o[0] || o[1].behavior < 0){ //process to disolve
  if(o[1].behavior == -3){ //release to table 1
    for (var name in o[1].assetBenifactors[1]){
      for (var i = 0;i < o[1].assetBenifactors[1][name].length;i++){
        state.contracts[o[1].assetBenifactors[1][name][i]].bearers.push(name)
        if (state.contracts[o[1].assetBenifactors[1][name][i]].pow > 0){
          state.pow[state.contracts[o[1].assetBenifactors[1][name][i]].bearers[-2]] -= state.contracts[o[1].assetBenifactors[1][name][i]].pow
          state.pow[state.contracts[o[1].assetBenifactors[1][name][i]].bearers[-1]] += state.contracts[o[1].assetBenifactors[1][name][i]].pow
        }
      }
    }
    for (var i = 0; i < o[1].benifactors[1].length;i++){
      if (state.balances[o[1].benifactors[1][i].u] === undefined){state.balances[o[1].benifactors[1][i].u] = 0}
      state.balances[o[1].benifactors[1][i].u] += o[1].benifactors[1][i].d
    }
    if (state.balances[o[1].creator] === undefined){state.balances[o[1].creator] = 0}
    state.balances[o[1].creator] += o[1].pool
    if (state.pow[o[1].creator] === undefined){state.pow[o[1].creator] = 0}
    state.pow[creator] += o[1].pow
    delete state.contracts[o[1].self]
  } else if (o[1].behavior == -2){ //release to table 0
    for (var name in o[1].assetBenifactors[0]){
      for (var i = 0;i < o[1].assetBenifactors[0][name].length;i++){
        state.contracts[o[1].assetBenifactors[0][name][i]].bearers.push(name)
        if (state.contracts[o[1].assetBenifactors[0][name][i]].pow > 0){
          state.pow[state.contracts[o[1].assetBenifactors[0][name][i]].bearers[-2]] -= state.contracts[o[1].assetBenifactors[0][name][i]].pow
          state.pow[state.contracts[o[1].assetBenifactors[0][name][i]].bearers[-1]] += state.contracts[o[1].assetBenifactors[0][name][i]].pow
        }
      }
    }
    for (var i = 0; i < o[1].benifactors[0].length;i++){
      if (state.balances[o[1].benifactors[0][i].u] === undefined){state.balances[o[1].benifactors[0][i].u] = 0}
      state.balances[o[1].benifactors[0][i].u] += o[1].benifactors[0][i].d
    }
    if (state.balances[o[1].creator] === undefined){state.balances[o[1].creator] = 0}
    state.balances[o[1].creator] += o[1].pool
    if (state.pow[o[1].creator] === undefined){state.pow[o[1].creator] = 0}
    state.pow[creator] += o[1].pow
    delete state.contracts[o[1].self]
  } else { //release to depositers
    for ( var user in n.deposits) {
      if (state.balances[user] === undefined){state.balances[user] = 0}
      state.balances[user] += n.deposits[user]
    }
    if(n.pow){
      if (state.pow[n.creator] === undefined){state.pow[n.creator] = 0}
      state.pow[creator] += n.pow
    }
    if (state.balances[creator] === undefined){state.balances[creator] = 0}
    state.balances[creator] += n.pool
    delete state.contracts[o[1].self]
  }
} else { //process updates

}


*/

function runNFT(n, e, b, d, a, c, k){//nft, executor, blocknumber, dluxcoin, assets, code, key
  var o, p = JSON.parse(JSON.stringify(n)), f = [0] //output, proposal, finalActions
  switch (n.behavior) {
      case 0: //Custom assign 3 agents and que
        if (state.balances[e] >= d){
          if(!state.limbo[e]){state.limbo[e] = d}
          else {state.limbo[e] += d}
          state.balances[e] -= d
          assignAgents(n, e, b, d, a, c)
          o = [true,false,0,[0,1]]
          return o
        }
        break;
      case 1: //Auction
        if (d > n.bal && c == 0 && !a && state.balances[e] >= d){
          state.balances[e] -= d
          p.lastExecutor.push([e,b,c])
          p.memo = `${e} outbid ${n.lastExecutor[0]} with ${d} for ${n.self}`
          p.withdraw.push([n.lastExecutor[0], n.bal])
          p.assetBenifactors[0][0][0] = e
          p.benifactors[0][0][0].d = d
          p.bal = d
          p.incrementer++
          delete p.deposits[n.lastExecutor[0]]
          p.deposits[e] = d
          f.append(2)
          f.append(4)
          o = [true,p,0,f]
        } else {o = [false,false,0,[0]]}
        return o
        break;
      case 2: //simple equity
        if (d > 0 && c == 0 && !a && state.balances[e] >= d){
          state.balances[e] -= d
          p.lastExecutor = [e,b]
          p.benifactors[0][0].push({u: e, d: d})
          p.bal = n.bal + d
          p.incrementer++
          if (p.deposits[e]){p.deposits[e] += d}
          else {p.deposits[e] = d}
          f.append(2)
          o = [true,p,0,f]
        } else {o = [false,false,0,[0]]}
        return o
        break;
      case 3: //place simple bet code 0 and code 1 for two way
        if (d > 0 && c == 0 && !a && state.balances[e] >= d){
          state.balances[e] -= d
          p.lastExecutor = [e,b]
          p.benifactors[0][0].push({u: e, d: d})
          p.bal = n.bal + d
          p.incrementer++
          if (p.deposits[e]){p.deposits[e] += d}
          else {p.deposits[e] = d}
          f.append(2)
          o = [true,p,0,f]
        } else if (d > 0 && c == 1 && !a && state.balances[e] >= d){
          state.balances[e] -= d
          p.lastExecutor = [e,b]
          p.benifactors[0][1].push({u: e, d: d})
          p.bal = n.bal + d
          p.incrementer++
          if (p.deposits[e]){p.deposits[e] += d}
          else {p.deposits[e] = d}
          f.append(2)
          o = [true,p,0,f]
        } else {o = [false,false,0,[0]]}
        return o
        break;
      case 4: //bearer transfer, useful for physical goods and location based experience
        var auth
        if (k){auth = steemClient.memo.decode(n.pubKey, k)}
        if (auth == e){ // '#' + e? uses the private key to encypt the user name of the sender
          auth=true//set to expire if purchased...
        } else {auth=false}
        if (auth){
          //check price and balance
          //disperse
        } else {o = [false,false,0,[0]]}
        return o
        break;
      case 5:
        // pays out contract fee to code enterer... useful for ads
        break;
      case 6:// "quest" nft, executor, blocknumber, dluxcoin, assets, code, key
        var preReqs = 0, auth = '', l = 1 //l checks if already complete
          if(n.bearer[-1] == e){
            preReqs = n.rule[c][2].length
            if (n.rule[c][1][4] == false){l = 0}
            if (n.rule[c][0]){
              auth = steemClient.memo.decode(n.rule[c][0], k)
              if (auth == e){
                for (var j = 0; j < n.rule[c][2].length;j++){
                  if (n.rule[j][4] == true) {preReqs--} //checks complete , counts down list
                }
              }
            } else {
              auth = e
              for (var j = 0; j < n.rule[i][2].length;j++){
                if (n.rule[j][4] == true) {preReqs--} //checks complete , counts down list
              }
            }
          }
        if (!preReqs  && auth == e && !l){
          p.rule[c][1][4] = true
          if (n.rule[c][1][3] && p.rule[c][1][3] > p.bal){
            p.bal = p.bal - p.rule[c][1][3]
            p.withdraw.push([e,p.rule[c][1][3]])
            f.append(4)
          }
          p.incrementer++
          p.lastExecutor.push([e,b,c])
        } else {o = [false,false,0,[0]]}
        o = [true,p,0,f]
        return o
        break;
      default:
        o = [false,false,0,[0]]
  }
  return o
}

function assignAgents(n, e, b, d, a, c){
  state.exes.push({id:n.self,n,e,b,d,a,c,op:[]})
  state.exeq.push([utils.agentCycler(), n.self,b,e])
  state.exeq.push([utils.agentCycler(), n.self,b,e])
  state.exeq.push([utils.agentCycler(), n.self,b,e])
}

function checkNFT(nft, proposal, executor, bal, assets){
  var actions = [0],j = 0, k = 0, l = 0, m = 0
  if(nft.incrementer + 1 + assets[1].length + assets[2].length !== proposal.incrementer){return 0}//required to count inputs easy to reject incompatible inputs
  for(var i = 0;i < assets[1].length;i++){j += assets[1].bal}//dlux in via cascade
  for(var i = 0;i < proposal.withdraw.length;i++){k += proposal.withdraw[i][1]}
  for(var i = 0;i < proposal.benifactors[0].length;i++){l += proposal.withdraw[0][i].bal}//release table
  for(var i = 0;i < proposal.benifactors[1].length;i++){m += proposal.withdraw[1][i].bal}//release table
  if(nft.bal + bal + j - k === proposal.bal){actions.append(4)}
  if(nft.bal + bal + j === proposal.bal){actions.append(3)}
  if(nft.bal + bal === proposal.bal){actions.append(2)}
  if(nft.bal === proposal.bal){actions.append(1)}
  if(l||m){
    if((l&&!m)||(!l&&m)){
      if(proposal.bal === 0 && nft.bal + bal + j === l && j){actions.append(3);actions.append(6)}
      if(proposal.bal === 0 && nft.bal + bal + j === m && j){actions.append(3);actions.append(7)}
      if(proposal.bal === 0 && nft.bal + bal === l && bal){actions.append(2);actions.append(6)}
      if(proposal.bal === 0 && nft.bal + bal === m && bal){actions.append(2);actions.append(7)}
      if(proposal.bal === 0 && nft.bal === l){actions.append(6)}
      if(proposal.bal === 0 && nft.bal === m){actions.append(7)}
      if(actions[actions.length-1] !== 6){
        if(actions[actions.length-1] !== 7){return 0}}}
    else{return 0}} //contract release to table 1 or 2... contract must be empty to reelease
  if(nft.pow !== proposal.pow){
    if(proposal.withdrawPow[creator] === (nft.pow - proposal.pow)){actions.append(5)}
    else {return  0}}
  if(nft.bearers !== proposal.bearers){actions.append(8)};
  if(nft.owns !== proposal.owns){actions.append(9)}
  if(nft.memo !== proposal.memo){if (proposal.memo.length > 255){proposal.memo = proposal.memo.substr(0,255)}}
  if(nft.withdrawAsset !== 0){}
  if(nft.benifactors !== proposal.benifactors){}
  if(nft.assetBenifactors !== proposal.assetBenifactors){}

  if(nft.expires !== proposal.expires){actions.append(10)}//wills and dead mans switchs
  if(nft.withdraw !== 0){actions.append(4)}//trusts and payments for commitment


  return //needs work
}

function computeTimer(fee){
  if (fee == 0){
    return false
  } else if (fee < 30000) {
    return parseInt(fee/(parseInt(state.stats.nodeRate/100)+1)) + 1
  } else {
    return 3000
  }
}

function exit() {
  console.log('Exiting...');
  processor.stop(function() {
    saveState(function() {
      process.exit();
      console.log('Process exited.');
    });
  });
}

function ipfsSaveState(blocknum, hashable) {
  ipfs.add(hashable, (err, IpFsHash) => {
    if (!err){
      plasma.hashLastIBlock = IpFsHash[0].hash
      console.log(current + `:Saved:  ${IpFsHash[0].hash}`)
    } else {
      console.log({cycle}, 'IPFS Error', err)
      cycleipfs(cycle++)
      if (cycle >= 25){
        cycle = 0;
        return;
      }
    }
  })
};

function asyncIpfsSaveState(blocknum, hashable) {
  return new Promise((resolve, reject) => {
    ipfs.add(hashable, (err, IpFsHash) => {
      if (!err){
        resolve(IpFsHash[0].hash)
        console.log(current + `:Saved:  ${IpFsHash[0].hash}`)
      } else {
        resolve('Failed to save state.')
        console.log({cycle}, 'IPFS Error', err)
        cycleipfs(cycle++)
        if (cycle >= 25){
          cycle = 0;
          return;
        }
      }
    })
  })
};

function sortBuyArray (array, key) {
  return array.sort(function(a,b) { return a[key] - b[key];});
}
function sortSellArray (array, key) {
  return array.sort(function(a,b) { return a[key] + b[key];});
}
function noi(t){ //node ops incrementer and cleaner... 3 retries and out
  NodeOps[t][0][0] = 5
  NodeOps[t][0][1]++
  if (NodeOps[t][0][1]>3){
    NodeOps.splice(t,1)
  }
}


//encryption check will not work for your username!!!
var Private = {
  pubKeys: {caramaeplays:'STM75b5FoQxzJLFuTJCkp9s4GmS41qBgZte7iuV6VZP133FT4MNU6',
disregardfiat:'STM6phwq25EG8S2PifKgs3riH2d1gF868v9TTKF5cXxWscvrBaegz'},
  tier:[['disregardfiat','caramaeplays']],
  models:[],
  banned: [],
  content:{
    test:{
      self: 'test',
      level:0,
      title:'Encryption Check 1',
      body:'Your memo key is configured!'
    },
    test_enc:{
      self: 'test_enc',
      level: 1,
      title:'Encryption Check 2',
      body: '#FA4KAVwEYmumHgs1wAyfdXyUPc4YZ2rbRZrDMcnur5ebdTJDLwcGWhc5ZckJ5xSs4vKVtLbtvLAvjmAzJ5q5ayRwQgXp6hbr5b7yaAWgTVRLR3DcTaFzDCMUwhVwTqLxN'
    },
  }
}
var Utils = {
  save: function(){
    const priv = Buffer.from(JSON.stringify([num, state]))
    ipfs.add(priv, (err, IpFsHash) => {
      if (!err){
        plasma.privHash = IpFsHash[0].hash
        console.log(current + `:Saved: Private state ${IpFsHash[0].hash}`)
      } else {
        console.log({cycle}, 'IPFS Error', err)
      }
    })
  }, addModel: function(num, tier, dlux){
    Private.models.push([num,tier,dlux])
    Utils.save()
  }, deleteModel: function(num, tier, dlux){
    for (var i = 0; i < Private.models.length;i++){
      if (Private.models[i] == [num,tier,dlux]){Private.models.splice(i,1);break;}
    }
    Utils.save()
  }, addContent: function(content){
    Private.content[content.self] = content
    Utils.save()
  }, deleteContent: function(content){
    delete Private.content[content]
    Utils.save()
  }, setContentLevel: function(content, level){
    try{
      if (level == 0 && Private.content[content].level > 0){
        Private.content[content].body = steemClient.memo.decode(config.memoKey, Private.content[content].body)
      } else if (level > 0 && Private.content[content].level == 0) {
        Private.content[content].body = steemClient.memo.encode(config.memoKey, Private.pubKeys[config.username], Private.content[content].body)
      }
      Private.content[content].level = level
      Utils.save()
    } catch (e){
      console.log(e)
    }
  }, ban: function(name){
    if (Private.banned.indexOf(name) == -1){
      Private.banned.push(name)
      var i = Utils.accessLevel(name)
      if(i >= 0){
        Private.tier[i].splice(Private.tier[i].indexOf(name),1)
      }
      Utils.save()
    }
  }, unban: function(name){
    var i = Private.banned.indexOf(name)
    if (i>=0){
      Private.banned.splice(i,1)
    }
    Utils.save()
  }, getContent: function(content, name){
    return new Promise((resolve, reject) => {
    var error = ''
    var json = ''
    var result = {}
    var accessLevel = Utils.accessLevel(name)
    if (accessLevel >= 0){
      try {
        json = Private.content[content]
      } catch(e){error += ' 404: Content not found'}
      if (json && json.level <= accessLevel){
        result.level = json.level
        result.title = json.title
        result.body = Utils.unsealer(json.body)
      } else {error += ` @${name} doesn't have access?`}
    } else {error += ` @${name} doesn't have access`}
    if(error){
      result.title = error
    }
    resolve(result)
  })
  }, getAllContent: function(name){
    return new Promise((resolve, reject) => {
      if(!Private.pubKeys[name]){
        Utils.sealer(null, name).then(meh => {
          let al = Utils.accessLevel(name)
          var value = Private
          for (var item in value.content){
            if (value.content[item].level > al){
              delete value.content[item]
            } else if (value.content[item].level > 0){
              value.content[item].body = steemClient.memo.decode(config.memoKey, value.content[item].body)
            }
            value.content[item].body = steemClient.memo.encode(config.memoKey, Private.pubKeys[name], value.content[item].body)
          }
          resolve(value.content)
        });
      } else {
        let al = Utils.accessLevel(name)
        var value = {}
        for (var item in Private.content){
          if (Private.content[item].level > al){
          } else if (Private.content[item].level > 0){
            value[item] = {
              body: steemClient.memo.decode(config.memoKey, (Private.content[item].body)),
              title: Private.content[item].title,
              level: Private.content[item].level,
              self: Private.content[item].self
            }
          } else {
            value[item] = {
              body: Private.content[item].body,
              title: Private.content[item].title,
              level: Private.content[item].level,
              self: Private.content[item].self
            }
          }
          value[item].body = steemClient.memo.encode(config.memoKey, Private.pubKeys[name], value[item].body)
        }
      resolve(value)
      }
    })
  }, cleaner: function(num){
    for (var i = 0; i < Private.tier.length;i++){
      for (var j = 0; j < Private.tier[i].length;j++){
        if (Private.tier[i][j][0] <= num){Private.tier[i].splice(j,1)}
      }
    }
  }, assignLevel: function(name, level, until){
    var error = '', current = ''
    if (level < Private.tier.length){
      try {
        current = Utils.accessLevel(name)
      } catch(e){if(e){error = 'Not Found'}}
      if(current){
        for(var i = 0; i < Private.tier[current].length;i++){
          if(Private.tier[current][i][0] == name){Private.tier[current][i].splice(i,1);break;}
        }
      }
      if(Private.banned.indexOf(name) == -1){
        Private.tier[level].push([name,until])
        Utils.save()
      }
    }
  },
  addAccessLevel: function(){Private.tier.push([]);Utils.save();},
  removeAccesLevel: function(tier){
    tier -= 1
    if (Private.tier[tier].length > 0){
      for (var i = 0; i < Private.tier[tier].length;i++){
        if(tier == 0){
          Private.tier[tier + 1].push(Private.tier[tier][i])
        } else {
          Private.tier[tier - 1].push(Private.tier[tier][i])
        }
      }
    }
    if(tier >= 0){
      Private.tier.splice(tier,1)
      Utils.save();
    }
  }, accessLevel: function(name){
    var level = 0
    for (var i = 0; i < Private.tier.length;i++){
      for (var j = 0; j < Private.tier[i].length;j++){
        if (Private.tier[i][j] == name){level = i + 1;break;}
      }
    }
    return level
  }, upKey: function(name, key){
    if (Private.pubKeys[name]){
      Private.pubKeys[name] = key
    }
  }, sealer: function(md, to){
    return new Promise((resolve, reject) => {
      if(!Private.pubKeys[to]){
        steemClient.api.getAccounts([to], (err, result) => {
          if (err) {
            console.log(err)
            reject()
          }
          if (result.length === 0) {
            reject()
            console.log('No Such User')
          }
          Private.pubKeys[to] = result[0].memo_key
          var encrypted = steemClient.memo.encode(config.memoKey, Private.pubKeys[to], `#` + md);
          resolve(encrypted)
        });
      } else {
        var encrypted = steemClient.memo.encode(config.memoKey, Private.pubKeys[to], `#` + md);
        resolve(encrypted)
      }
    });
  }, unsealer: function(enc){
    var decoded = steemClient.memo.decode(config.memoKey, enc)
    return decoded
  }
}
