@AGENTS.md
# Norway POI Map

A website for documenting areas of outstanding beauty in Norway: 
hydropower stations, scenic roads, viewpoints, etc.

## Stack
- Next.js (App Router, TypeScript)
- PostgreSQL + PostGIS (via Docker locally, same in prod)
- Leaflet + Leaflet.draw for the map/admin drawing UI
- Kartverket WMTS tiles (Norwegian topo maps)
- Single-admin auth (session cookie, gated /admin routes)

## Data model
- pois: id, title, description, geometry (Point, 4326), category, created_at
- poi_images: id, poi_id, storage_path, caption, sort_order
- road_segments: id, title, description, geometry (LineString, 4326), created_at
- road_segment_images: same pattern as poi_images

## Conventions
- Use Drizzle ORM for DB access (better raw PostGIS geometry support than Prisma)
- Public routes show read-only map + POI details
- /admin routes require auth, allow creating/editing points and line segments
- Keep image storage behind an abstraction so we can swap disk storage for MinIO later
