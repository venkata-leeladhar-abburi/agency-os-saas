import { describe, expect, it } from 'vitest';
import { checkUpload, MAX_FILE_BYTES, storagePath } from './files';

describe('uploads', () => {
  it('accepts allowed types up to 25 MB', () => {
    expect(checkUpload('Brief.pdf', 'application/pdf', 1_000)).toBeNull();
    expect(checkUpload('logo.JPG', 'image/jpeg', MAX_FILE_BYTES)).toBeNull();
  });

  it('says what to do with files it refuses', () => {
    expect(checkUpload('big.pdf', 'application/pdf', MAX_FILE_BYTES + 1)).toBe(
      'Files can be up to 25 MB. Compress it or share a link instead.',
    );
    expect(checkUpload('run.exe', 'application/x-msdownload', 10)).toMatch(/can’t be uploaded/);
    expect(checkUpload('fake.pdf', 'image/png', 10)).toMatch(/can’t be uploaded/);
    expect(checkUpload('empty.txt', 'text/plain', 0)).toBe(
      'This file is empty. Choose another one.',
    );
    expect(checkUpload(' ', 'text/plain', 1)).toBe('The file needs a name.');
  });

  it('builds storage paths that start with the workspace', () => {
    expect(storagePath('ws1', 'f1', 'Café menu (final) v2.pdf')).toBe(
      'ws1/f1/Cafe-menu-final-v2.pdf',
    );
    expect(storagePath('ws1', 'f1', '../../etc/passwd')).toBe('ws1/f1/etc-passwd');
    expect(storagePath('ws1', 'f1', '***')).toBe('ws1/f1/file');
    expect(storagePath('ws1', 'f1', 'Wireframes v2 (final).pdf')).toBe(
      'ws1/f1/Wireframes-v2-final.pdf',
    );
  });
});
