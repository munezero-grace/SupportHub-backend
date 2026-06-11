import cloudinary from "../utils/cloudinary";
import fs from "fs/promises";

export async function uploadTicketFiles(files: Express.Multer.File[] | undefined): Promise<string[]> {
  const imageUrls: string[] = [];
  if (files && Array.isArray(files)) {
    for (const f of files) {
      try {
        const result = await cloudinary.uploader.upload(f.path, { folder: "tickets" });
        imageUrls.push(result.secure_url);
      } finally {
        await fs.unlink(f.path).catch(() => {});
      }
    }
  }
  return imageUrls;
}
