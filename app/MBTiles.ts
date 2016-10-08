import * as Sequelize from 'sequelize'
import { range } from 'global-mercator'
import { keys } from 'lodash'
import * as cheapRuler from 'cheap-ruler'
import * as zlib from 'zlib'
import * as turf from '@turf/turf'
import * as mercator from 'global-mercator'
import Tiles, {
  InterfaceTilesAttribute,
  InterfaceTilesInstance,
  InterfaceTilesModel } from './models/Tiles'
const Pbf = require('pbf')
const VectorTile = require('vector-tile').VectorTile

/**
 * Tile [x, y, z]
 */
export type Tile = [number, number, number]

function gunzip(data: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zlib.gunzip(data, (err, buffer) => {
      return resolve(buffer)
    })
  })
}

function parseVectorTile(data: Buffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const tile: any = new VectorTile(new Pbf(data))
    return resolve(tile)
  })
}

function readTileData(data: InterfaceTilesInstance): Buffer {
  if (!data) { throw new Error('Tile has no data') }
  return data.tile_data
}

function parseGeoJSON(vt: any, tile: Tile, area?: number) {
  const [x, y, z] = mercator.tileToGoogle(tile)
  const ruler = cheapRuler.fromTile(y, z, 'feet')
  const layerName = keys(vt.layers)[0]
  const layer = vt.layers[layerName]
  const collection = turf.featureCollection([])
  range(layer.length).map(i => {
    const geojson: GeoJSON.Feature<any> = layer.feature(i).toGeoJSON(x, y, z)
    if (geojson.geometry.type === 'Polygon') {
      if (area) {
        const calc = ruler.area(geojson.geometry.coordinates)
        if (area < calc) { collection.features.push(geojson) }
      } else { collection.features.push(geojson) }
    } else { collection.features.push(geojson) }
  })
  return collection
}

export function connect(uri: string) {
  const options = {
    define: { freezeTableName: true, timestamps: false },
    logging: false,
    pool: { idle: 10000, max: 5, min: 0 },
    storage: uri,
  }
  return new Sequelize(`sqlite://${ uri }`, options)
}

export default class MBTiles {
  public uri: string
  private sequelize: Sequelize.Sequelize
  private tilesSQL: InterfaceTilesModel

  constructor(uri: string) {
    this.uri = uri
    this.sequelize = connect(uri)
    this.tilesSQL = this.sequelize.define<InterfaceTilesInstance, InterfaceTilesAttribute>('tiles', Tiles)
  }
  /**
   * Retrieve Buffer from Tile [x, y, z]
   */
  public getTile(tile: Tile, area?: number) {
    const [x, y, z] = tile
    return this.tilesSQL.find({
      attributes: ['tile_data'],
      where: {
        zoom_level: z,
        tile_column: x,
        tile_row: y,
      },
    })
      .then(readTileData)
      .then(gunzip)
      .then(parseVectorTile)
      .then(vt => parseGeoJSON(vt, tile, area))
  }
}
