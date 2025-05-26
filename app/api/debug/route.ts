import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check which environment variables are set (without exposing values)
    const envStatus = {
      AIRTABLE_ACCESS_TOKEN: !!process.env.AIRTABLE_ACCESS_TOKEN,
      AIRTABLE_BASE_ID: !!process.env.AIRTABLE_BASE_ID,
      AIRTABLE_TABLE_NAME: !!process.env.AIRTABLE_TABLE_NAME,
      // Show first few characters of token for verification
      tokenPrefix: process.env.AIRTABLE_ACCESS_TOKEN
        ? process.env.AIRTABLE_ACCESS_TOKEN.substring(0, 5) + "..."
        : "not set",
    }

    return NextResponse.json({
      status: "ok",
      environment: envStatus,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
    })
  } catch (error) {
    console.error("Error in debug route:", error)
    return NextResponse.json(
      {
        error: "Debug route error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
