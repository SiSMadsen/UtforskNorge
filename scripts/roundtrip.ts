/**
 * Proves PostGIS geometry round-trips through the Drizzle layer:
 *   1. insert a POI (Point) and a road segment (LineString) with real coordinates
 *   2. read them back via Drizzle (exercises the EWKB -> GeoJSON decode)
 *   3. cross-check against PostGIS's own ST_X / ST_Y / ST_AsGeoJSON / ST_SRID
 *   4. clean up, so the script is safe to re-run
 *
 * Run with: npm run db:test
 */
import assert from 'node:assert/strict';

import { eq, sql } from 'drizzle-orm';

import { db, pool } from '../db';
import { pois, roadSegments } from '../db/schema';
import type { LineString, Point } from '../db/postgis';

// Vøringsfossen waterfall, Eidfjord — [lng, lat], GeoJSON order.
const WATERFALL: Point = { type: 'Point', coordinates: [7.2506, 60.4283] };

// A short stretch of the Aurlandsfjellet "Snow Road".
const SNOW_ROAD: LineString = {
  type: 'LineString',
  coordinates: [
    [7.1983, 60.898],
    [7.223, 60.9125],
    [7.256, 60.9204],
  ],
};

function approxEqual(a: number, b: number, epsilon = 1e-9) {
  return Math.abs(a - b) < epsilon;
}

async function main() {
  const [poi] = await db
    .insert(pois)
    .values({ title: 'Vøringsfossen', category: 'viewpoint', location: WATERFALL })
    .returning();

  const [segment] = await db
    .insert(roadSegments)
    .values({ title: 'Aurlandsfjellet (Snow Road)', path: SNOW_ROAD })
    .returning();

  try {
    // --- read back through Drizzle -------------------------------------------
    const [readPoi] = await db.select().from(pois).where(eq(pois.id, poi.id));
    const [readSegment] = await db
      .select()
      .from(roadSegments)
      .where(eq(roadSegments.id, segment.id));

    console.log('POI location read back via Drizzle :', JSON.stringify(readPoi.location));
    console.log('Segment path read back via Drizzle :', JSON.stringify(readSegment.path));

    assert.deepEqual(readPoi.location, WATERFALL, 'POI point did not round-trip');
    assert.deepEqual(readSegment.path, SNOW_ROAD, 'road segment line did not round-trip');

    // --- cross-check against PostGIS itself --------------------------------
    const { rows } = await db.execute(sql`
      select
        ST_SRID(${pois.location})       as srid,
        ST_X(${pois.location})          as x,
        ST_Y(${pois.location})          as y,
        ST_AsGeoJSON(${pois.location})  as geojson
      from ${pois}
      where ${pois.id} = ${poi.id}
    `);
    const check = rows[0] as { srid: number; x: number; y: number; geojson: string };

    console.log('PostGIS view of the same row      :', check);

    assert.equal(Number(check.srid), 4326, 'stored SRID is not 4326');
    assert.ok(approxEqual(Number(check.x), WATERFALL.coordinates[0]), 'longitude mismatch in PostGIS');
    assert.ok(approxEqual(Number(check.y), WATERFALL.coordinates[1]), 'latitude mismatch in PostGIS');
    assert.deepEqual(JSON.parse(check.geojson), WATERFALL, 'ST_AsGeoJSON disagrees with input');

    const { rows: segRows } = await db.execute(sql`
      select ST_SRID(${roadSegments.path}) as srid, ST_NPoints(${roadSegments.path}) as npoints
      from ${roadSegments} where ${roadSegments.id} = ${segment.id}
    `);
    assert.equal(Number(segRows[0].srid), 4326, 'road segment SRID is not 4326');
    assert.equal(Number(segRows[0].npoints), SNOW_ROAD.coordinates.length, 'vertex count changed');

    console.log('\n✅ geometry round-trips correctly (Point + LineString, SRID 4326)');
  } finally {
    await db.delete(pois).where(eq(pois.id, poi.id));
    await db.delete(roadSegments).where(eq(roadSegments.id, segment.id));
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\n❌ round-trip test failed\n', error);
  process.exit(1);
});
