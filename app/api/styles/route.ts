import { NextResponse } from "next/server";

let cachedStyles: unknown[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60;

export async function GET() {
  try {
    if (cachedStyles && Date.now() - cacheTime < CACHE_TTL) {
      return NextResponse.json(cachedStyles);
    }

    const res = await fetch(
      "https://backend.blockadelabs.com/api/v1/skybox/styles?model_version=3",
      {
        headers: { "x-api-key": process.env.BLOCKADE_LABS_API_KEY! },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not fetch styles" },
        { status: res.status }
      );
    }

    const data = await res.json();
    cachedStyles = data;
    cacheTime = Date.now();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Styles route error:", err);
    return NextResponse.json(
      { error: "Something went wrong fetching styles." },
      { status: 500 }
    );
  }
}
