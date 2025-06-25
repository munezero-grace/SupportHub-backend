import cloudinary from "../utils/cloudinary";

export async function uploadTicketFiles(files: Express.Multer.File[] | undefined): Promise<string[]> {
  const imageUrls: string[] = [];
  if (files && Array.isArray(files)) {
    for (const f of files) {
      const result = await cloudinary.uploader.upload(f.path, { folder: "tickets" });
      imageUrls.push(result.secure_url);
    }
  }
  return imageUrls;
}
