import * as turf from '@turf/turf'
import { isUndefined } from 'lodash'
import { Router, Request, Response } from 'express'
import debug from '../debug'
import { configs, downloadDatasets } from '../configs'
import { geojson2osm } from 'geojson2osm'
import * as concaveman from 'concaveman'
import * as mercator from 'global-mercator'
import { Tile } from 'global-mercator'

const router = Router()
export const cache: any = {}
export const datasets = downloadDatasets()

export function validateDataset(req: Request, res: Response) {
  if (isUndefined(datasets[req.params.dataset])) {
    return res.status(500).json({
      error: 'Invalid dataset',
      message: 'URL does not match any of the avaiable datasets',
      ok: false,
      status_code: 500,
    })
  }
}

export function getTile(req: Request): Tile {
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

export function parseUrl(req: Request): string {
  const url = req.url.replace(/\.[json|geojson|osm]+/, '')
  debug.server(url)
  return url
}

export function parseResults(results: GeoJSON.FeatureCollection<any>, req: Request, res: Response) {
  debug.server(`results: ${ results.features.length }`)
  if (req.params.ext === '.osm') {
    res.set('Content-Type', 'text/xml')
    return res.send(parseOSM(results))
  } else {
    return res.json(results)
  }
}

export function parseOSM(results: GeoJSON.FeatureCollection<any>) {
  return geojson2osm(results).replace(/changeset="false"/g, 'action=\"modifiy\"')
}

interface InterfaceRequest extends Request {
  params: {
    ext: string
    x: string
    y: string
    zoom: string
    dataset: string
  }
}

/**
 * CONFIGS
 */
router.route('/datasets')
  .all((req: Request, res: Response) => {
    res.json(configs.datasets)
  })

/**
 * Retrieves full dataset
 */
router.route('/:dataset:ext(.json|.geojson|.osm|)')
  .get(async (req: InterfaceRequest, res: Response) => {
    validateDataset(req, res)
    parseUrl(req)
    const results: GeoJSON.FeatureCollection<any> = await datasets[req.params.dataset]

    return parseResults(results, req, res)
  })

/**
 * Retrieves Geographical Extent of entire Dataset
 */
router.route('/:dataset/extent:ext(.json|.geojson|)')
  .get((req: InterfaceRequest, res: Response) => {
    validateDataset(req, res)
    const url = parseUrl(req)

    // Set up Cache
    let results: GeoJSON.FeatureCollection<any> = cache[url]
    debug.server(`cache: ${ !isUndefined(results) }`)

    if (isUndefined(results)) {
      // Converts feature collection into single points
      let dataset: GeoJSON.FeatureCollection<any> = datasets[req.params.dataset]
      dataset = turf.explode(dataset)
      const points: number[][] = []
      dataset.features.map(feature => points.push(feature.geometry.coordinates))

      // Calculate extent
      const polygon = turf.polygon([concaveman(points)], {
        algorithm: 'Mapbox concaveman',
        dataset: req.params.dataset,
        type: 'extent',
      })
      // Save results to cache
      results = turf.featureCollection([polygon])
      cache[url] = results
    }

    return parseResults(results, req, res)
  })

/**
 * Retrieves Geographical Extent of Tile
 */
router.route('/:z(\\d+)/:x(\\d+)/:y(\\d+)/extent:ext(.json|.geojson|.osm|)')
  .get((req: InterfaceRequest, res: Response) => {
    parseUrl(req)
    const extent = getPolygon(req)
    const results = turf.featureCollection([extent])

    return parseResults(results, req, res)
  })

/**
 * Retrieves data within Tile
 */
router.route('/:z(\\d+)/:x(\\d+)/:y(\\d+)/:dataset:ext(.json|.geojson|.osm|)')
  .get(async (req: InterfaceRequest, res: Response) => {
    validateDataset(req, res)
    const tile = getTile(req)
    let results = await datasets[req.params.dataset].getTile(tile)
    return parseResults(results, req, res)
  })

export default router
