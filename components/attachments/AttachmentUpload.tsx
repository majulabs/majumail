"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, File, Image, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  attachmentId?: string;
}

interface AttachmentUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  className?: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "text/html",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const FILE_ICONS: Record<string, React.ElementType> = {
  "image/": Image,
  "text/": FileText,
  "application/pdf": FileText,
  default: File,
};

function getFileIcon(contentType: string) {
  for (const [prefix, icon] of Object.entries(FILE_ICONS)) {
    if (prefix !== "default" && contentType.startsWith(prefix)) {
      return icon;
    }
  }
  return FILE_ICONS.default;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentUpload({
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 10,
  className,
}: AttachmentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Sync files to parent via useEffect to avoid setState during render
  useEffect(() => {
    onFilesChange(files);
  }, [files, onFilesChange]);

  const uploadFile = async (uploadedFile: UploadedFile) => {
    const formData = new FormData();
    formData.append("file", uploadedFile.file);

    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id ? { ...f, status: "uploading" as const } : f
        )
      );

      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();

      // Update with success
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, status: "done" as const, progress: 100, attachmentId: data.attachment.id }
            : f
        )
      );
    } catch (error) {
      // Update with error
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, status: "error" as const, error: (error as Error).message }
            : f
        )
      );
    }
  };

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;

      const filesToAdd: UploadedFile[] = [];

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];

        // Check max files
        if (files.length + filesToAdd.length >= maxFiles) {
          break;
        }

        // Check file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          continue;
        }

        // Check file size
        if (file.size > maxSizeBytes) {
          continue;
        }

        filesToAdd.push({
          id: `${Date.now()}-${i}-${file.name}`,
          file,
          progress: 0,
          status: "pending",
        });
      }

      if (filesToAdd.length > 0) {
        setFiles((prev) => {
          const updatedFiles = [...prev, ...filesToAdd];
          // Start uploads after state update
          setTimeout(() => {
            filesToAdd.forEach((f) => uploadFile(f));
          }, 0);
          return updatedFiles;
        });
      }
    },
    [files.length, maxFiles, maxSizeBytes]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Drop files here or click to upload
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Max {maxSizeMB}MB per file · {maxFiles} files max
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile) => {
            const Icon = getFileIcon(uploadedFile.file.type);
            return (
              <div
                key={uploadedFile.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800",
                  uploadedFile.status === "error" && "bg-red-50 dark:bg-red-900/20"
                )}
              >
                <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(uploadedFile.file.size)}
                    {uploadedFile.error && (
                      <span className="text-red-500 ml-2">{uploadedFile.error}</span>
                    )}
                  </p>
                </div>
                {uploadedFile.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(uploadedFile.id);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}