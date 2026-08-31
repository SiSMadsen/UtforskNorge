import { customType } from 'drizzle-orm/pg-core';

/**
 * App-side representations of the two PostGIS geometry shapes this project
 * stores. They are deliberately GeoJSON-compatible (`[lng, lat]` order, matching
 * GeoJSON / Leaflet's `L.geoJSON`), so they can be handed straight to the map
 * layer later without translation.
 */
export type Point = { type: 'Point'; coordinates: [number, number] };
export type LineString = { type: 'LineString'; coordinates: [number, number][] };

/**
 * PostGIS returns geometry values to node-postgres as hex-encoded EWKB (there is
 * no wire-level type parser for `geometry`). We only ever persist 2D Point /
 * LineString in SRID 4326, so this parser only needs to cover those two cases.
 */
function parseEwkb(hex: string): Point | LineString {
  const buf = Buffer.from(hex, 'hex');
  let offset = 0;

  const littleEndian = buf.readUInt8(offset) === 1;
  offset += 1;

  const readUInt32 = () => {
    const value = littleEndian ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
    offset += 4;
    return value;
  };
  const readFloat64 = () => {
    const value = littleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
    offset += 8;
    return value;
  };

  const typeWithFlags = readUInt32();
  const hasSrid = (typeWithFlags & 0x20000000) !== 0;
  const geomType = typeWithFlags & 0xffff;
  if (hasSrid) readUInt32(); // SRID — always 4326 here, so just consume it

  if (geomType === 1) {
    return { type: 'Point', coordinates: [readFloat64(), readFloat64()] };
  }
  if (geomType === 2) {
    const pointCount = readUInt32();
    const coordinates: [number, number][] = [];
    for (let i = 0; i < pointCount; i++) {
      coordinates.push([readFloat64(), readFloat64()]);
    }
    return { type: 'LineString', coordinates };
  }
  throw new Error(`Unsupported PostGIS geometry type code: ${geomType}`);
}

const pointToEwkt = (g: Point) => `SRID=4326;POINT(${g.coordinates[0]} ${g.coordinates[1]})`;
const lineStringToEwkt = (g: LineString) =>
  `SRID=4326;LINESTRING(${g.coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(', ')})`;

/**
 * `geometry(Point,4326)` column. On write we send EWKT text, which PostGIS casts
 * to `geometry` implicitly in assignment context; on read we decode the EWKB
 * hex back into a `Point`.
 */
export const pointGeometry = customType<{ data: Point; driverData: string }>({
  dataType() {
    return 'geometry(Point,4326)';
  },
  toDriver(value) {
    return pointToEwkt(value);
  },
  fromDriver(value) {
    return parseEwkb(value) as Point;
  },
});

/** `geometry(LineString,4326)` column. Same round-trip strategy as {@link pointGeometry}. */
export const lineStringGeometry = customType<{ data: LineString; driverData: string }>({
  dataType() {
    return 'geometry(LineString,4326)';
  },
  toDriver(value) {
    return lineStringToEwkt(value);
  },
  fromDriver(value) {
    return parseEwkb(value) as LineString;
  },
});
