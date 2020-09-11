# trackmap

Trackmap is a collection of node scripts and a website to convert GoPro timelaps movies and gpx tracks into an interactive map visualization.

![Screenshot](doc/screenshot.png)

## Usage

### Install tools
#### ffmpeg
Instructions can be found [here](http://ffmpeg.org/).
#### Node.js
Instructions can be found [here](https://nodejs.org/en/).
### Clone repo
```
git clone https://github.com/PaulKC/trackmap.git
```
### Install npm dependancies
In the scripts folder execute:
```
npm install
```
### Copy data
* Add a gpx track as `track.gpx` to the `track` folder
* Add the GoPro timelapse movies to the `videos` folder

### Extract data
Run the script
```
node index.js
```

### Select images
Select the images you want to display on the map and run the script again using the `--copyonly` and selected images in the format videoname_imagename

```
node index.js --copyonly GH86543_image_30 GH86543_image_70 
```

### Publish the website
Copy the content of the `website` folder to a webserver