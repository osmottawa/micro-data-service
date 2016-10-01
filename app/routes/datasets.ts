import * as turf from '@turf/turf'
import { isUndefined } from 'lodash'
import { Router, Request, Response } from 'express'
import debug from '../debug'
import { configs, downloadDatasets } from '../configs'
import { geojson2osm } from 'geojson2osm'
import * as concaveman from 'concaveman'

const router = Router()
export const cache: any = {}
export const datasets = downloadDatasets()

const parseOSM = (results: GeoJSON.FeatureCollection<any>) : string => {
  return geojson2osm(results).replace(/changeset="false"/g, 'action=\"modifiy\"')
}

interface InterfaceRequest extends Request {
  params: {
    ext: string
    tile_row: number
    tile_column: number
    zoom: number
    dataset: string
  }
}

/**
 * CONFIGS
 */
router.route('/')
  .all((req: Request, res: Response) => {
    res.json(configs.datasets)
  })

export default router
