import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    // Get environment variables
    const accessToken = process.env.AIRTABLE_ACCESS_TOKEN
    const baseId = process.env.AIRTABLE_BASE_ID
    const defaultTableName = process.env.AIRTABLE_TABLE_NAME

    if (!accessToken || !baseId) {
      return NextResponse.json(
        { error: "Missing Airtable credentials. Please set AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID." },
        { status: 500 },
      )
    }

    // Parse request body
    const body = await req.json()
    const { recordId, fields, tableName } = body

    if (!recordId) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 })
    }

    if (!fields || Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Use the provided table name or fall back to the environment variable
    const table = tableName || defaultTableName || "Tasks"

    // Make request to Airtable API
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Airtable API error:", errorData)
      return NextResponse.json(
        {
          error: `Airtable API error: ${response.status} ${response.statusText}`,
          details: errorData,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating Airtable record:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
