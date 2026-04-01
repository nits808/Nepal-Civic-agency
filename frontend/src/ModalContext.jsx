import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export function ModalProvider({ children }) {
  const [selectedArticle, setSelectedArticle] = useState(null);

  const openModal = (article) => {
    setSelectedArticle(article);
    // Prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedArticle(null);
    document.body.style.overflow = '';
  };

  return (
    <ModalContext.Provider value={{ selectedArticle, openModal, closeModal }}>
      {children}
      {selectedArticle && (
        <div className="article-modal-overlay" onClick={closeModal}>
          <div className="article-modal-content" onClick={e => e.stopPropagation()}>
            <button className="article-modal-close" onClick={closeModal}>&times;</button>
            <div
              className="article-modal-hero"
              style={selectedArticle.imageUrl
                ? { backgroundImage: `url(${selectedArticle.imageUrl})` }
                : { background: 'linear-gradient(135deg, rgba(0,56,147,0.2), rgba(220,20,60,0.08))' }
              }>
              <div className="article-modal-badge">{selectedArticle.category}</div>
            </div>
            <div className="article-modal-body">
              <h2 className="article-modal-title">{selectedArticle.title}</h2>
              <div className="article-modal-meta">
                <span>📰 {selectedArticle.source}</span>
                <span>📅 {selectedArticle.timeAgo}</span>
                <span>📍 {selectedArticle.district}, {selectedArticle.province}</span>
              </div>
              <p className="article-modal-desc">{selectedArticle.description}</p>
              
              <div className="article-modal-footer">
                <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer" className="read-full-btn">
                  Read Full Article &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}

