var mymap;

var redIcon = L.AwesomeMarkers.icon({
    icon: 'camera',
    markerColor: 'red',
    prefix: 'fa'
});

var blueIcon = L.AwesomeMarkers.icon({
    icon: 'camera',
    markerColor: 'blue',
    prefix: 'fa'
});

var bedIcon = L.AwesomeMarkers.icon({
    icon: 'bed',
    markerColor: 'black',
    prefix: 'fa'
});

var pauseIcon = L.AwesomeMarkers.icon({
    icon: 'pause',
    markerColor: 'black',
    prefix: 'fa'
});

var foodIcon = L.AwesomeMarkers.icon({
    icon: 'cutlery',
    markerColor: 'black',
    prefix: 'fa'
});


window.onload = function () {
    mymap = L.map('mapid').setView([47.4275447, 8.6778257], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        'attribution': 'Kartendaten &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        'useCache': true
    }).addTo(mymap);
    addImages();
    addTrack();
    addPauses();
};

function getColor(x) {
    return x < 140 ? 'green' :
        x < 150 ? 'yellow' :
        x < 160 ? 'orange' :
        'red';
};

function addPauses() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'pauses.geojson');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'json';
    xhr.onload = function () {
        if (xhr.status !== 200) return
        L.geoJSON(xhr.response, {
            pointToLayer: function (feature, latlng) {
                if (feature.properties.type == "overnight") {
                    return L.marker(latlng, {
                        icon: bedIcon,
                        zIndexOffset: 1000
                    });
                } else if (feature.properties.type == "pause") {
                    return L.marker(latlng, {
                        icon: pauseIcon
                    });
                } else if (feature.properties.type == "food") {
                    return L.marker(latlng, {
                        icon: foodIcon
                    });
                }
            },
        }).addTo(mymap);
    };
    xhr.send();
}

function addTrack() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'track_splitted.geojson');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'json';
    xhr.onload = function () {
        if (xhr.status !== 200) return
        L.geoJSON(xhr.response, {
            style: function (feature) {
                return {
                    "color": getColor(feature.properties.hr),
                }
            }
        }).addTo(mymap);
    };
    xhr.send();
}

function ConvertDMSToDD(degrees, minutes, seconds) {
    var dd = degrees + minutes / 60 + seconds / (60 * 60);
    return dd;
}

function sortAndDisplayImages(images) {
    images.sort(function (a, b) {
        return a.datum - b.datum;
    })
    var loader = document.getElementById('loader');
    loader.parentElement.removeChild(loader);
    for (img of images) {
        document.getElementById('fotoColumn').appendChild(img);
    }
    document.querySelector(".leaflet-popup-pane").addEventListener("load", function (event) {
        var tagName = event.target.tagName,
            popup = mymap._popup;
        if (tagName === "IMG" && popup) {
            popup.update();
        }
    }, true);
}

function addImages() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/thumbnails", true);
    xhr.responseType = 'document';
    xhr.onload = () => {
        if (xhr.status === 200) {
            var imageElements = [];
            var elements = xhr.response.getElementsByTagName("a");
            for (x of elements) {
                if (x.href.match(/\.(jpe?g|png|gif)$/)) {
                    imageElements.push(x.href);
                }
            }
            var images = [];
            var markers = [];
            var dateFormat = 'YYYY:MM:DD HH:mm:ss';
            imageElements.forEach(function (imageSource) {
                let img = document.createElement("img");
                img.src = imageSource;
                img.onload = function () {
                    EXIF.getData(img, function () {
                        images.push(img);
                        img.datum = moment(EXIF.getTag(this, "DateTimeOriginal"), dateFormat).toDate();
                        var lat = EXIF.getTag(this, "GPSLatitude");
                        var long = EXIF.getTag(this, "GPSLongitude");
                        if (lat && long) {
                            var marker = L.marker([ConvertDMSToDD(lat[0], lat[1], lat[2]), ConvertDMSToDD(long[0], long[1], long[2])], {
                                icon: blueIcon
                            }).addTo(mymap);
                            markers.push(marker);
                            marker.bindPopup("<img class=\"popup-image\" src=\"fotos" + img.src.substring(img.src.lastIndexOf('/')) + "\"/ >", {
                                maxWidth: "auto"
                            })
                            marker.on('click', function (e) {
                                img.scrollIntoView();
                            });
                            img.onmouseout = function () {
                                marker.setIcon(blueIcon);
                                marker.setZIndexOffset(0);
                            };
                            img.onmouseover = function () {
                                marker.setIcon(redIcon);
                                marker.setZIndexOffset(1000);
                            };
                            img.onclick = function () {
                                marker.openPopup();
                            }
                        }
                        if (images.length == imageElements.length) {
                            if (markers.length > 0) {
                                var group = new L.featureGroup(markers);
                                mymap.fitBounds(group.getBounds());
                            }
                            sortAndDisplayImages(images);
                        }
                    });
                }
            });
        } else {
            alert('Request failed. Returned status of ' + xhr.status);
        }
    }
    xhr.send()
}