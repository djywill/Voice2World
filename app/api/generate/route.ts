import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Please describe a world to create!" },
        { status: 400 }
      );
    }

    const res = await fetch(
      "https://backend.blockadelabs.com/api/v1/skybox",
      {
        method: "POST",
        headers: {
          "x-api-key": process.env.BLOCKADE_LABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Blockade Labs error:", res.status, text);
      return NextResponse.json(
        { error: "Could not start creating your world. Try again!" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Generate route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Let's try again!" },
      { status: 500 }
    );
  }
}
