import * as turf from '@turf/turf'
import * as path from 'path'
import * as cheapRuler from 'cheap-ruler'
import * as mercator from 'global-mercator'
import * as geocoder from 'geocoder-geojson'
import * as d3 from 'd3-queue'
import { Router, Request, Response } from 'express'
import { geojson2osm } from 'geojson2osm-es6'
import { Tile, getFiles } from '../utils'
import MBTiles from '../mbtiles'
import { PATH } from '../configs'
import * as tilebelt from 'tilebelt'

const router = Router()
const cache: any = { }
type FeatureCollection = GeoJSON.FeatureCollection<any>

interface DatasetRequest extends Request {
  params: {
    ext: string
    x: string
    y: string
    z: string
    dataset: string
  }
  query: {
    qa: string
    area: string
    filter: string
    wikidata: string
    radius: string
    subclasses: string
    exclude: string
    inverse: string
  }
}

export function validateDataset(req: DatasetRequest, res: Response) {
  if (getFiles(PATH, /\.mbtiles$/).indexOf(req.params.dataset) === -1) {
    return res.status(500).json({
      error: 'Invalid MBTiles dataset',
      message: 'URL does not match any of the avaiable MBTiles datasets',
      ok: false,
      status_code: 500,
    })
  }
}

export function getTile(req: DatasetRequest): Tile {
  return [Number(req.params.x), Number(req.params.y), Number(req.params.z)]
}

export function getPolygon(req: Request): GeoJSON.Feature<GeoJSON.Polygon> {
  const poly = turf.bboxPolygon(mercator.tileToBBox(getTile(req)))
  poly.properties = {
    algorithm: 'Global Mercator',
    type: 'extent',
  }
  return poly
}

export function parseUrl(req: DatasetRequest): string {
  const url = req.url.replace(/\.[json|geojson|osm]+/, '')
  return url
}

export function parseResults(results: GeoJSON.FeatureCollection<any>, req: DatasetRequest, res: Response) {
  console.log('Results:', results.features.length)
  if (req.params.ext === '.osm') {
    res.set('Content-Type', 'text/xml')
    return res.send(parseOSM(results))
  } else {
    return res.json(results)
  }
}

export function parseOSM(results: GeoJSON.FeatureCollection<any>) {
  return geojson2osm(results) // .replace(/changeset="false"/g, 'action=\"modify\"')
}

/**
 * Filter By Area
 */
function filterByArea(results: FeatureCollection, tile: Tile, area: number): FeatureCollection {
    const y = tile[1]
    const z = tile[2]
    const ruler = cheapRuler.fromTile(y, z, 'feet')
    if (area) {
      results.features = results.features.filter(result => area < ruler.area(result.geometry.coordinates))
    }
    return results
}

/**
 * Get Tile Zoom 12 - Used for QA Tiles
 */
function getTileZoom12(tile: Tile): Tile {
  const centroid = turf.centroid(tilebelt.tileToGeoJSON(tile))
  const [lng, lat] = centroid.geometry.coordinates
  const [x, y, z] = tilebelt.pointToTile(lng, lat, 12)
  return [x, y, z]
}

/**
 * Filter by BBox
 */
function filterByBBox(features: FeatureCollection, bbox: Array<number>, tile: Tile) {
  const y = tile[1]
  const z = tile[2]
  const ruler = cheapRuler.fromTile(y, z)
  const container = turf.featureCollection([])
  container.features = features.features.filter(feature => {
    for (const point of turf.explode(feature).features) {
      if (ruler.insideBBox(point.geometry.coordinates, bbox)) {
        return true
      }
    }
  })
  return container
}

/**
 * Filter by Keys
 */
function filterByKeys(results: FeatureCollection, keys: Array<string>): FeatureCollection {
  results.features = results.features.filter(feature => {
    for (const key of keys) {
      if (feature.properties[key]) { return true }
    }
    return false
  })
  return results
}

/**
 * Filter by Type
 */
function filterByType(results: FeatureCollection, type: string): FeatureCollection {
  results.features = results.features.filter(feature => {
    return feature.geometry.type === 'Polygon'
  })
  return results
}

/**
 * Filter by Exclude
 */
async function filterByExclude(
  results: FeatureCollection,
  tile: Tile,
  exclude: Array<string>,
  qa: string,
  inverse = false): Promise<FeatureCollection> {
  const bbox = mercator.tileToBBox(tile)
  const qaTile = new MBTiles(qa)
  let qaData = await qaTile.getTile(getTileZoom12(tile))
  qaData = filterByBBox(qaData, bbox, tile)
  qaData = filterByKeys(qaData, exclude)
  qaData = filterByType(qaData, 'Polygon')
  results.features = results.features.filter(feature => {
    const points = turf.explode(feature)
    const centroid = turf.centroid(feature)
    points.features.push(centroid)
    if (inverse) { return turf.within(points, qaData).features.length !== 0
    } else { return turf.within(points, qaData).features.length === 0 }
  })
  return results
}

/**
 * Filter by Filter
 */
function filterByFilter(results: FeatureCollection, tagFilter: Array<Array<string>>): FeatureCollection {
  if (tagFilter) {
    results.features = results.features.filter(result => {
      let status = true
      tagFilter.map(tag => {
        const [operator, key, value] = tag
        if (operator === '==') {
          if (result.properties[key] !== value) {
            status = false
          }
        }
      })
      return status
    })
  }
  return results
}

function removeProperties(results: FeatureCollection, properties = ['@user']): FeatureCollection {
  results.features = results.features.map(result => {
    properties.map(property => {
      delete result.properties[property]
    })
    return result
  })
  return results
}

function addWikidata(results: FeatureCollection, req: DatasetRequest): Promise<GeoJSON.FeatureCollection<any>> {
  return new Promise((resolve, reject) => {
    const q = d3.queue(100)
    const container: Array<GeoJSON.Feature<GeoJSON.Point>> = []
    const radius = (req.query.radius) ? Number(req.query.radius) : 15
    const subclasses = (req.query.subclasses) ? JSON.parse(req.query.subclasses) : ['Q486972']

    // Function in d3-queue
    async function requestWikidata(result: GeoJSON.Feature<any>, callback: any) {
      const name = result.properties['name:en'] || result.properties['name:fr'] || result.properties.name
      const geometry = result.geometry.coordinates
      const options = {nearest: geometry, subclasses, radius}
      console.log(`geojson-json (options): ${ name } ${ JSON.stringify(options) }`)

      if (result.properties.wikidata === undefined) {
        console.log(`Fetching Wikidata [${ radius }km]: ${ name }`)

        if (name !== undefined) {
          const wikidata = await geocoder.wikidata(name, options)
          console.log(`wikidata results: ${ JSON.stringify(wikidata) }`)

          if (wikidata.features.length > 0) {
            console.log(`[Success] Wikidata found! [${ wikidata.features[0].id }]: ${ name }`)

            // Apply OSM related tags as a modified object
            result.properties.wikidata = wikidata.features[0].id
            result.properties['@action'] = 'modify'
            delete result.properties['@changeset']
          } else {
            console.log(`[Error] Wikidata not found: ${ name }`)
          }
        }
      } else {
        console.log(`Wikidata already exists! [${ result.properties.wikidata }]: ${ name }`)
      }
      // Finished
      container.push(result)
      callback(null)
    }
    for (const result of results.features) {
      q.defer(requestWikidata, result)
    }
    q.await((error) => {
      if (error) {
        console.log('[Error] Wikidata Queue', error)
        return reject(turf.featureCollection(container))
      }
      return resolve(turf.featureCollection(container))
    })
  })
}

/**
 * Retrieves Geographical Extent of Tile
 */
router.route('/:z(\\d+)/:x(\\d+)/:y(\\d+)(/extent:ext(.json|.geojson|.osm|)|:ext(.json|.geojson|.osm|))')
  .get((req: DatasetRequest, res: Response) => {
    parseUrl(req)
    const extent = getPolygon(req)
    const results = turf.featureCollection([extent])

    return parseResults(results, req, res)
  })

/**
 * Retrieves data within Tile
 */
router.route('/:z(\\d+)/:x(\\d+)/:y(\\d+)/:dataset:ext(.json|.geojson|.osm|)')
  .get(async (req: DatasetRequest, res: Response) => {
    validateDataset(req, res)
    const tile = getTile(req)
    const area = (req.query.area) ? Number(req.query.area) : undefined
    const filter = (req.query.filter) ? JSON.parse(req.query.filter) : undefined
    const wikidata = (req.query.wikidata) ? (req.query.wikidata.toLocaleLowerCase() === 'true') : undefined
    const qa = path.join(PATH, (req.query.qa) ? `${req.query.qa.replace('.mbtiles', '')}.mbtiles` : 'canada.mbtiles')
    const exclude = (req.query.exclude) ? req.query.exclude.split(',') : undefined
    const inverse = req.query.inverse === 'true'

    if (cache[req.url]) {
      console.log('using cache')
      return parseResults(cache[req.url], req, res)
    }

    // Fetch tile from local MBTiles
    const mbtiles = new MBTiles(path.join(PATH, `${ req.params.dataset }.mbtiles`))
    mbtiles.getTile(tile)
      .then(async results => {
        // Filters
        results = removeProperties(results, ['@user'])
        if (filter) { results = filterByFilter(results, filter) }
        if (area) { results = filterByArea(results, tile, area) }
        if (wikidata) { results = await addWikidata(results, req) }
        if (exclude) { results = await filterByExclude(results, tile, exclude, qa, inverse) }

        // Cache results
        cache[req.url] = results
        return parseResults(results, req, res)
      }, error => {
        const results = turf.featureCollection([])
        cache[req.url] = results
        return parseResults(results, req, res)
      })
  })

export default router
