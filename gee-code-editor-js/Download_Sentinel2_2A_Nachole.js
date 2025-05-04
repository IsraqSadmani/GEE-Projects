// Set Area of Interest (AOI)
var aoi = ee.FeatureCollection("projects/gee-myproject-israqsadmani/assets/Nachole");

// Define time range
var startDate = '2025-01-15';
var endDate = '2025-02-15';

// Load Sentinel-2 and filter
var s2 = ee.ImageCollection("COPERNICUS/S2_SR")
            .filterBounds(aoi)
            .filterDate(startDate, endDate)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5));

// Cloud mask
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
  return image.updateMask(mask);
}

// Apply cloud mask and take median
var image = s2.map(maskS2clouds).median().clip(aoi);

// Select bands needed for ArcGIS analysis
var exportBands = image.select([
  'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12'
]);

// Export to Google Drive
// Export.image.toDrive({
//   image: exportBands,
//   description: 'Sentinel2_Nachole',
//   folder: 'GEE_Exports',
//   fileNamePrefix: 'S2_2025_Bands',
//   region: aoi.geometry(),
//   scale: 10,
//   maxPixels: 1e13
// });

// Display RGB
Map.centerObject(aoi, 10);
Map.addLayer(image.select(['B4', 'B3', 'B2']), {min: 0, max: 3000}, 'RGB Composite');