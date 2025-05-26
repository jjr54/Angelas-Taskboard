import { NextResponse } from "next/server"

// GET all tasks
export async function GET(request: Request) {
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

    // Log environment variables for debugging (without exposing full token)
    console.log("Airtable credentials:", {
      baseId: AIRTABLE_BASE_ID,
      tableName: tableName,
      tokenPrefix: AIRTABLE_ACCESS_TOKEN.substring(0, 5) + "...",
    })

    const headers = {
      Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    }

    const apiUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`
    console.log(`Fetching from Airtable: ${apiUrl}`)

    const response = await fetch(apiUrl, {
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

    // Check if records exist
    if (!data.records) {
      console.error("Unexpected Airtable response format:", data)
      return NextResponse.json({ error: "Invalid response from Airtable", details: data }, { status: 500 })
    }

    // Transform Airtable records to match our Task interface
    const tasks = data.records.map((record: any) => ({
      id: record.id,
      title: record.fields.title || "",
      description: record.fields.description || "",
      assignee: {
        name: record.fields.assignee_name || "Unassigned",
        avatar: record.fields.assignee_avatar || "/placeholder.svg?height=32&width=32",
        initials: record.fields.assignee_initials || "UN",
      },
      dueDate: record.fields.due_date || "",
      priority: record.fields.priority?.toLowerCase() || "medium",
      type: record.fields.type?.toLowerCase().replace(/\s+/g, "") || "composition",
      duration: record.fields.duration || "",
      instruments: record.fields.instruments || [],
      status: record.fields.status?.toLowerCase().replace(/\s+/g, "") || "todo",
      completed: record.fields.completed || false,
      youtubeUrl: record.fields.youtube_url || "",
      timestamp: record.fields.timestamp || "",
      screenshotUrl: record.fields.screenshot_url || "",
    }))

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

    // Format the data for Airtable
    const airtableData = {
      fields: {
        title: body.title,
        description: body.description,
        assignee_name: body.assignee?.name,
        assignee_avatar: body.assignee?.avatar,
        assignee_initials: body.assignee?.initials,
        due_date: body.dueDate,
        priority: body.priority?.charAt(0).toUpperCase() + body.priority?.slice(1),
        type: body.type?.charAt(0).toUpperCase() + body.type?.slice(1),
        duration: body.duration,
        instruments: body.instruments,
        status: body.status
          ?.split("")
          .map((char: string, i: number) => (i === 0 || body.status[i - 1] === " " ? char.toUpperCase() : char))
          .join(""),
        completed: body.completed,
        youtube_url: body.youtubeUrl,
        timestamp: body.timestamp,
        screenshot_url: body.screenshotUrl,
      },
    }

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

    // Transform the Airtable response to match our Task interface
    const createdTask = {
      id: data.id,
      title: data.fields.title || body.title || "",
      description: data.fields.description || body.description || "",
      assignee: {
        name: data.fields.assignee_name || body.assignee?.name || "Unassigned",
        avatar: data.fields.assignee_avatar || body.assignee?.avatar || "/placeholder.svg?height=32&width=32",
        initials: data.fields.assignee_initials || body.assignee?.initials || "UN",
      },
      dueDate: data.fields.due_date || body.dueDate || "",
      priority: (data.fields.priority || body.priority || "medium").toLowerCase(),
      type: (data.fields.type || body.type || "composition").toLowerCase().replace(/\s+/g, ""),
      duration: data.fields.duration || body.duration || "",
      instruments: data.fields.instruments || body.instruments || [],
      status: (data.fields.status || body.status || "todo").toLowerCase().replace(/\s+/g, ""),
      completed: data.fields.completed || body.completed || false,
      youtubeUrl: data.fields.youtube_url || body.youtubeUrl || "",
      timestamp: data.fields.timestamp || body.timestamp || "",
      screenshotUrl: data.fields.screenshot_url || body.screenshotUrl || "",
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

// PATCH update task
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

    const headers = {
      Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    }

    const body = await request.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    const airtableData = {
      fields: {
        title: fields.title,
        description: fields.description,
        assignee_name: fields.assignee?.name,
        assignee_avatar: fields.assignee?.avatar,
        assignee_initials: fields.assignee?.initials,
        due_date: fields.dueDate,
        priority: fields.priority?.charAt(0).toUpperCase() + fields.priority?.slice(1),
        type: fields.type?.charAt(0).toUpperCase() + fields.type?.slice(1),
        duration: fields.duration,
        instruments: fields.instruments,
        status: fields.status
          ?.split("")
          .map((char: string, i: number) => (i === 0 || fields.status[i - 1] === " " ? char.toUpperCase() : char))
          .join(""),
        completed: fields.completed,
        youtube_url: fields.youtubeUrl,
        timestamp: fields.timestamp,
        screenshot_url: fields.screenshotUrl,
      },
    }

    const apiUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${id}`
    console.log(`Updating in Airtable: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify(airtableData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Airtable API error: ${response.status} ${response.statusText}`, errorText)
      return NextResponse.json(
        {
          error: `Airtable API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({ success: true, data })
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

// DELETE task
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

    const apiUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${taskId}`
    console.log(`Deleting from Airtable: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Airtable API error: ${response.status} ${response.statusText}`, errorText)
      return NextResponse.json(
        {
          error: `Airtable API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({ success: true, data })
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
