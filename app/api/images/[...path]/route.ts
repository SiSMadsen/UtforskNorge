import { getImage, isValidStoragePath } from "@/lib/storage";

type Params = { params: Promise<{ path: string[] }> };

// Public, unauthenticated — same access level as the POI / road-segment data.
export async function GET(_request: Request, { params }: Params) {
  const { path } = await params;
  const storagePath = path.join("/");

  if (!isValidStoragePath(storagePath)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const image = await getImage(storagePath);
  if (!image) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.data.length),
      // storagePath carries a random id, so a given URL is immutable.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
