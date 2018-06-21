'use strict';

const request = require('request-promise');
const aws = require('aws-sdk')
const {google} = require('googleapis');

const parseMessage = (event) => {
  var body = JSON.parse(event.body)

  return Object.assign(event, {body: body})
}

const getGoogleToken = (event) => {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  oAuth2Client.setCredentials(JSON.parse(process.env.GOOGLE_TOKEN));
  
  return Object.assign(event, {'auth': oAuth2Client});
}

const buildResponse = (event) => {
  var text = event.body.message.text

  // capture 2 groups: (amount) (description)
  var regex = /(\d+(?:\.\d+)?)\s((?:\w+)(?:\s\w+)*)/

  var result = text.match(regex)

  var response = ''

  var expense = ''

  if (result) {
    expense = {
      amount: result[1],
      categories: result[2]
    }
  }

  if (text == '/start') {
    response = 'Welcome'
  } else if (text == '/help') {
    response = 'Send messages in format> amount categories'
  } else if (expense) {
    response = `Got it ${expense.amount} added (${expense.categories})`
  } else {
    response = `I didn't understand. Try /help.`
  }

  return Object.assign(event, {response: response, expense: expense})
};

const storeExpense = (event) => {

  if (!event.expense) {
    return event
  }

  const timestamp = new Date().getTime()

  const sheets = google.sheets({version: 'v4', auth: event.auth})

  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: getSheetName(event.body.message.date)+'!A:C',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        majorDimension: 'ROWS',
        values: [
          [formatDate(event.body.message.date), event.expense.amount, event.expense.categories]
        ]
      }
    }, (err, {data}) => {
      if (err) reject(err)
      resolve(Object.assign(event, {data: data}))
    });
  })
}

const addNewSheet = (event) => {
  const sheets = google.sheets({version: 'v4', auth: event.auth})

  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: getSheetName(event.body.message.date)+'!A:C'
    }, (err, {data}) => {
      if (err) {
        sheets.spreadsheets.batchUpdate({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          resource: {
            requests: [
              { 
                addSheet: {
                  properties: {
                    title: getMonthName(event.body.message.date)
                  }
                }
              }
            ]
          }
        }, (err2, {data2}) => {
          if (err2) {
            reject(err2)
          } else {
            resolve(event)
          }
        })
      } else {
        resolve(event)
      }
    })
  })
}

const sendMessage = (event) => {
  var chatId = event.body.message.chat.id

  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`

  var body = {
    chat_id: chatId,
    text: event.response
  }

  var options = {
    method: 'POST',
    uri: url,
    body: body,
    json: true
  }

  return request(options)
};

const successResponse = callback => callback(null, {
  statusCode: 200
})

const errorResponse = (error, callback) => {
  return callback(null, {
    statusCode: 500
  })
}

const getSheetId = (timestamp) => {
  const date = new Date(timestamp*1000)

  return date.getMonth()+date.getFullYear()
}

const getSheetName = (timestamp) => {
  return "'" + getMonthName(timestamp) + "'"
}

const getMonthName = (timestamp) => {
  const date = new Date(timestamp*1000)

  const locale = "en-us"

  return date.toLocaleString(locale, { month: "long" })
        + ' ' + date.toLocaleString(locale, {year: "2-digit"})
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp*1000)

  return date.getDate()+'/'+date.getMonth()+'/'+date.getFullYear()
}

module.exports.hello = (event, context, callback) =>
  Promise.resolve(event)
    .then(parseMessage)
    .then(buildResponse)
    .then(getGoogleToken)
    .then(addNewSheet)
    .then(storeExpense)
    .then(sendMessage)
    .then(() => successResponse(callback))
    .catch(error => errorResponse(error, callback))
