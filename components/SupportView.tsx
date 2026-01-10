import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { CURRENT_VERSION } from '../utils/version';

const SUPPORT_EMAIL = 'thethirteengame@gmail.com';

export const SupportView: React.FC = () => {
  const navigate = useNavigate();

  // Set meta title for SEO
  useEffect(() => {
    document.title = 'Support & Feedback | Thirteen';
    
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Cleanup: restore default title when component unmounts
    return () => {
      document.title = 'Thirteen';
    };
  }, []);

  const handleEmailSupport = async () => {
    const subject = encodeURIComponent(`Support Request - App Version ${CURRENT_VERSION}`);
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;

    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor App plugin for native platforms
        await App.openUrl({ url: mailtoUrl });
      } else {
        // Use window.location for web
        window.location.href = mailtoUrl;
      }
    } catch (error) {
      console.error('Error opening email client:', error);
      // Fallback: copy email to clipboard or show in alert
      alert(`Please email us at: ${SUPPORT_EMAIL}\n\nSubject: ${decodeURIComponent(subject)}`);
    }
  };

  const faqItems = [
    {
      question: 'How do I report a bug?',
      answer: 'You can report bugs directly from the app by going to Settings > Support & Feedback, or by emailing us at ' + SUPPORT_EMAIL + '. Please include as much detail as possible about the issue, including your device model and app version.'
    },
    {
      question: 'How long does it take to get a response?',
      answer: 'We typically respond to support requests within 24-48 hours. For urgent issues, please mark your message as "Bug Report" and include "URGENT" in the subject line.'
    },
    {
      question: 'I have a billing issue. What should I do?',
      answer: 'For billing-related questions or issues, please select "Billing Issue" when submitting a support ticket through the app, or email us directly at ' + SUPPORT_EMAIL + ' with your purchase receipt details.'
    },
    {
      question: 'How can I provide feedback?',
      answer: 'We love hearing from our players! You can submit feedback through the app via Settings > Support & Feedback, or email us at ' + SUPPORT_EMAIL + '. Your feedback helps us improve the game experience for everyone.'
    },
    {
      question: 'What information should I include in my support request?',
      answer: 'For the best support experience, please include: (1) Your User ID (found in your profile), (2) App version (' + CURRENT_VERSION + '), (3) Device information, (4) Detailed description of the issue, and (5) Steps to reproduce (if applicable).'
    },
    {
      question: 'Can I request features?',
      answer: 'Absolutely! We welcome feature requests. Please submit them through the app via Settings > Support & Feedback, selecting "Feedback" as the category. We review all suggestions and consider them for future updates.'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1a1a0a_0%,_#000000_100%)]"></div>
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with Back Button */}
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-yellow-500/20 p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-yellow-400 transition-all duration-300 active:scale-95"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-4 h-4 group-hover:-translate-x-1 transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">SUPPORT CENTER</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
          <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
            {/* Title Section */}
            <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.02]">
              <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 uppercase tracking-tight mb-2">
                Support & Feedback
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">
                  We typically respond within 24-48 hours
                </span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 md:p-10 space-y-8 bg-transparent overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-yellow-500/20 scrollbar-track-transparent">
              
              {/* Contact Information */}
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-yellow-500 uppercase tracking-wider mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-yellow-500/50"></span>
                  Contact Us
                </h2>
                
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Email Support</h3>
                      <p className="text-gray-300 text-sm mb-4">{SUPPORT_EMAIL}</p>
                      <button
                        onClick={handleEmailSupport}
                        className="group relative overflow-hidden px-6 py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 active:scale-95 border border-yellow-400/30 bg-yellow-500/10 hover:bg-yellow-500/20"
                      >
                        <span className="relative z-10 text-yellow-400 flex items-center justify-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Send Email
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Response Time</p>
                    <p className="text-gray-300 text-sm">We typically respond to support requests within 24-48 hours during business days. For urgent issues, please include "URGENT" in your subject line.</p>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-yellow-500 uppercase tracking-wider mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-yellow-500/50"></span>
                  Frequently Asked Questions
                </h2>

                <div className="space-y-4">
                  {faqItems.map((faq, index) => (
                    <div key={index} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-3">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="text-yellow-500">Q{index + 1}:</span>
                        {faq.question}
                      </h3>
                      <p className="text-gray-300 text-sm leading-relaxed ml-6">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white/[0.02] border border-yellow-500/20 rounded-2xl p-6 space-y-3">
                <h3 className="text-sm font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  In-App Support
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  For the fastest support experience, use the in-app support system found in Settings &gt; Support &amp; Feedback. 
                  This automatically includes your User ID and app version, making it easier for us to help you.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="group relative overflow-hidden px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 active:scale-95 border border-yellow-400/30 shadow-[0_15px_40px_rgba(234,179,8,0.2)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                  <span className="relative z-10 text-black flex items-center justify-center gap-3 drop-shadow-md font-bold">
                    Back
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
      `}} />
    </div>
  );
};
