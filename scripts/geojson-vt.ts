import * as path from 'path'
import * as fs from 'fs'
import * as turf from '@turf/turf'
import * as mercator from 'global-mercator'

const geojsonvt = require('geojson-vt')

interface InterfaceTile {
  geometry: Array<any>
  type: number
  tags: any
}

const dataset = require(path.join(__dirname, 'buildings.json'))
const tileIndex = geojsonvt(dataset, {
  maxZoom: 12,
  tolerance: 1,
  extent: 256,
  indexMaxZoom: 12,
})

const results = turf.featureCollection([])

const features: Array<InterfaceTile> = tileIndex.getTile(12, 1186, 1467).features
features.map(feature => {
  if (feature.type === 3) { results.features.push(turf.polygon(feature.geometry, feature.tags)) }
})
fs.writeFileSync(path.join(__dirname, 'geojson-vt.json'), JSON.stringify(results, null, 4))
