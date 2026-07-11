# Frame

A minimal black and white web app that shows a random photograph on every visit. Built with plain HTML, CSS, and JavaScript, with on-device image recognition and no backend required.

## Features

- Random image on load, pulled live from picsum.photos
- Regenerate button to fetch a new image instantly
- Automatic caption generated the moment an image loads, using on-device AI image recognition
- Describe button showing a full breakdown of detected labels and confidence scores
- Details popup with photographer, image ID, dimensions, and source page
- Download button to save the current image
- Copy link button to share the image URL
- Fully responsive, built for both mobile and desktop

## Tech stack

- HTML, CSS, and vanilla JavaScript, no framework or build step
- [TensorFlow.js](https://www.tensorflow.org/js) with the MobileNet model for on-device image classification, loaded from a CDN and run entirely in the browser
- [picsum.photos](https://picsum.photos) as the image source

## Running locally

No build step or install required. Open `index.html` directly in a browser, or serve the folder with any static file server, for example:

\`\`\`bash
npx serve .
\`\`\`

## Limitations

- Location and capture date are not available from the image source, and are shown as unavailable in the Details popup rather than guessed
- Image recognition runs a general-purpose classifier and may occasionally mislabel a subject, especially at low confidence

## License

No license specified. Add one if you plan to share or open source this project.
