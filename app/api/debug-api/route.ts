import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Get the API endpoint to test from query params
    const url = new URL(request.url)
    const endpoint = url.searchParams.get("endpoint") || "tasks"
    const table = url.searchParams.get("table") || process.env.AIRTABLE_TABLE_NAME || "Tasks"

    // Check environment variables
    const envStatus = {
      AIRTABLE_ACCESS_TOKEN: process.env.AIRTABLE_ACCESS_TOKEN
        ? "Set (first 5 chars: " + process.env.AIRTABLE_ACCESS_TOKEN.substring(0, 5) + "...)"
        : "Not set",
      AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || "Not set",
      AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME || "Not set",
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "Not set",
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? "Set" : "Not set",
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? "Set" : "Not set",
    }

    // Test the API endpoint
    let apiTest = { status: "not_tested" }

    if (endpoint === "tasks") {
      try {
        // Make a direct request to Airtable to test connectivity
        const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

        if (AIRTABLE_ACCESS_TOKEN && AIRTABLE_BASE_ID) {
          const headers = {
            Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          }

          const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`
          console.log(`Testing direct Airtable connection to: ${airtableUrl}`)

          const response = await fetch(airtableUrl, {
            method: "GET",
            headers,
            cache: "no-store",
          })

          const responseText = await response.text()

          apiTest = {
            status: response.ok ? "success" : "error",
            statusCode: response.status,
            statusText: response.statusText,
            url: airtableUrl,
            responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? "..." : ""),
            isValidJson: (() => {
              try {
                JSON.parse(responseText)
                return true
              } catch (e) {
                return false
              }
            })(),
          }
        }
      } catch (error) {
        apiTest = {
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      environment: envStatus,
      apiTest,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
    })
  } catch (error) {
    console.error("Error in debug-api route:", error)
    return NextResponse.json(
      {
        error: "Debug API route error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
