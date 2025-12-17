"use client";

import { useState, useEffect } from "react";

import { X } from "lucide-react";

export function WelcomeSplash() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if user has seen the splash before
    const hasSeenSplash = localStorage.getItem("legaloss-splash-seen");
    if (!hasSeenSplash) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    localStorage.setItem("legaloss-splash-seen", "true");
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/lincoln-memorial-night.jpg')",
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 z-10 rounded-full bg-white/10 p-2 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Content */}
      <div
        className={`relative z-10 max-w-2xl px-8 text-center transition-all duration-500 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Welcome Text */}
        <p className="mb-2 text-lg tracking-widest text-white/60 uppercase">Welcome to</p>

        {/* LegalOSS Title */}
        <h1
          className="mb-8 text-7xl tracking-tight text-white md:text-8xl"
          style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
        >
          LegalOSS
        </h1>

        {/* Quote */}
        <blockquote className="mb-8 border-l-2 border-white/30 pl-6 text-left">
          <p
            className="text-xl leading-relaxed text-white/90 md:text-2xl"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
          >
            "Equal justice under law is not merely a caption on the facade of the Supreme Court building, it is perhaps
            the most inspiring ideal of our society. It is one of the ends for which our entire legal system exists."
          </p>
          <footer className="mt-4 text-sm text-white/50">— Justice Lewis F. Powell Jr.</footer>
        </blockquote>

        {/* Subtitle */}
        <p className="text-base text-white/60">Open source legal AI infrastructure for the people.</p>

        {/* Click to continue hint */}
        <p className="mt-12 animate-pulse text-sm text-white/40">Click anywhere to continue</p>
      </div>
    </div>
  );
}
