import * as Sequelize from 'sequelize'
import { BLOB, INTEGER, DefineAttributes } from 'sequelize'

/**
 * Tiles Interface for MBTiles SQL Model
 */
export interface InterfaceTilesAttribute {
  zoom_level: number,
  tile_column: number,
  tile_row: number,
  tile_data?: Buffer,
}

/**
 * Tiles Instance for MBTiles SQL Model
 */
export interface InterfaceTilesInstance extends Sequelize.Instance<InterfaceTilesAttribute>, InterfaceTilesAttribute { }

/**
 * Tiles Model for MBTiles SQL Model
 */
export interface InterfaceTilesModel extends Sequelize.Model<InterfaceTilesInstance, InterfaceTilesAttribute> { }

/**
 * Tiles Scheme for MBTiles SQL Model
 */
const scheme: DefineAttributes = {
  zoom_level: { type: INTEGER },
  tile_column: { type: INTEGER },
  tile_row: { type: INTEGER },
  tile_data: { type: BLOB },
}

export default scheme
