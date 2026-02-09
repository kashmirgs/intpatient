import React, { useRef, useState, useCallback } from 'react'

interface FileUploaderProps {
  acceptedTypes: string[]
  multiple: boolean
  onFilesSelected: (files: File[]) => void
  maxSizeMB: number
}

export default function FileUploader({
  acceptedTypes,
  multiple,
  onFilesSelected,
  maxSizeMB,
}: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFiles = useCallback(
    (fileList: FileList | File[]): File[] => {
      const validFiles: File[] = []
      const maxBytes = maxSizeMB * 1024 * 1024

      for (const file of Array.from(fileList)) {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!acceptedTypes.includes(ext)) {
          setError(
            `"${file.name}" desteklenmeyen dosya tipi. Kabul edilen: ${acceptedTypes.join(', ')}`
          )
          return []
        }
        if (file.size > maxBytes) {
          setError(
            `"${file.name}" dosya boyutu ${maxSizeMB}MB limitini aşıyor.`
          )
          return []
        }
        validFiles.push(file)
      }

      setError(null)
      return validFiles
    },
    [acceptedTypes, maxSizeMB]
  )

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const validated = validateFiles(fileList)
      if (validated.length === 0) return

      const newFiles = multiple ? [...files, ...validated] : validated
      setFiles(newFiles)
      onFilesSelected(newFiles)
    },
    [files, multiple, onFilesSelected, validateFiles]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files)
      }
    },
    [handleFiles]
  )

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index)
      setFiles(newFiles)
      onFilesSelected(newFiles)
    },
    [files, onFilesSelected]
  )

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div>
      <div
        style={{
          ...styles.dropzone,
          ...(dragActive ? styles.dropzoneActive : {}),
        }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <div style={styles.dropzoneIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7e79b8" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p style={styles.dropzoneText}>
          Dosyaları sürükleyip bırakın veya tıklayarak seçin
        </p>
        <p style={styles.dropzoneHint}>
          Kabul edilen: {acceptedTypes.join(', ')} (Maks. {maxSizeMB}MB)
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {files.length > 0 && (
        <div style={styles.fileList}>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} style={styles.fileItem}>
              <div style={styles.fileInfo}>
                <span style={styles.fileName}>{file.name}</span>
                <span style={styles.fileSize}>{formatSize(file.size)}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
                style={styles.removeBtn}
                title="Kaldır"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  dropzone: {
    border: '2px dashed #d0d0e0',
    borderRadius: '12px',
    padding: '40px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: '#fafaff',
  },
  dropzoneActive: {
    borderColor: '#7e79b8',
    background: 'rgba(126, 121, 184, 0.06)',
  },
  dropzoneIcon: {
    marginBottom: '12px',
  },
  dropzoneText: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#2d2d3d',
    marginBottom: '6px',
  },
  dropzoneHint: {
    fontSize: '13px',
    color: '#6b6b80',
  },
  error: {
    marginTop: '8px',
    padding: '10px 14px',
    background: 'rgba(244, 67, 54, 0.08)',
    color: '#f44336',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
  },
  fileList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: '#fff',
    border: '1px solid #e0e0eb',
    borderRadius: '8px',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  fileName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#2d2d3d',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileSize: {
    fontSize: '12px',
    color: '#6b6b80',
    flexShrink: 0,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
}
