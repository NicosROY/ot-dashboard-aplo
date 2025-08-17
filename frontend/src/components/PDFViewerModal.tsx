import React, { useState } from 'react';

interface PDFViewerModalProps {
  url: string;
  onClose: () => void;
}

const getFileName = (url: string) => {
  try {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  } catch {
    return 'Document PDF';
  }
};

const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ url, onClose }) => {
  const [loading, setLoading] = useState(true);
  const fileName = getFileName(url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
              <div className="relative bg-white rounded-md shadow-sm w-full max-w-4xl mx-4 md:mx-0 md:w-4/5 lg:w-3/5 min-h-[60vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <div className="truncate font-semibold text-gray-800 text-base md:text-lg" title={fileName}>{fileName}</div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition"
            >
              Ouvrir dans un nouvel onglet
            </a>
            <button
              onClick={onClose}
              className="ml-2 text-gray-500 hover:text-red-500 text-2xl font-bold focus:outline-none"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>
        {/* PDF Content */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-b-2xl overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600 text-lg">Chargement du PDF...</span>
            </div>
          )}
          <iframe
            src={url}
            title="Aperçu PDF"
            width="100%"
            height="100%"
            className="h-[60vh] md:h-[70vh] w-full rounded-b-2xl border-none"
            style={{ minHeight: 400 }}
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
};

export default PDFViewerModal; 