import { NextResponse } from "next/server"
import puppeteer from "puppeteer-core"
import chrome from "@sparticuz/chromium"

export async function POST(request: Request) {
  try {
    const { videoId, timestamp = 0 } = await request.json()

    if (!videoId) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 })
    }

    // Use the provided videoId or default to the example video
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId || "nA8KmHC2Z-g"}`

    console.log(`Taking screenshot of ${youtubeUrl} at ${timestamp} seconds`)

    // Launch a headless browser
    const executablePath = await chrome.executablePath

    const browser = await puppeteer.launch({
      args: chrome.args,
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()

    // Set viewport size
    await page.setViewport({ width: 1280, height: 720 })

    // Navigate to YouTube
    await page.goto(youtubeUrl, { waitUntil: "networkidle2" })

    // Accept cookies if the dialog appears
    try {
      const cookieButton = await page.$("button.ytp-button[data-title-no-tooltip='Accept all']")
      if (cookieButton) {
        await cookieButton.click()
        await page.waitForTimeout(1000)
      }
    } catch (e) {
      console.log("No cookie dialog found or error clicking it:", e)
    }

    // Wait for the video player to load
    await page.waitForSelector(".html5-video-container", { timeout: 10000 })

    // Inject script to seek to the timestamp and pause
    await page.evaluate((ts) => {
      const video = document.querySelector("video")
      if (video) {
        video.currentTime = ts
        video.pause()
      }
    }, timestamp)

    // Wait a moment for the frame to render
    await page.waitForTimeout(1500)

    // Take a screenshot
    const screenshot = await page.screenshot({ type: "png", encoding: "base64" })

    // Close the browser
    await browser.close()

    // Return the screenshot as base64
    return NextResponse.json({
      success: true,
      screenshot: `data:image/png;base64,${screenshot}`,
      videoId,
      timestamp,
    })
  } catch (error) {
    console.error("Error taking YouTube screenshot:", error)
    return NextResponse.json(
      {
        error: "Failed to take screenshot",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
