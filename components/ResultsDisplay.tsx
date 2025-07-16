
import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Source, DocumentChunk, ChatTurn } from '../types';
import { LinkIcon, DatabaseIcon, CopyIcon, DownloadIcon, AppTitle, SparklesIcon } from './icons';

// A simple markdown-to-html renderer
const renderMarkdown = (text: string) => {
  let html = text
    .replace(/</g, "&lt;").replace(/>/g, "&gt;") // Escape HTML tags
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-900 text-sm font-mono rounded px-1 py-0.5">$1</code>')
    .replace(/\n/g, '<br />');
  
  return html;
};

const ModelResponse: React.FC<{ turn: ChatTurn }> = ({ turn }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const responseContentRef = useRef<HTMLDivElement>(null);

    const handleCopy = () => {
        if (responseContentRef.current) {
            navigator.clipboard.writeText(turn.text).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            });
        }
    };

    const handleDownloadPdf = async () => {
        if (responseContentRef.current) {
            setIsDownloading(true);
            try {
                const canvas = await html2canvas(responseContentRef.current, {
                    backgroundColor: '#1a1a1a', // bg-gray-900
                    scale: 2,
                });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`Agentic-RAG-Response-${turn.id}.pdf`);
            } catch (error) {
                console.error("Failed to generate PDF:", error);
            } finally {
                setIsDownloading(false);
            }
        }
    };

    return (
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-teal-400 flex items-center justify-center">
                <AppTitle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-grow bg-gray-800/70 rounded-lg rounded-tl-none p-4">
                <div ref={responseContentRef}>
                    <div 
                        className="prose prose-invert text-gray-300 max-w-none" 
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(turn.text) }}
                    />

                    {turn.retrievedChunks && turn.retrievedChunks.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-700/50">
                            <h3 className="text-md font-semibold mb-3 text-gray-300 flex items-center gap-2">
                                <DatabaseIcon className="w-5 h-5"/>
                                Context from Your Documents
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 text-sm">
                                {turn.retrievedChunks.map((chunk, index) => (
                                    <div key={index} className="p-2 bg-gray-900/60 rounded-lg">
                                        <p className="text-xs text-gray-400 font-semibold mb-1">Source: <span className="font-normal">{chunk.sourceFile} (Chunk {chunk.id.split('-').pop()})</span></p>
                                        <p className="text-xs text-gray-300 font-mono bg-gray-800 p-2 rounded">
                                           "{chunk.content.substring(0, 100)}..."
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {turn.sources && turn.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                            <h3 className="text-md font-semibold mb-3 text-gray-300">Web Sources</h3>
                            <ul className="space-y-1.5 text-sm">
                                {turn.sources.map((source, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <LinkIcon className="text-gray-500 flex-shrink-0" />
                                        <a
                                            href={source.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 hover:underline text-xs truncate"
                                            title={source.uri}
                                        >
                                            {source.title || source.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                 <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/50">
                    <button
                        onClick={handleCopy}
                        disabled={isCopied}
                        className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-1 rounded-md transition-all duration-200 disabled:bg-green-800/50 disabled:text-green-300"
                        title="Copy response to clipboard"
                    >
                        <CopyIcon className="w-3.5 h-3.5"/>
                        {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-1 rounded-md transition-all duration-200 disabled:bg-gray-500"
                        title="Download response as PDF"
                    >
                        <DownloadIcon className="w-3.5 h-3.5"/>
                        {isDownloading ? 'Downloading...' : 'Download'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const UserMessage: React.FC<{ turn: ChatTurn }> = ({ turn }) => {
    return (
        <div className="flex items-start gap-4 justify-end">
             <div className="flex-grow bg-blue-900/60 rounded-lg rounded-br-none p-4 max-w-xl">
                 <p className="text-gray-200">{turn.text}</p>
             </div>
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                 <SparklesIcon className="w-5 h-5 text-blue-300" />
            </div>
        </div>
    )
};


interface ResultsDisplayProps {
  chatHistory: ChatTurn[];
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ chatHistory }) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);
    
    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-lg flex-grow min-h-[60vh] flex flex-col p-4">
            <div ref={chatContainerRef} className="flex-grow space-y-6 overflow-y-auto pr-2">
                {chatHistory.map((turn) => (
                    <div key={turn.id} className="animate-fade-in">
                        {turn.role === 'user' ? <UserMessage turn={turn} /> : <ModelResponse turn={turn} />}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResultsDisplay;
