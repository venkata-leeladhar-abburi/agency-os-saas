/** File uploads (architecture.md, Files): 25 MB per file in R1, and an allow-list of types. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'image/svg+xml': ['svg'],
  'text/plain': ['txt'],
  'text/csv': ['csv'],
  'application/zip': ['zip'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'video/mp4': ['mp4'],
  'application/figma': ['fig'],
};

/** Checks a file before upload; the message says what to do. */
export function checkUpload(name: string, mime: string, sizeBytes: number): string | null {
  if (!name.trim()) return 'The file needs a name.';
  if (sizeBytes <= 0) return 'This file is empty. Choose another one.';
  if (sizeBytes > MAX_FILE_BYTES)
    return 'Files can be up to 25 MB. Compress it or share a link instead.';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const exts = ALLOWED_FILE_TYPES[mime];
  if (!exts || !exts.includes(ext))
    return 'This type of file can’t be uploaded. Use PDF, images, Office files, CSV, ZIP or MP4.';
  return null;
}

/** Storage path: workspace first (storage RLS reads it), then the file id and a safe name. */
export function storagePath(workspaceId: string, fileId: string, name: string): string {
  const safe =
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/-\./g, '.')
      .replace(/^[-.]+|-+$/g, '')
      .slice(-80) || 'file';
  return `${workspaceId}/${fileId}/${safe}`;
}
