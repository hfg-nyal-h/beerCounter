require("dotenv").config();
import { RTMClient } from '@Slack/rtm-api'
import { SLACK_OAUTH_TOKEN, BOT_SPAM_CHANNEL } from './constants'
import { WebClient } from '@Slack/web-api';
const packageJson = require('../package.json')
const rtm = new RTMClient(SLACK_OAUTH_TOKEN);
const web = new WebClient(SLACK_OAUTH_TOKEN);
let beerCountCollection;
let maxCountableBeers = 10;
const { MongoClient } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.s83q4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
client.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        beerCountCollection = client
            .db("beerLab")
            .collection("counter");
        console.log("connected to mongodb beerlab");

    }
});
let beersAvailable;
rtm.start()
    .catch(console.error);
console.log("Start start")
rtm.on('ready', async() => {
    console.log('bot started')
    sendMessage(BOT_SPAM_CHANNEL, `Bot version ${packageJson.version} is online.`)
})
rtm.on('slack_event', async(eventType, event) => {
    if (event && event.type === 'message') {
        if (event.text === 'beer??' || event.text === 'beer?' || event.text === 'beer' || event.text === 'bier' || event.text === 'bier?') {

            beerCountCollection
                .find()
                .sort({ '_id': -1 })
                .limit(1)
                .toArray(function(err, results) {
                    if (err) throw err;
                    console.log(results)
                    beersAvailable = results[0].beerCount;
                    beerQuestion(event.channel, event.user)
                })
        }
    }
})

function beerQuestion(channelId, userId) {
    if (beersAvailable <= maxCountableBeers - 1) {
        sendMessage(channelId, `<@${userId}> the IoT-Lab has ${beersAvailable} beers left.`)
    } else if (beersAvailable <= maxCountableBeers) {
        sendMessage(channelId, `<@${userId}> the IoT-Lab has ${beersAvailable}+ beers left.`)
    }
}
async function sendMessage(channel, message) {
    await web.chat.postMessage({
        channel: channel,
        text: message,
    })
}