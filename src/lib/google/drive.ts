import { env } from "@/lib/env";
import { getDriveClient } from "@/lib/google/client";
import { Readable } from "stream";

export async function getDriveRootInfo() {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId: env.google.driveRootFolderId,
    fields: "id,name,mimeType,webViewLink",
    supportsAllDrives: true,
  });

  return {
    id: res.data.id || "",
    name: res.data.name || "",
    mimeType: res.data.mimeType || "",
    webViewLink: res.data.webViewLink || "",
  };
}

export async function ensureDriveFolder(name: string) {
  const drive = getDriveClient();
  const list = await drive.files.list({
    q: [
      "mimeType='application/vnd.google-apps.folder'",
      `name='${name.replace(/'/g, "\\'")}'`,
      `'${env.google.driveRootFolderId}' in parents`,
      "trashed=false",
    ].join(" and "),
    fields: "files(id,name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = list.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [env.google.driveRootFolderId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return created.data.id || env.google.driveRootFolderId;
}

export async function uploadBase64Image(dataUrl: string, subfolder: string, filename: string) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("รูปแบบไฟล์ภาพไม่ถูกต้อง");

  const mimeType = match[1];
  const extension = mimeType.split("/")[1].replace("jpeg", "jpg");
  const buffer = Buffer.from(match[2], "base64");
  const maxBytes = 5 * 1024 * 1024;
  if (buffer.length > maxBytes) throw new Error("ภาพต้องมีขนาดไม่เกิน 5 MB");

  const folderId = await ensureDriveFolder(subfolder || "uploads");
  const drive = getDriveClient();
  const file = await drive.files.create({
    requestBody: {
      name: `${filename}.${extension}`,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true,
  });

  const fileId = file.data.id || "";
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
  } catch {
    // Some Workspace policies disallow public links. The Drive URL still works for authorized users.
  }

  return {
    fileId,
    name: file.data.name || "",
    url: `https://lh3.googleusercontent.com/d/${fileId}=w600`,
    driveUrl: file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  };
}

export async function uploadBase64File(dataUrl: string, subfolder: string, filename: string) {
  const match = String(dataUrl || "").match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("รูปแบบไฟล์แนบไม่ถูกต้อง");

  const mimeType = match[1];
  const allowedTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);
  if (!allowedTypes.has(mimeType)) {
    throw new Error("ไฟล์แนบต้องเป็น PDF หรือรูปภาพเท่านั้น");
  }

  const extensionMap: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const extension = extensionMap[mimeType] || "bin";
  const buffer = Buffer.from(match[2], "base64");
  const maxBytes = 10 * 1024 * 1024;
  if (buffer.length > maxBytes) throw new Error("ไฟล์แนบต้องมีขนาดไม่เกิน 10 MB");

  const folderId = await ensureDriveFolder(subfolder || "uploads");
  const drive = getDriveClient();
  const file = await drive.files.create({
    requestBody: {
      name: `${filename}.${extension}`,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true,
  });

  const fileId = file.data.id || "";
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
  } catch {
    // Workspace policies may block public sharing; authorized Drive users can still open webViewLink.
  }

  const driveUrl = file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  return {
    fileId,
    name: file.data.name || "",
    mimeType,
    url: mimeType.startsWith("image/") ? `https://lh3.googleusercontent.com/d/${fileId}=w1200` : driveUrl,
    driveUrl,
  };
}

export function extractDriveFileId(url?: string) {
  if (!url) return "";
  const lh3 = String(url).match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3) return lh3[1];
  const drive = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (drive) return drive[1];
  return "";
}

export async function deleteDriveFile(fileId: string) {
  if (!fileId) return false;
  try {
    const drive = getDriveClient();
    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });
    return true;
  } catch {
    return false;
  }
}
