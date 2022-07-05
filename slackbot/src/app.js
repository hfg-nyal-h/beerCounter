import { RTMClient }  from '@slack/rtm-api'
import { SLACK_OAUTH_TOKEN, BOT_SPAM_CHANNEL } from './constants'
import  { WebClient } from '@slack/web-api';
const packageJson = require('../package.json')

 const rtm = new RTMClient(SLACK_OAUTH_TOKEN);
const web = new WebClient(SLACK_OAUTH_TOKEN); 

let beersAvailable = 13;
//npm start

//const rtm = new RTMClient("xoxb-3710548046403-3696650065943-YN3pAuajf06obd1ibrBDxlPO");
//const web = new WebClient("xoxb-3710548046403-3696650065943-YN3pAuajf06obd1ibrBDxlPO")

rtm.start()
  .catch(console.error);
  console.log("Start start")

rtm.on('ready', async () => {
    console.log('bot started')
    sendMessage(BOT_SPAM_CHANNEL, `Bot version ${packageJson.version} is online.`)
})

rtm.on('slack_event', async (eventType, event) => {
    if (event && event.type === 'message'){
        if (event.text === '!hello') {
            hello(event.channel, event.user)
        }
          if (event.text === 'beer??') {
            beerQuestion(event.channel, event.user)
        }
    }
})


function hello (channelId, userId) {
    sendMessage(channelId, `Heya! <@${userId}>`)
}

function beerQuestion (channelId, userId) {
    sendMessage(channelId, "We have " + beersAvailable + " beers available")
}

async function sendMessage(channel, message) {
    await web.chat.postMessage({
        channel: channel,
        text: message,
    })
}