import { keys } from 'lodash'
import { Router, Request, Response } from 'express'
import { worker } from 'cluster'
import { datasets } from './datasets'

const router = Router()

/**
 * Documentation for API
 */
router.route('/')
  .all((req: Request, res: Response) => {
    res.json({
      api: 'Micro Data Service v0.1.0',
      cluster: (worker) ? worker.process.pid : undefined,
      datasets: keys(datasets),
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
