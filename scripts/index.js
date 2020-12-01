var vid2Img = require('./vid2Image.js');
var gpx2feature = require('./gpxToFeatures.js');
const path = require('path');

const videoFolder = path.join(__dirname, '../videos')
const argv = require('minimist')(process.argv.slice(2), {
    boolean: 'copyonly'
});
if (argv.copyonly) {
    vid2Img.copyImagesToWebsite(videoFolder, argv._)
} else {
    gpx2feature(path.join(__dirname, '../track', 'track.gpx'), 60)
    vid2Img.extractFotosFromVideo(videoFolder, () => {
        vid2Img.copyImagesToWebsite(videoFolder)
    })
}
