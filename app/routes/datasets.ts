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
    let osm: string
    if (cache[req.url]) {
      console.log('using cache')
      osm = cache[req.url]
    } else {
      osm = parseOSM(results)
      cache[req.url] = osm
    }
    return res.send(osm)
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

async function addWikidata(results: FeatureCollection): Promise<FeatureCollection> {
  let container: Array<GeoJSON.Feature<GeoJSON.Point>> = []
  for (const result of results.features) {
    if (!result.properties.wikidata) {
      const wikidata = await geocoder.wikidata(result.properties.name, { nearest: result.geometry.coordinates })
      if (wikidata.features[0]) {
        console.log(wikidata.features[0])
        result.properties.wikidata = wikidata.features[0].id
        result.properties['@action'] = 'modify'
        delete result.properties['@changeset']
      }
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

    // Fetch tile from local MBTiles
    const mbtiles = new MBTiles(path.join(PATH, `${ req.params.dataset }.mbtiles`))
    mbtiles.getTile(tile)
      .then(async results => {
        if (filter) { results = filterByFilter(results, filter)}
        if (area) { results = filterByArea(results, tile, area) }
        if (wikidata) { results = await addWikidata(results)}
        return parseResults(results, req, res)
      }, error => {
        return parseResults(turf.featureCollection([]), req, res)
      })
  })

export default router
