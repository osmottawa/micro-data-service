import { Router, Request, Response } from 'express'
import { getFiles } from '../utils'
import { PATH } from '../configs'
import * as path from 'path'

const router = Router()

/**
 * Documentation for API
 */
router.route('/')
  .all((req: Request, res: Response) => {
    res.json({
      api: `Micro Data Service v${ require(path.join('..', '..', 'package.json')).version}`,
      datasets: getFiles(PATH),
      http: {
        GET: [
          '/datasets',
          '/<dataset>.(json|geojson|osm)',
          '/<dataset>/extent.(json|geojson|osm)',
          '/{zoom}/{x}/{y}/extent.(json|geojson|osm)',
          '/{zoom}/{x}/{y}/<dataset>.(json|geojson|osm)',
        ],
      },
      ok: true,
      status: 200,
    })
  })

export default router
