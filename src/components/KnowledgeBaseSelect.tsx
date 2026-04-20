import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Link as LinkIcon, CheckCircle2, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface KnowledgeBaseDocument {
  id: string;
  name: string;
  type: 'file' | 'url';
}

interface KnowledgeBaseSelectProps {
  documents: KnowledgeBaseDocument[];
  selectedDocuments: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export const KnowledgeBaseSelect = ({
  documents,
  selectedDocuments,
  onSelectionChange,
}: KnowledgeBaseSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDocument = (docId: string) => {
    const newSelection = selectedDocuments.includes(docId)
      ? selectedDocuments.filter(id => id !== docId)
      : [...selectedDocuments, docId];
    onSelectionChange(newSelection);
  };

  return (
    <div className="relative">
      {/* Selected documents display */}
      <div 
        onClick={() => setIsOpen(true)}
        className={cn(
          "min-h-[2.5rem] p-3 rounded-lg border cursor-pointer transition-colors",
          isOpen
            ? "border-primary bg-primary-50/50 dark:border-primary-400 dark:bg-primary-400/10"
            : "border-gray-200 dark:border-dark-100 hover:border-primary/50 dark:hover:border-primary-400/50"
        )}
      >
        {selectedDocuments.length === 0 ? (
          <span className="text-gray-400 dark:text-gray-500">
            Select knowledge base documents...
          </span>
        ) : (
          <div className="flex flex-wrap gap-3">
            {selectedDocuments.map(id => {
              const doc = documents.find(d => d.id === id);
              if (!doc) return null;
              
              return (
                <div
                  key={id}
                  className="inline-flex items-center space-x-2 bg-primary/10 dark:bg-primary-400/10 text-primary dark:text-primary-400 px-3 py-1.5 rounded-lg text-sm"
                >
                  {doc.type === 'file' ? (
                    <FileText className="w-4 h-4" />
                  ) : (
                    <LinkIcon className="w-4 h-4" />
                  )}
                  <span className="truncate max-w-[200px]">{doc.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDocument(id);
                    }}
                    className="hover:text-primary-600 dark:hover:text-primary-300 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 right-0 mt-2 bg-white dark:bg-dark-200 rounded-lg shadow-lg border border-gray-100 dark:border-dark-100 overflow-hidden z-40"
            >
              {/* Search */}
              <div className="p-3 border-b border-gray-100 dark:border-dark-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-dark-100 rounded-lg border-0 focus:ring-1 focus:ring-primary dark:focus:ring-primary-400"
                  />
                </div>
              </div>

              {/* Documents list */}
              <div className="max-h-64 overflow-y-auto">
                {filteredDocuments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No documents found
                  </div>
                ) : (
                  filteredDocuments.map(doc => {
                    const isSelected = selectedDocuments.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocument(doc.id)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors",
                          isSelected
                            ? "bg-primary-50/50 dark:bg-primary-400/10"
                            : "hover:bg-gray-50 dark:hover:bg-dark-100"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          {doc.type === 'file' ? (
                            <FileText className="w-5 h-5 text-primary dark:text-primary-400" />
                          ) : (
                            <LinkIcon className="w-5 h-5 text-primary dark:text-primary-400" />
                          )}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {doc.name}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary dark:text-primary-400" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};