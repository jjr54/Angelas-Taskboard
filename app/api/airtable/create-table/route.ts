import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

    // Check if environment variables are set
    if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
      console.error("Missing Airtable environment variables")
      return NextResponse.json({ error: "Server configuration error: Missing Airtable credentials" }, { status: 500 })
    }

    // Get the request body
    const body = await request.json()
    const { tableName } = body

    if (!tableName) {
      return NextResponse.json({ error: "Table name is required" }, { status: 400 })
    }

    // Define the table schema for task management
    const tableSchema = {
      name: tableName,
      description: "Task management for music composition projects",
      fields: [
        { name: "title", type: "singleLineText" },
        { name: "description", type: "multilineText" },
        {
          name: "status",
          type: "singleSelect",
          options: { choices: [{ name: "To Do" }, { name: "In Progress" }, { name: "Review" }, { name: "Complete" }] },
        },
        {
          name: "priority",
          type: "singleSelect",
          options: { choices: [{ name: "Low" }, { name: "Medium" }, { name: "High" }] },
        },
        {
          name: "type",
          type: "singleSelect",
          options: {
            choices: [
              { name: "Composition" },
              { name: "Arrangement" },
              { name: "Recording" },
              { name: "Mixing" },
              { name: "Review" },
            ],
          },
        },
        { name: "assignee_name", type: "singleLineText" },
        { name: "duration", type: "singleLineText" },
        {
          name: "instruments",
          type: "multipleSelects",
          options: {
            choices: [
              { name: "Piano" },
              { name: "Guitar" },
              { name: "Strings" },
              { name: "Drums" },
              { name: "Bass" },
              { name: "Vocals" },
              { name: "Synth" },
              { name: "Orchestra" },
            ],
          },
        },
        { name: "due_date", type: "date" },
        { name: "completed", type: "checkbox" },
        { name: "youtube_url", type: "url" },
        { name: "timestamp", type: "singleLineText" },
        { name: "screenshot_url", type: "url" },
      ],
    }

    // Create the table in Airtable
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tableSchema),
    })

    // Get the raw response for debugging
    const responseText = await response.text()
    console.log("Raw Airtable create table response:", responseText)

    // Try to parse the response
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("Error parsing Airtable response:", e)
      return NextResponse.json(
        {
          error: "Invalid JSON in Airtable response",
          details: (e as Error).message,
          rawResponse: responseText,
        },
        { status: 500 },
      )
    }

    if (!response.ok) {
      console.error(`Airtable API error: ${response.status} ${response.statusText}`, data)
      return NextResponse.json(
        {
          error: `Airtable API error: ${response.status} ${response.statusText}`,
          details: data,
        },
        { status: response.status },
      )
    }

    // Return the created table name
    return NextResponse.json({
      success: true,
      tableName: data.name || tableName,
      message: "Table created successfully",
    })
  } catch (error) {
    console.error("Error creating table:", error)
    return NextResponse.json(
      {
        error: "Failed to create table",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
