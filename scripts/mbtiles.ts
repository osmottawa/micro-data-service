import * as path from 'path'
import MBTiles, { Tile } from '../app/MBTiles'
import * as fs from 'fs'
const vtGeoJSON = require('vt-geojson')

const mbtiles = new MBTiles(path.join(__dirname, './ottawa-buildings.mbtiles'))

const tile: Tile = [1187, 2626, 12]
mbtiles.getTile(tile)
  .then(data => {
      console.log(data.features.length)
      fs.writeFileSync('vt-buildings2.json', JSON.stringify(data, null, 4))
    })
