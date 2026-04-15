import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Create minimal test files with correct magic bytes / content
 * so the upload component accepts them.
 */
function createTestFile(ext: string, fileName: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-upload-'));
  const filePath = path.join(dir, fileName);

  switch (ext) {
    case 'pdf':
      // Minimal PDF
      fs.writeFileSync(filePath, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
      break;
    case 'docx':
    case 'xlsx':
    case 'pptx':
      // ZIP-based Office files (PK magic bytes)
      fs.writeFileSync(filePath, Buffer.from('504b0304', 'hex'));
      break;
    case 'csv':
      fs.writeFileSync(filePath, 'name,value\ntest,1\n');
      break;
    case 'txt':
      fs.writeFileSync(filePath, 'Test content for upload verification.');
      break;
    case 'png':
      // Minimal PNG header
      fs.writeFileSync(filePath, Buffer.from('89504e470d0a1a0a', 'hex'));
      break;
    case 'jpg':
      // Minimal JPEG header
      fs.writeFileSync(filePath, Buffer.from('ffd8ffe0', 'hex'));
      break;
    default:
      fs.writeFileSync(filePath, 'test');
  }

  return filePath;
}

test.describe('File Upload Types', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.admin, TEST_PASSWORD);
  });

  const fileTypes = [
    { ext: 'pdf', name: 'test.pdf' },
    { ext: 'docx', name: 'test.docx' },
    { ext: 'xlsx', name: 'test.xlsx' },
    { ext: 'pptx', name: 'test.pptx' },
    { ext: 'csv', name: 'test.csv' },
    { ext: 'txt', name: 'test.txt' },
    { ext: 'png', name: 'test.png' },
    { ext: 'jpg', name: 'test.jpg' },
  ];

  for (const { ext, name } of fileTypes) {
    test(`accepts .${ext} files`, async ({ page }) => {
      await page.goto('/data-room');
      await page.waitForLoadState('networkidle');

      // Open upload modal
      const uploadButton = page.getByRole('button', { name: /Upload/i }).first();
      await uploadButton.click();
      await page.waitForTimeout(500);

      // Create test file and set on file input
      const filePath = createTestFile(ext, name);

      // Find the file input (may be hidden)
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(filePath);

      // Assert: no "unsupported" error visible
      const unsupportedError = page.locator('text=/[Uu]nsupported|[Nn]ot allowed|[Ii]nvalid file/i');
      await expect(unsupportedError).not.toBeVisible({ timeout: 3000 });

      // Clean up
      fs.unlinkSync(filePath);
    });
  }
});
