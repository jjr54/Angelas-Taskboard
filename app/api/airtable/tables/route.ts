import { NextResponse } from "next/server"

export async function GET() {
  try {
    const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

    // Check if environment variables are set
    if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
      console.error("Missing Airtable environment variables:", {
        hasToken: !!AIRTABLE_ACCESS_TOKEN,
        hasBaseId: !!AIRTABLE_BASE_ID,
      })
      return NextResponse.json({ error: "Server configuration error: Missing Airtable credentials" }, { status: 500 })
    }

    // Log environment variables for debugging (without exposing full token)
    console.log("Airtable credentials:", {
      baseId: AIRTABLE_BASE_ID,
      tokenPrefix: AIRTABLE_ACCESS_TOKEN.substring(0, 5) + "...",
    })

    const headers = {
      Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    }

    const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`
    console.log(`Fetching tables from Airtable: ${url}`)

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Airtable API error: ${response.status} ${response.statusText}`, errorText)

      // Additional debugging for auth errors
      if (response.status === 401 || response.status === 403) {
        console.error("Authentication error. Check your Airtable token and permissions.")
      }

      return NextResponse.json(
        {
          error: `Airtable API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    const tables = data.tables.map((table: any) => table.name)

    return NextResponse.json({ tables })
  } catch (error) {
    console.error("Error fetching tables:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch tables",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
