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

// Use first image (assume only one is returned)
var image = maskS2clouds(s2.first()).clip(aoi);

// Calculate NDVI: (NIR - RED) / (NIR + RED)
var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');

// Print debug info
print('Filtered S2 Image Collection:', s2);
print('Cloud-masked Image:', image);
print('NDVI Image:', ndvi);

// Add NDVI to the map
Map.centerObject(aoi, 10);
Map.addLayer(ndvi, {min: -1, max: 1, palette: ['blue', 'white', 'green']}, 'NDVI');

// Export NDVI as .tif file
Export.image.toDrive({
  image: ndvi,
  description: 'NDVI',
  folder: 'NDVI_Export',
  fileNamePrefix: 'NDVI',
  region: aoi,
  scale: 10,
  crs: 'EPSG:4326'
});
