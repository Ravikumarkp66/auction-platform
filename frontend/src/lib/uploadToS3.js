/**
 * uploadToS3 — uploads a file directly to S3 via pre-signed URL
 *
 * @param {File} file - The file to upload
 * @param {string} folder - S3 folder: 'players' | 'teams' | 'backgrounds'
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export async function uploadToS3(file, folder = "players") {
  const API = process.env.NEXT_PUBLIC_API_URL;

  // 1. Get pre-signed URL from backend
  const res = await fetch(
    `${API}/api/upload/get-upload-url?fileType=${encodeURIComponent(file.type)}&folder=${folder}`
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "S3 pre-sign failed");
  }

  const { uploadUrl, fileUrl } = await res.json();

  // 2. Upload directly to S3 (browser → S3, no backend in the middle)
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("S3 upload failed: " + uploadRes.statusText);
  }

  return fileUrl;
}
