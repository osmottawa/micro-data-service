import { Router, Request, Response } from 'express'
import { getFiles } from '../utils'
import { PATH } from '../configs'

const router = Router()

/**
 * Documentation for API
 */
router.route('/')
  .all((req: Request, res: Response) => {
    res.json({
      api: 'Micro Data Service v0.2.0',
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
