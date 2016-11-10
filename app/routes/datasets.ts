import { featureCollection } from '@turf/helpers'
import * as bboxPolygon from '@turf/bbox-polygon'
import * as path from 'path'
import * as mercator from 'global-mercator'
import { Router, Request, Response } from 'express'
import { geojson2osm } from 'geojson2osm-es6'
import { Tile, getFiles } from '../utils'
import MBTiles from '../mbtiles'
import { PATH } from '../configs'

const router = Router()
const cache: any = { }

interface DatasetRequest extends Request {
  params: {
    ext: string
    x: string
    y: string
    z: string
    dataset: string
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
  return geojson2osm(results).replace(/changeset="false"/g, 'action=\"modifiy\"')
}

/**
 * Retrieves Geographical Extent of Tile
 */
router.route('/:z(\\d+)/:x(\\d+)/:y(\\d+)(/extent:ext(.json|.geojson|.osm|)|:ext(.json|.geojson|.osm|))')
  .get((req: DatasetRequest, res: Response) => {
    parseUrl(req)
    const extent = getPolygon(req)
    const results = featureCollection([extent])

    return parseResults(results, req, res)
  })

/**
 * Retrieves data within Tile
 */
router.route('/:z(\\d+)/:x(\\d+)/:y(\\d+)/:dataset:ext(.json|.geojson|.osm|)')
  .get(async (req: DatasetRequest, res: Response) => {
    validateDataset(req, res)
    const tile = getTile(req)
    const area = Number(req.query.area)

    // Fetch tile from local MBTiles
    const mbtiles = new MBTiles(path.join(PATH, `${ req.params.dataset }.mbtiles`))
    mbtiles.getTile(tile, area)
      .then(data => {
        return parseResults(data, req, res)
      }, error => {
        return parseResults(featureCollection([]), req, res)
      })
  })

export default router
