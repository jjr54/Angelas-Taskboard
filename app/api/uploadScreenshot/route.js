import { NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { base64Image, airtableRecordId } = body;

    if (!base64Image || !airtableRecordId) {
      return NextResponse.json(
        { error: 'Missing base64Image or airtableRecordId' },
        { status: 400 }
      );
    }

    // Step 1: Upload to Cloudinary
    const uploadResult = await cloudinary.v2.uploader.upload(base64Image, {
      folder: 'screenshots',
    });

    const imageUrl = uploadResult.secure_url;

    // Step 2: Update Airtable
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}/${airtableRecordId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Thumbnail: [{ url: imageUrl }],
          },
        }),
      }
    );

    const airtableData = await airtableRes.json();

    if (!airtableRes.ok) {
      return NextResponse.json(
        { error: 'Airtable update failed', details: airtableData },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      airtableRecord: airtableData,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
