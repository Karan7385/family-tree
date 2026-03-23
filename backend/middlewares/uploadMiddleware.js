import multer from "multer";
import { google } from "googleapis";
import stream from "stream";
import dotenv from "dotenv";

dotenv.config();

// 1. Multer Memory Configuration
// We don't save to 'uploads/', we keep it in RAM (buffer)
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
});

// 2. Google Drive Setup
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const authClient = new google.auth.JWT(
  process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  SCOPES,
);

const drive = google.drive({ version: "v3", auth: authClient });

// 3. The Reusable Upload Function
export const uploadToDrive = async (file) => {
  if (!file) return null;

  try {
    await authClient.authorize();

    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);

    const response = await drive.files.create({
      requestBody: {
        name: `family-member-${Date.now()}-${file.originalname}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: file.mimetype,
        body: bufferStream,
      },
      fields: "id",
    });

    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return response.data.id;
  } catch (error) {
    console.error("Google Drive Upload Error:", error);
    throw new Error("Failed to upload image to Google Drive");
  }
};
