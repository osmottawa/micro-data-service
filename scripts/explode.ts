import * as path from 'path'
import * as fs from 'fs'
import * as turf from '@turf/turf'
import * as mercator from 'global-mercator'

interface InterfaceTile {
  geometry: Array<any>
  type: number
  tags: any
}

const extent = turf.bboxPolygon(mercator.tileToBBox([13, 2371, 5252]))
const data: GeoJSON.FeatureCollection<GeoJSON.Polygon> = require(path.join(__dirname, 'buildings.json'))
const points = turf.explode(data)
const results = turf.within(points, turf.featureCollection([extent]))

fs.writeFileSync(path.join(__dirname, 'points.json'), JSON.stringify(results, null, 4))
