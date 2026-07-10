'use client';

import { useEffect, useState } from 'react';
import './back-to-top-button.css';

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 500);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  return (
    <button
      type="button"
      className={`back-to-top-button ${isVisible ? 'is-visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
