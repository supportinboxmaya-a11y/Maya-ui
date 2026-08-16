import type { PromptFileAttachment } from "@/lib/api";

export interface PendingAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** Object URL for preview in the composer (revoked after send). */
  previewUrl?: string;
  dataUri?: string;
}

function readFileAsDataURI(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Max payload size we will inline as a data: URI (8 MB). Larger files are
 *  still attached as metadata but may be rejected by the backend limit. */
const MAX_INLINE_BYTES = 8 * 1024 * 1024;

export async function fileToAttachment(file: File): Promise<PendingAttachment> {
  const dataUri = await readFileAsDataURI(file);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name || "attachment",
    mime: file.type || "application/octet-stream",
    size: file.size,
    previewUrl:
      file.type.startsWith("image/") || file.type.startsWith("video/")
        ? URL.createObjectURL(file)
        : undefined,
    dataUri: file.size <= MAX_INLINE_BYTES ? dataUri : undefined,
  };
}

export function attachmentToPromptFile(
  attachment: PendingAttachment,
): PromptFileAttachment | null {
  if (!attachment.dataUri) return null;
  return {
    uri: attachment.dataUri,
    mime: attachment.mime,
    name: attachment.name,
  };
}
