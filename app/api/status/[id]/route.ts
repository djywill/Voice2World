import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const res = await fetch(
      `https://backend.blockadelabs.com/api/v1/imagine/requests/${id}`,
      {
        headers: {
          "x-api-key": process.env.BLOCKADE_LABS_API_KEY!,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not check progress." },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data.request ?? data);
  } catch (err) {
    console.error("Status route error:", err);
    return NextResponse.json(
      { error: "Something went wrong checking progress." },
      { status: 500 }
    );
  }
}
