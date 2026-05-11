import { supabase } from "./supabase";

const BUCKET = "vehicle-images";

/**
 * Upload an image file to Supabase Storage.
 * Returns the public URL on success, or an error message on failure.
 */
export async function uploadVehicleImage(file: File): Promise<{ url?: string; error?: string }> {
  // Create a unique filename
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload failed:", error.message);
    return { error: error.message };
  }

  // Get the public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return { url: data.publicUrl };
}

/**
 * Delete an image from Supabase Storage by its URL.
 */
export async function deleteVehicleImage(url: string): Promise<void> {
  try {
    const parts = url.split(`/${BUCKET}/`);
    if (parts.length < 2) return;
    const path = parts[1];
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (e) {
    console.error("Delete failed:", e);
  }
}
