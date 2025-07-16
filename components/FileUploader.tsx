
import React, { useState, useRef } from 'react';
import { UploadCloudIcon, FileTextIcon } from './icons';

interface FileUploaderProps {
    onProcess: (files: FileList) => void;
    isProcessing: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onProcess, isProcessing }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFiles(Array.from(event.target.files));
        }
    };

    const handleProcessClick = () => {
        if (selectedFiles.length > 0 && fileInputRef.current?.files) {
            onProcess(fileInputRef.current.files);
            setSelectedFiles([]); // Clear after processing
        }
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    return (
        <div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept=".txt,.pdf"
                className="hidden"
                disabled={isProcessing}
            />
            <div 
                onClick={triggerFileSelect}
                className={`flex justify-center items-center w-full px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${isProcessing ? 'border-gray-600 bg-gray-800' : 'border-gray-500 hover:border-blue-400 hover:bg-gray-700/50'}`}
            >
                <div className="text-center">
                    <UploadCloudIcon className={`mx-auto h-12 w-12 ${isProcessing ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className="mt-2 text-sm text-gray-400">
                        <span className="font-semibold text-blue-400">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">Supported: .pdf, .txt (UTF-8 recommended)</p>
                </div>
            </div>

            {selectedFiles.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Selected files:</h4>
                    <ul className="space-y-2">
                        {selectedFiles.map((file, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-400 bg-gray-700/50 p-2 rounded-md">
                                <FileTextIcon className="h-5 w-5 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                                <span className="ml-auto text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <button
                onClick={handleProcessClick}
                disabled={isProcessing || selectedFiles.length === 0}
                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200"
            >
                {isProcessing ? 'Processing...' : 'Process Files into Knowledge Base'}
            </button>
        </div>
    );
};

export default FileUploader;
