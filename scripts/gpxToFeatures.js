'use strict';

const fs = require('fs');
const tj = require('@mapbox/togeojson')
const DOMParser = require('xmldom').DOMParser;

function gpxToGeoFeatures(gpxPath, bucketSize) {
    console.log("Convert " + gpxPath + " to map features combine " + bucketSize + " timepoints")
    var gpx = new DOMParser().parseFromString(fs.readFileSync(gpxPath, 'utf8'));
    let track = tj.gpx(gpx)

    let singleFeature = track.features[0]

    let resultTrack = {};
    resultTrack.type = "FeatureCollection";
    resultTrack.features = [];

    let resultPauses = {};
    resultPauses.type = "FeatureCollection";
    resultPauses.features = [];

    for (var i = 1; i < singleFeature.geometry.coordinates.length - bucketSize; i += bucketSize) {
        let combinedFeature = {};
        combinedFeature.type = "Feature";
        let geometry = {};
        combinedFeature.geometry = geometry;
        geometry.type = "LineString";
        geometry.coordinates = [];
        // Add coordinates to segment
        for (var j = -1; j < bucketSize; j++) {
            // Add pause point if time difference is big
            var timedifference = new Date(singleFeature.properties.coordTimes[i + j]) - new Date(singleFeature.properties.coordTimes[i + j - 1]);
            if (timedifference > 10 * 60 * 1000) {
                var pauseFeature = {};
                pauseFeature.type = "Feature";
                pauseFeature.geometry = {};
                pauseFeature.geometry.type = "Point";
                pauseFeature.geometry.coordinates = singleFeature.geometry.coordinates[i + j];
                pauseFeature.properties = {};
                if (timedifference < 30 * 60 * 1000) {
                    pauseFeature.properties.type = "pause";
                } else if (timedifference < 8 * 60 * 60 * 1000) {
                    pauseFeature.properties.type = "food";
                } else {
                    pauseFeature.properties.type = "overnight";
                }
                resultPauses.features.push(pauseFeature);
            }
            geometry.coordinates.push(singleFeature.geometry.coordinates[i + j]);
        }

        // Add heart rate average to segment
        combinedFeature.properties = {};
        combinedFeature.properties.hr = -1;
        if (singleFeature.properties.heartRates.length > i + bucketSize) {
            var sum = 0;
            for (var j = 0; j < bucketSize; j++) {
                sum += singleFeature.properties.heartRates[i + j];
            }
            let avg = sum / bucketSize;
            combinedFeature.properties = {};
            combinedFeature.properties.hr = avg;
        }
        resultTrack.features.push(combinedFeature);
    }

    let trackData = JSON.stringify(resultTrack);
    fs.writeFileSync('../website/track_splitted.geojson', trackData);

    let pausesData = JSON.stringify(resultPauses);
    fs.writeFileSync('../website/pauses.geojson', pausesData);
}

module.exports = gpxToGeoFeatures