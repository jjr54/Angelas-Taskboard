import cloudinary from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Your Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY, // Your Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET, // Your Cloudinary API secret
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { screenshotBuffer, public_id } = req.body; // Assume screenshotBuffer is the image file, public_id is optional

      // Upload image to Cloudinary (you can pass 'public_id' to set a custom name)
      const uploadResult = await cloudinary.v2.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: public_id || `thumbnail-${Date.now()}`, // Optional custom public_id
        },
        async (error, result) => {
          if (error) {
            return res.status(500).json({ error: 'Failed to upload to Cloudinary' });
          }

          // Respond with the Cloudinary URL of the uploaded image
          return res.status(200).json({ imageUrl: result.secure_url });
        }
      );

      // Pipe the screenshotBuffer (assumed to be passed as a file buffer) to Cloudinary's upload stream
      screenshotBuffer.pipe(uploadResult);
    } catch (error) {
      res.status(500).json({ error: 'Error during upload to Cloudinary' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
