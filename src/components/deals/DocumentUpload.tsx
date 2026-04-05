'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Upload, X } from 'lucide-react';
import UploadErrorBanner from '@/components/common/UploadErrorBanner';

interface UploadedFile {
  file: File;
  id: string;
  progress?: number;
  error?: string;
}

interface DocumentUploadProps {
  onFilesChange?: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  dealId?: string;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — aligned with AI scoring pipeline ceiling
const MAX_FILES = 5;

export function DocumentUpload({
  onFilesChange,
  maxFiles = MAX_FILES,
  maxSize = MAX_FILE_SIZE,
  acceptedTypes = ACCEPTED_TYPES,
  dealId,
}: DocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return 'Please upload a PDF, PowerPoint, or Word file. Other file types are not supported.';
    }

    if (file.size > maxSize) {
      return `This file is too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB. Try compressing your PDF or reducing the number of pages.`;
    }

    return null;
  };

  const handleFiles = async (files: FileList) => {
      setGlobalError(null);
      const newFiles: UploadedFile[] = [];
      let rejectedMessage: string | null = null;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check max files limit
        if (uploadedFiles.length + newFiles.length >= maxFiles) {
          rejectedMessage = `Maximum ${maxFiles} files allowed.`;
          break;
        }

        // Validate file — surface the first rejection as a persistent banner
        const error = validateFile(file);
        if (error) {
          if (!rejectedMessage) rejectedMessage = error;
          continue;
        }

        newFiles.push({
          file,
          id: `${file.name}-${Date.now()}`,
          progress: 0,
        });
      }

      if (rejectedMessage) setGlobalError(rejectedMessage);

      const allFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(allFiles);

      // Upload valid files if dealId is provided
      if (dealId) {
        for (const uf of newFiles) {
          if (!uf.error) {
            await uploadFile(uf);
          }
        }
      }

      // Notify parent component
      const validFiles = allFiles
        .filter((f) => !f.error)
        .map((f) => f.file);
      onFilesChange?.(validFiles);
    };

  const uploadFile = async (uploadedFile: UploadedFile) => {
    if (!dealId) return;

    try {
      // Upload directly to Supabase Storage from browser
      const storagePath = `${dealId}/${Date.now()}-${uploadedFile.file.name}`;
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, uploadedFile.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, error: 'Upload failed. Please check your connection and try again.' }
              : f
          )
        );
        return;
      }

      // Create document record via API
      const response = await fetch(`/api/deals/${dealId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadedFile.file.name,
          filePath: storagePath,
          fileSize: uploadedFile.file.size,
          mimeType: uploadedFile.file.type,
          documentType: 'other',
        }),
      });

      if (!response.ok) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, error: 'Upload failed. Please check your connection and try again.' }
              : f
          )
        );
        return;
      }

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, progress: 100 }
            : f
        )
      );
    } catch {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, error: 'Upload failed. Please try again.' }
            : f
        )
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    const newFiles = uploadedFiles.filter((f) => f.id !== fileId);
    setUploadedFiles(newFiles);
    onFilesChange?.(newFiles.filter((f) => !f.error).map((f) => f.file));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        <div className="space-y-2">
          <Upload className="h-8 w-8 mx-auto text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">
              Drag and drop your files here
            </p>
            <p className="text-sm text-gray-500">
              or click to browse
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Max file size: {(maxSize / 1024 / 1024).toFixed(0)}MB. Supported formats: PDF, PowerPoint, Word. Up to {maxFiles} files.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {globalError && (
        <UploadErrorBanner
          message={globalError}
          onDismiss={() => setGlobalError(null)}
        />
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                uploadedFile.error
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <FileText className={`h-5 w-5 flex-shrink-0 ${
                uploadedFile.error ? 'text-red-400' : 'text-blue-400'
              }`} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadedFile.file.name}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                  {uploadedFile.error && (
                    <p className="text-xs text-red-600">{uploadedFile.error}</p>
                  )}
                  {!uploadedFile.error && !dealId && (
                    <p className="text-xs text-green-600">Ready</p>
                  )}
                  {!uploadedFile.error && dealId && uploadedFile.progress !== undefined && uploadedFile.progress < 100 && (
                    <div className="flex-1 mx-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                  )}
                  {uploadedFile.progress === 100 && (
                    <p className="text-xs text-green-600">Uploaded</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeFile(uploadedFile.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                title="Remove file"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File Count */}
      {uploadedFiles.length > 0 && (
        <p className="text-xs text-gray-500">
          {uploadedFiles.filter((f) => !f.error).length} of {maxFiles} files
        </p>
      )}
    </div>
  );
}
