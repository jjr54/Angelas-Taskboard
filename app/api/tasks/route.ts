import { NextResponse } from "next/server"

// Add the GET function to handle fetching tasks with better error handling
export async function GET(request: Request) {
  try {
    const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME

    // Get table name from query params or use default
    const url = new URL(request.url)
    const tableName = url.searchParams.get("table") || AIRTABLE_TABLE_NAME || "Tasks"
    const taskId = url.searchParams.get("id")

    // Check if environment variables are set
    if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
      console.error("Missing Airtable environment variables:", {
        hasToken: !!AIRTABLE_ACCESS_TOKEN,
        hasBaseId: !!AIRTABLE_BASE_ID,
      })
      return NextResponse.json({ error: "Server configuration error: Missing Airtable credentials" }, { status: 500 })
    }

    const headers = {
      Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    }

    // If taskId is provided, fetch a single task
    if (taskId) {
      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${taskId}`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        },
      )

      // Get the raw response for debugging
      const responseText = await response.text()
      console.log(`Airtable single task response for ${taskId}:`, responseText)

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
            rawResponse: responseText.substring(0, 500),
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

      // Transform the Airtable response to match our Task interface
      const task = transformAirtableRecord(data)
      return NextResponse.json(task)
    }

    // Fetch all tasks
    console.log(`Fetching all tasks from table: ${tableName}`)
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    // Get the raw response for debugging
    const responseText = await response.text()
    console.log("Raw Airtable response (first 500 chars):", responseText.substring(0, 500))

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
          rawResponse: responseText.substring(0, 500),
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

    // Check if records array exists
    if (!Array.isArray(data.records)) {
      console.error("Invalid Airtable response format - records is not an array:", data)
      return NextResponse.json(
        {
          error: "Invalid Airtable response format: records array is missing",
          details: data,
        },
        { status: 500 },
      )
    }

    // Transform the Airtable records to match our Task interface
    const tasks = data.records.map(transformAirtableRecord)

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// POST new task
export async function POST(request: Request) {
  try {
    const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME

    // Get table name from query params or use default
    const url = new URL(request.url)
    const tableName = url.searchParams.get("table") || AIRTABLE_TABLE_NAME || "Tasks"

    // Check if environment variables are set
    if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
      console.error("Missing Airtable environment variables:", {
        hasToken: !!AIRTABLE_ACCESS_TOKEN,
        hasBaseId: !!AIRTABLE_BASE_ID,
      })
      return NextResponse.json({ error: "Server configuration error: Missing Airtable credentials" }, { status: 500 })
    }

    const headers = {
      Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    }

    // Get the request body
    const requestText = await request.text()
    console.log("Raw request body:", requestText)

    // Parse the request body
    let body
    try {
      body = JSON.parse(requestText)
    } catch (e) {
      console.error("Error parsing request body:", e)
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: (e as Error).message },
        { status: 400 },
      )
    }

    console.log("Creating task with data:", body)

    // Create a fields object with only the fields that have values
    // This makes the API more resilient to missing fields in Airtable
    const fields: Record<string, any> = {}

    // Basic fields that should exist in most Airtable tables
    if (body.title) fields.title = body.title
    if (body.description) fields.description = body.description
    if (body.status) {
      fields.status = body.status
        .split("")
        .map((char: string, i: number) => (i === 0 || body.status[i - 1] === " " ? char.toUpperCase() : char))
        .join("")
    }

    // Optional fields - only add if they exist in the request
    if (body.priority) fields.priority = body.priority.charAt(0).toUpperCase() + body.priority.slice(1)
    if (body.type) fields.type = body.type.charAt(0).toUpperCase() + body.type.slice(1)
    if (body.duration) fields.duration = body.duration
    if (body.instruments) fields.instruments = body.instruments
    if (body.completed !== undefined) fields.completed = body.completed
    if (body.dueDate) fields.due_date = body.dueDate

const body = await request.json();
const { title, description, duration, ...rest } = body;

// Convert duration from minutes (or string input) to seconds
let durationInSeconds = 0;
if (duration) {
  const parsed = parseFloat(duration);
  if (!isNaN(parsed)) {
    durationInSeconds = Math.round(parsed * 60); // e.g. 30 minutes → 1800 seconds
  }
}

const airtableResponse = await fetch(
  `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        title,
        description,
        duration: durationInSeconds,
        ...rest,
      },
    }),
  }
);


    // Assignee fields - only add if they exist and are properly structured
    if (body.assignee) {
      if (body.assignee.name) fields.assignee_name = body.assignee.name
      // Only include these if your Airtable has these fields
      // if (body.assignee.avatar) fields.assignee_avatar = body.assignee.avatar
      // if (body.assignee.initials) fields.assignee_initials = body.assignee.initials
    }

    const airtableData = { fields }
    console.log("Formatted Airtable data:", airtableData)

    const apiUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`
    console.log(`Posting to Airtable: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(airtableData),
    })

    // Get the raw response for debugging
    const responseText = await response.text()
    console.log("Raw Airtable response:", responseText)

    // Parse the response
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

    console.log("Successfully created task:", data)

    // Add the created task to the UI
    const createdTask = {
      id: data.id,
      title: data.fields.title || body.title || "",
      description: data.fields.description || body.description || "",
      assignee: {
        name: data.fields.assignee_name || body.assignee?.name || "Unassigned",
      },
    }

    // Return the created task with the Airtable ID
    return NextResponse.json(createdTask)
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      {
        error: "Failed to create task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Add the DELETE function to handle task deletion
export async function DELETE(request: Request) {
  try {
    const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME

    // Get table name and task ID from query params
    const url = new URL(request.url)
    const tableName = url.searchParams.get("table") || AIRTABLE_TABLE_NAME || "Tasks"
    const taskId = url.searchParams.get("id")

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    // Check if environment variables are set
    if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
      console.error("Missing Airtable environment variables")
      return NextResponse.json({ error: "Server configuration error: Missing Airtable credentials" }, { status: 500 })
    }

    const headers = {
      Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    }

    console.log(`Deleting task ${taskId} from table ${tableName}`)
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${taskId}`,
      {
        method: "DELETE",
        headers,
      },
    )

    // Get the raw response for debugging
    const responseText = await response.text()
    console.log(`Airtable delete response for ${taskId}:`, responseText)

    // Try to parse the response if it's not empty
    let data = {}
    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error("Error parsing Airtable delete response:", e)
      }
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

    return NextResponse.json({ success: true, id: taskId })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      {
        error: "Failed to delete task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Add the PATCH function to handle task updates
export async function PATCH(request: Request) {
  try {
    const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME

    // Get table name from query params or use default
    const url = new URL(request.url)
    const tableName = url.searchParams.get("table") || AIRTABLE_TABLE_NAME || "Tasks"

    // Check if environment variables are set
    if (!AIRTABLE_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
      console.error("Missing Airtable environment variables")
      return NextResponse.json({ error: "Server configuration error: Missing Airtable credentials" }, { status: 500 })
    }

    // Get the request body
    const requestText = await request.text()
    console.log("Raw update request body:", requestText)

    // Parse the request body
    let body
    try {
      body = JSON.parse(requestText)
    } catch (e) {
      console.error("Error parsing request body:", e)
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: (e as Error).message },
        { status: 400 },
      )
    }

    if (!body.id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    console.log("Updating task with data:", body)

    // Create a fields object with only the fields that have values
    const fields: Record<string, any> = {}

    // Basic fields that should exist in most Airtable tables
    if (body.title) fields.title = body.title
    if (body.description) fields.description = body.description
    if (body.status) {
      fields.status = body.status
        .split("")
        .map((char: string, i: number) => (i === 0 || body.status[i - 1] === " " ? char.toUpperCase() : char))
        .join("")
    }

    // Optional fields - only add if they exist in the request
    if (body.priority) fields.priority = body.priority.charAt(0).toUpperCase() + body.priority.slice(1)
    if (body.type) fields.type = body.type.charAt(0).toUpperCase() + body.type.slice(1)
    if (body.duration) fields.duration = body.duration
    if (body.instruments) fields.instruments = body.instruments
    if (body.completed !== undefined) fields.completed = body.completed
    if (body.dueDate) fields.due_date = body.dueDate

    // YouTube related fields
    if (body.youtubeUrl) fields.youtube_url = body.youtubeUrl
    if (body.timestamp) fields.timestamp = body.timestamp
    if (body.screenshotUrl) fields.screenshot_url = body.screenshotUrl

    // Assignee fields - only add if they exist and are properly structured
    if (body.assignee && body.assignee.name) fields.assignee_name = body.assignee.name

    const airtableData = { fields }
    console.log("Formatted Airtable update data:", airtableData)

    const headers = {
      Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${body.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(airtableData),
      },
    )

    // Get the raw response for debugging
    const responseText = await response.text()
    console.log("Raw Airtable update response:", responseText)

    // Try to parse the response
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("Error parsing Airtable update response:", e)
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

    // Transform the Airtable response to match our Task interface
    const updatedTask = transformAirtableRecord(data)
    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      {
        error: "Failed to update task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Helper function to transform Airtable records to our Task format
function transformAirtableRecord(record: any) {
  return {
    id: record.id,
    title: record.fields.title || "",
    description: record.fields.description || "",
    assignee: {
      name: record.fields.assignee_name || "Unassigned",
    },
    dueDate: record.fields.due_date || "",
    priority: (record.fields.priority || "medium").toLowerCase(),
    type: (record.fields.type || "composition").toLowerCase().replace(/\s+/g, ""),
    duration: typeof record.fields.duration === "number" ? record.fields.duration : null,
    instruments: record.fields.instruments || [],
    status: (record.fields.status || "todo").toLowerCase().replace(/\s+/g, ""),
    completed: record.fields.completed || false,
    youtubeUrl: record.fields.youtube_url || "",
    timestamp: record.fields.timestamp || "",
    screenshotUrl: record.fields.screenshot_url || "",
  }
}
