import * as turf from '@turf/helpers'
import * as bboxPolygon from '@turf/bbox-polygon'
import * as path from 'path'
import * as cheapRuler from 'cheap-ruler'
import * as mercator from 'global-mercator'
import * as geocoder from 'geocoder-geojson'
import { Router, Request, Response } from 'express'
import { geojson2osm } from 'geojson2osm-es6'
import { Tile, getFiles } from '../utils'
import MBTiles from '../mbtiles'
import { PATH } from '../configs'

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
    area: string
    filter: string
    wikidata: string
    radius: string
    subclasses: string
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
  const poly = bboxPolygon(mercator.tileToBBox(getTile(req)))
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

async function addWikidata(results: FeatureCollection, req: DatasetRequest): Promise<FeatureCollection> {
  const container: Array<GeoJSON.Feature<GeoJSON.Point>> = []
  const radius = (req.query.radius) ? Number(req.query.radius) : 15
  const subclasses = (req.query.subclasses) ? JSON.parse(req.query.subclasses) : ['Q486972']
  for (const result of results.features) {
    const name = result.properties['name:en'] || result.properties['name:fr'] || result.properties['name:it'] || result.properties['name:de'] || result.properties.name
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
    container.push(result)
  }
  return turf.featureCollection(container)
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

    if (cache[req.url]) {
      console.log('using cache')
      return parseResults(cache[req.url], req, res)
    }

    // Fetch tile from local MBTiles
    const mbtiles = new MBTiles(path.join(PATH, `${ req.params.dataset }.mbtiles`))
    mbtiles.getTile(tile)
      .then(async results => {
        if (filter) { results = filterByFilter(results, filter)}
        if (area) { results = filterByArea(results, tile, area) }
        if (wikidata) { results = await addWikidata(results, req)}
        cache[req.url] = results
        return parseResults(results, req, res)
      }, error => {
        const results = turf.featureCollection([])
        cache[req.url] = results
        return parseResults(results, req, res)
      })
  })

export default router
