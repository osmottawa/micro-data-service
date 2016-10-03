import * as os from 'os'
import * as fs from 'fs'
import * as yml from 'js-yaml'
import * as path from 'path'
import * as uuid from 'node-uuid'
import debug from '../app/debug'
import MBTiles from './MBTiles'

//////////////////////////////////////
// Loading Configurations
//////////////////////////////////////
interface InterfaceConfigs {
  datasets: any
  server: any
}

interface InterfaceDatasets {
  (key: string): any
}

const loadConfigs = () => {
  const configs: InterfaceConfigs = {
    server: {},
    datasets: {}
  }

  // SERVER
  if (fs.existsSync(path.join(__dirname, '..', 'configs/server.json'))) {
    configs.server = yml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'configs', 'server.yml'), { encoding: 'utf-8' }))
    debug.configs('[OK] loaded <configs/server.json>')

  } else if (fs.existsSync(path.join(__dirname, '..', 'configs', 'server-example.yml'))) {
    configs.server = yml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'configs', 'server-example.yml'), { encoding: 'utf-8' }))
    debug.configs('[OK] loaded <configs/server-example.yml>')

  } else {
    const message = 'Missing server configs <configs/server.yml>'
    debug.error(message)
    throw new Error(message)
  }
  return configs
}

//////////////////////////////////////
// Download Datasets
//////////////////////////////////////

export class Datasets {
  private _datasets: any

  constructor() {
    this._datasets = {}
    this.load()
  }

  public get(name: string): MBTiles {
    return this._datasets[name]
  }

  private load() {
    fs.readdirSync(path.join(__dirname, '..', 'data')).map(data => {
      const [name, ext] = data.split('.')
      if (ext === 'mbtiles') {
        debug.server(`[OK] Data loaded: ${ name }`)
        const mbtiles = new MBTiles(path.join(__dirname, '..', 'data', data))
        this._datasets[name] = mbtiles
      }
    })
  }
}
export const configs = loadConfigs()
export const PORT = (process.env.PORT) ? process.env.PORT : (configs.server.PORT) ? configs.server.PORT : 5000
export const SECRET = (process.env.SECRET) ? process.env.SECRET : (configs.server.SECRET) ? configs.server.SECRET : uuid.v4()
export const CORES = (process.env.CORES) ? process.env.CORES : (configs.server.CORES) ? configs.server.CORES : os.cpus().length
