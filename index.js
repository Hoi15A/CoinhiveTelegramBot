const TelegramBot = require('node-telegram-bot-api')
const request = require('request')
const async = require('async')

const config = require('./config.json')
const bot = new TelegramBot(config.telegramToken, {polling: true})

console.log('\nConfig Data: ', config)

bot.onText(/\/getcoinhivexmr/, function (msg) {
  if (!isWhitelisted(msg.chat.id)) {
    bot.sendMessage(msg.chat.id, 'You are not whitelisted.')
    return
  }
  getCoinHiveXMR(function (xmr) {
    convertXMRtoCHF(xmr, function (chf) {
      var message = xmr.toFixed(6) + ' XMR worth ' + chf.toFixed(2) + ' CHF'
      bot.sendMessage(msg.chat.id, message)
    })
  })
})

var getCoinHiveXMR = function (cb) {
  var totalXMR = 0
  async.eachSeries(config.coinhiveTokens, function (token, callback) {
    const options = {
      url: 'https://api.coinhive.com/stats/site',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
      },
      qs: {
        secret: token
      }
    }
    request(options, function (err, res, body) {
      if (err) {
        console.error(err)
        return
      }
      var data = JSON.parse(body)
      totalXMR += data.xmrPending
      callback()
    })
  }, function (err) {
    if (err) {
      console.log('A request failed')
      console.log(err)
    } else {
      cb(totalXMR)
    }
  })
}

var convertXMRtoCHF = function (xmr, cb) {
  const options = {
    url: 'https://api.coinmarketcap.com/v1/ticker/monero/',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8'
    },
    qs: {
      convert: config.targetCurrency
    }
  }
  request(options, function (err, res, body) {
    if (err) {
      console.error(err)
      return
    }
    var data = JSON.parse(body)
    cb(data[0].price_chf * xmr)
  })
}

var isWhitelisted = function (id) {
  for (var i = 0; i < config.chatWhitelist.length; i++) {
    if (id == config.chatWhitelist[i]) {
      return true
    }
  }
  return false
}
