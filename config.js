const ENV = process.env;

const username = ENV.account || '';
const active = ENV.active || '';
const memoKey = ENV.memo || '';
const NODEDOMAIN = ENV.domain || ''

const bidRate = ENV.BIDRATE || 0
const port = ENV.PORT || 3000;
const clientURL = ENV.APIURL || 'https://api.steemit.com'


const engineCrank = ENV.startingHash || 'QmXt7swHJGphLL5hJt98i2pz7FgPGYcJKrbVgraoUfp5cC'
const acm = ENV.account_creator || true //account creation market

let config = {
    username,active,memoKey, NODEDOMAIN, bidRate, engineCrank, port, clientURL, acm
};

module.exports = config;
