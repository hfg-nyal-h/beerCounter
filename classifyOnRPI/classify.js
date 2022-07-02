const { ImageClassifier, LinuxImpulseRunner, Ffmpeg, ICamera, Imagesnap } = require('edge-impulse-linux');
require('dotenv').config();

let lastBeerCount = 0;
let connected = false;
let beerCollection;
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.s83q4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
    beerCollection = client.db("beerLab").collection("counter");
    console.log("connected")
    // perform actions on the collection object
    connected = true;

});



// tslint:disable-next-line: no-floating-promises
(async () => {
    try {
        if (!process.argv[2]) {
            console.log('Missing one argument (model file)');
            process.exit(1);
        }

        let runner = new LinuxImpulseRunner(process.argv[2]);
        let model = await runner.init();

        console.log('Starting the image classifier for',
            model.project.owner + ' / ' + model.project.name, '(v' + model.project.deploy_version + ')');
        console.log('Parameters',
            'image size', model.modelParameters.image_input_width + 'x' + model.modelParameters.image_input_height + ' px (' +
            model.modelParameters.image_channel_count + ' channels)',
            'classes', model.modelParameters.labels);

        // select a camera... you can implement this interface for other targets :-)
        let camera;

        if (process.platform === 'darwin') {
            camera = new Imagesnap();
        }
        else if (process.platform === 'linux') {
            camera = new Ffmpeg(false /* verbose */);
        }
        else {
            throw new Error('Unsupported platform "' + process.platform + '"');
        }
        await camera.init();

        const devices = await camera.listDevices();
        if (devices.length === 0) {
            throw new Error('Cannot find any webcams');
        }
        if (devices.length > 1 && !process.argv[3]) {
            throw new Error('Multiple cameras found (' + devices.map(n => '"' + n + '"').join(', ') + '), add ' +
                'the camera to use to this script (node classify-camera.js model.eim cameraname)');
        }

        let device = process.argv[3] || devices[0];

        console.log('Using camera', device, 'starting...');

        await camera.start({
            device: device,
            intervalMs: 200,
        });

        camera.on('error', error => {
            console.log('camera error', error);
        });

        console.log('Connected to camera');

        let imageClassifier = new ImageClassifier(runner, camera);

        await imageClassifier.start();

        imageClassifier.on('result', async (ev, timeMs, imgAsJpg) => {

            if (ev.result.classification) {
                // print the raw predicted values for this frame
                // (turn into string here so the content does not jump around)
                let c = ev.result.classification;
                for (let k of Object.keys(c)) {
                    c[k] = c[k].toFixed(4);
                }
                console.log('classification', timeMs + 'ms.', c);
            }
            else if (ev.result.bounding_boxes) {
                if (connected) {
                    let beerCount = 0;
                    for (let i = 0; i < ev.result.bounding_boxes.length; i++) {
                        console.log(ev.result.bounding_boxes[i].label)
                        if (ev.result.bounding_boxes[i].label == "full") {
                            beerCount++;
                        }
                    }

                    if (beerCount != lastBeerCount) {
                        let entry = { "beerCount": beerCount };
                        beerCollection.insertOne(entry);

                        console.log("new entry created");

                        lastBeerCount = beerCount;
                    }
                    console.log(lastBeerCount);
                    await sleep(8000)
                }
            }
        });
    }
    catch (ex) {
        console.error(ex);
        process.exit(1);
    }
})();

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
