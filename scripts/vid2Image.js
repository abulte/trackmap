const gpmfExtract = require('gpmf-extract');
const goproTelemetry = require('gopro-telemetry');
var ffmpeg = require('ffmpeg');
var piexif = require("piexifjs");
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const gpsOutputPath = path.join(__dirname, '..', 'metadata');
const imageOutputPath = path.join(__dirname, '..', 'fotos');

function extractFotosFromVideo(videoPath, callback) {
    fs.rmdirSync(gpsOutputPath, {
        recursive: true
    })
    fs.rmdirSync(imageOutputPath, {
        recursive: true
    })
    fs.rmdirSync(path.join('..', 'website', 'thumbnails'), {
        recursive: true
    })
    fs.rmdirSync(path.join('..', 'website', 'fotos'), {
        recursive: true
    })
    fs.mkdirSync(gpsOutputPath)
    fs.mkdirSync(imageOutputPath)
    fs.mkdirSync(path.join('..', 'website', 'thumbnails'))
    fs.mkdirSync(path.join('..', 'website', 'fotos'))
    fs.readdir(videoPath, function (err, paths) {
        if (err) {
            return console.log('Unable to scan directory: ' + err)
        }
        paths.forEach(function (filename) {
            if (!filename.startsWith('.')) {
                var filepath = path.join(videoPath, filename);
                const dataExtractor = extractData(filepath, filename.slice(0, -4))
                const imageExtractor = extractImages(filepath, filename.slice(0, -4))
                Promise.all([dataExtractor, imageExtractor])
                    .then((result) => {
                        updateExif(filename.slice(0, -4))
                        callback()
                    }).catch((err) => console.log(err))
            }
        });
    });
}

function updateExif(filename) {
    console.log('Update exifs ' + filename)
    var geoInfo = JSON.parse(fs.readFileSync(path.join(gpsOutputPath, filename + '.json')))
    var basImagePath = path.join(imageOutputPath, filename)
    var paths = fs.readdirSync(basImagePath)
    paths.sort(function (a, b) {
        return fs.statSync(path.join(basImagePath, a)).mtime.getTime() -
            fs.statSync(path.join(basImagePath, b)).mtime.getTime()
    });
    paths.forEach((imageFile, i) => {
        var imageInfo;
        if (i > geoInfo['1'].streams.GPS5.samples.length - 1) {
            imageInfo = geoInfo['1'].streams.GPS5.samples[geoInfo['1'].streams.GPS5.samples.length - 1];
        } else {
            imageInfo = geoInfo['1'].streams.GPS5.samples[i];
        }
        var jpeg = fs.readFileSync(path.join(basImagePath, imageFile))
        var data = jpeg.toString("binary")

        var lat = imageInfo.value[0];
        var lng = imageInfo.value[1];
        var alt = imageInfo.value[2];

        var exif = {};
        var gps = {};
        var date = new Date(imageInfo.date);
        const dateTimeFormat = new Intl.DateTimeFormat('de', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        const [{
            value: year
        }, , {
            value: month
        }, , {
            value: day
        }, , {
            value: hour
        }, , {
            value: minute
        }, , {
            value: second
        }] = dateTimeFormat.formatToParts(date)
        var formattedDate = `${year}:${month}:${day} ${hour}:${minute}:${second}`
        exif[piexif.ExifIFD.DateTimeOriginal] = formattedDate
        exif[piexif.ExifIFD.DateTimeDigitized] = formattedDate
        gps[piexif.GPSIFD.GPSDateStamp] = formattedDate
        gps[piexif.GPSIFD.GPSLatitudeRef] = lat < 0 ? 'S' : 'N'
        gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(lat)
        gps[piexif.GPSIFD.GPSLongitudeRef] = lng < 0 ? 'W' : 'E'
        gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(lng)
        gps[piexif.GPSIFD.GPSAltitude] = alt
        var exifObj = {
            "Exif": exif,
            "GPS": gps
        }
        var exifbytes = piexif.dump(exifObj)
        var newData = piexif.insert(exifbytes, data)
        var newJpeg = Buffer.from(newData, "binary")
        fs.writeFileSync(path.join(basImagePath, imageFile), newJpeg)
    });
}

async function extractImages(filepath, filename) {
    console.log('Extracting images ' + filename)
    const video = await new ffmpeg(filepath)
    return new Promise((resolve, reject) => {
        video.fnExtractFrameToJPG(path.join(imageOutputPath, filename), {
            file_name: 'image',
            quality: 10
        }, () => {
            resolve()
        });
    });
}

function copyImagesToWebsite(videoPath, selectedImages) {
    fs.rmdirSync(path.join('..', 'website', 'thumbnails'), {
        recursive: true
    })
    fs.rmdirSync(path.join('..', 'website', 'fotos'), {
        recursive: true
    })
    fs.mkdirSync(path.join('..', 'website', 'thumbnails'))
    fs.mkdirSync(path.join('..', 'website', 'fotos'))
    fs.readdir(videoPath, function (err, paths) {
        if (err) {
            return console.log('Unable to scan directory: ' + err)
        }
        paths.forEach(function (filename) {
            if (!filename.startsWith('.')) {
                copyVideoImagesToWebsite(filename.slice(0, -4), selectedImages)
            }
        });
    });
}

function copyVideoImagesToWebsite(videoname, selectedImages) {
    var basImagePath = path.join(imageOutputPath, videoname)
    var paths = fs.readdirSync(basImagePath)
    paths.forEach((imageFile) => {
        if (selectedImages.includes(videoname + "_" + imageFile.slice(0, -4))) {
            fs.createReadStream(path.join(basImagePath, imageFile)).pipe(fs.createWriteStream(path.join('..', 'website', 'fotos', videoname + "_" + imageFile)))
            sharp(path.join(basImagePath, imageFile)).withMetadata()
                .resize(300).toFile(path.join('..', 'website', 'thumbnails', videoname + "_" + imageFile))
        }
    })

}

async function extractData(filepath, filename) {
    console.log('Extracting metadata ' + filename)
    const res = await gpmfExtract(fs.readFileSync(filepath))
    const telemetry = await goproTelemetry(res, {
        stream: ['GPS5']
    })
    return new Promise((resolve, reject) => {
        try {
            fs.writeFileSync(path.join(gpsOutputPath, filename + '.json'), JSON.stringify(telemetry))
            resolve()
        } catch (error) {
            console.log('Could not extract metadata: ' + error)
            reject()
        }

    });
}

module.exports = {
    extractFotosFromVideo: extractFotosFromVideo,
    copyImagesToWebsite: copyImagesToWebsite
}