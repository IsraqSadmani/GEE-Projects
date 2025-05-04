// Set Area of Interest (AOI)
var aoi = ee.FeatureCollection("projects/gee-myproject-israqsadmani/assets/Nachole");

// Define time range
var startDate = '2025-02-07';
var endDate = '2025-02-08';  // Include full day

// Load Sentinel-2 L2A image collection
var s2 = ee.ImageCollection("COPERNICUS/S2_SR")
            .filterBounds(aoi)
            .filterDate(startDate, endDate)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5));

// Cloud mask using SCL band
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var cloudMask = scl.neq(3)  // cloud shadow
                    .and(scl.neq(7))  // unclassified
                    .and(scl.neq(8))  // cloud medium
                    .and(scl.neq(9))  // cloud high
                    .and(scl.neq(10)) // cirrus
                    .and(scl.neq(11));// snow
  return image.updateMask(cloudMask);
}

// Apply cloud mask
var masked = s2.map(maskS2clouds);

// Use first image
var image = maskS2clouds(s2.first()).clip(aoi);

// Select bands for classification
var exportBands = image.select([
  'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12'
]);

// Load training samples
var trainingSamples = ee.FeatureCollection("projects/gee-myproject-israqsadmani/assets/Nachole_Upazila_TS");

// Sample the image using training points
var training = exportBands.sampleRegions({
  collection: trainingSamples,
  properties: ['Classvalue'],
  scale: 10
});

// Train the Random Forest classifier
var classifier = ee.Classifier.smileRandomForest(50).train({
  features: training,
  classProperty: 'Classvalue',
  inputProperties: exportBands.bandNames()
});

// Classify the image
var classified = exportBands.classify(classifier);

// Define LULC color palette (based on your RGB)
var lulcPalette = [
  'c500ff',  // Agricultural Land (197,0,255)
  'ffff00',  // Bare Soil (255,255,0)
  'ff0000',  // Built Up (255,0,0)
  '0070ff',  // Waterbody (0,112,255)
  '489874'   // Vegetation (72,152,116)
];

// Add the classified image to the map
Map.addLayer(classified, {
  min: 1,
  max: 253,
  palette: lulcPalette
}, 'LULC Classification');

// Print debug info
print('Filtered S2 Image Collection:', s2);
print('Cloud-masked Image:', image);
print('First Image in Collection:', s2.first());
Map.centerObject(aoi, 10);

// Export the classified image as a TIFF file
Export.image.toDrive({
  image: classified,
  description: 'LULC_Classification_Nachole',
  folder: 'GEE_Exports', // Name of the folder in Google Drive
  fileNamePrefix: 'LULC_Nachole',
  region: aoi, // The area to export
  scale: 10,   // Pixel resolution (adjust this if needed)
  fileFormat: 'GeoTIFF',
  maxPixels: 1e8 // Limit for the number of pixels
});
