"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Upload, FileText, File, Calendar, HardDrive, Trash2 } from "lucide-react"
import { useState } from "react"
import { useDocumentStore } from "@/lib/document-store"

export default function DocumentList() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const { uploadedFiles, toggleFileCheck, handleFileUpload, deleteFile, selectedFilesCount } = useDocumentStore()

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleDeleteFile = (fileId: string, fileName: string) => {
    deleteFile(fileId)
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Document Library</h2>
        <div className="flex items-center space-x-3">
          {selectedFilesCount > 0 && (
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              {selectedFilesCount} selected
            </Badge>
          )}
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-blue-400" />
                  Upload Documents
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Upload PDF or DOCX files to start chatting with your documents
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => {
                      handleFileUpload(e)
                      setIsUploadModalOpen(false)
                    }}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full mb-4">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-lg font-medium text-white mb-2">Click to upload files</span>
                    <span className="text-sm text-gray-400">Supports PDF and DOCX formats</span>
                    <span className="text-xs text-gray-500 mt-2">Maximum file size: 10MB</span>
                  </label>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Documents Card */}
      <Card className="bg-gray-800/50 border-gray-700 flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-400" />
            Documents ({uploadedFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-6 pb-6">
            {uploadedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <File className="h-16 w-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No documents yet</h3>
                <p className="text-sm text-gray-500 mb-4">Upload your first document to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all group ${
                      file.checked
                        ? "bg-blue-500/20 border-blue-500/50"
                        : "bg-gray-700/30 border-gray-600 hover:bg-gray-700/50"
                    }`}
                  >
                    <Checkbox
                      checked={file.checked}
                      onCheckedChange={() => toggleFileCheck(file.id)}
                      className="border-gray-500"
                    />
                    <div
                      className="flex items-center space-x-3 flex-1 cursor-pointer min-w-0"
                      onClick={() => toggleFileCheck(file.id)}
                    >
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded flex-shrink-0">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{file.name}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-xs text-gray-400">
                            <HardDrive className="h-3 w-3 mr-1" />
                            {formatFileSize(file.size)}
                          </div>
                          <div className="flex items-center text-xs text-gray-400">
                            <Calendar className="h-3 w-3 mr-1" />
                            {file.uploadDate.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 hover:bg-red-500/10 p-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-800 border-gray-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white flex items-center">
                            <Trash2 className="h-5 w-5 mr-2 text-red-400" />
                            Delete Document
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to delete "{file.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteFile(file.id, file.name)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
