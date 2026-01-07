import React from 'react';

interface TermsOfServiceModalProps {
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div 
        className="relative bg-black/60 backdrop-blur-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] flex flex-col transition-all duration-500 scale-100" 
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/5 pointer-events-none"></div>

        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase tracking-tighter">TERMS OF SERVICE</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">LEGAL AGREEMENT</span>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all group active:scale-90"
          >
            <span className="text-xl group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>
        
        <div className="p-6 md:p-10 space-y-6 bg-transparent overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-gray-400 text-xs mb-6">
              <strong className="text-white">Last Updated:</strong> January 06, 2026
            </p>

            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              Welcome to Thirteen Cards! These Terms of Service ("Terms", "ToS") govern your access to and use of our mobile card game application ("Game", "Service", "App"). By downloading, installing, accessing, or using our Game, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Game.
            </p>

            <section className="mb-8">
              <h3 className="text-yellow-500 font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-3">
                <span className="w-1 h-6 bg-yellow-500/50"></span>
                1. Acceptance of Terms
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                By accessing or using the Game, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you are under the age of 18 (or the age of majority in your jurisdiction), you represent that you have your parent's or guardian's permission to use the Game and that they have agreed to these Terms on your behalf.
              </p>
            </section>

            <section className="mb-8 bg-yellow-500/10 border-l-4 border-yellow-500/50 p-5 rounded-r-xl">
              <h3 className="text-yellow-500 font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-3">
                <span className="w-1 h-6 bg-yellow-500/50"></span>
                2. Parody Disclaimer
              </h3>
              <p className="text-yellow-200 font-bold text-sm mb-3">IMPORTANT:</p>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                This Game contains character names, usernames, quick chat phrases, and other content that may reference or parody real-world persons, celebrities, public figures, trademarks, or other intellectual property. Examples include but are not limited to character names like "Chill Guy", "Six 7", "Skibidi Shiba", and various quick chat phrases used within the Game.
              </p>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                All such references are intended <strong className="text-white">solely as parody, satire, or humorous commentary</strong> and are protected under fair use principles. These references:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-2 ml-4">
                <li>Do <strong className="text-white">NOT</strong> imply endorsement, sponsorship, or affiliation with any real-world person, celebrity, trademark holder, or entity</li>
                <li>Do <strong className="text-white">NOT</strong> represent official products or services of any third party</li>
                <li>Are <strong className="text-white">NOT</strong> intended to infringe upon any intellectual property rights</li>
                <li>Are used for entertainment purposes only within the context of this Game</li>
              </ul>
              <p className="text-gray-300 text-sm leading-relaxed mt-3">
                We respect intellectual property rights and will respond to valid takedown requests in accordance with applicable law. If you believe any content in the Game infringes your rights, please contact us through the appropriate channels.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-yellow-500 font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-3">
                <span className="w-1 h-6 bg-yellow-500/50"></span>
                3. Virtual Items and In-Game Currency
              </h3>
              
              <h4 className="text-white font-bold text-sm mb-3 mt-4">3.1 Gems and Quick Chats</h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                The Game includes virtual items such as "Gems" (in-game currency) and "Quick Chats" (virtual chat phrases). These items are:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-2 ml-4">
                <li><strong className="text-white">Virtual Licenses:</strong> Gems and Quick Chats are digital licenses granted to you for use within the Game only</li>
                <li><strong className="text-white">No Real-World Value:</strong> These virtual items have no real-world monetary value and cannot be exchanged for cash, goods, or services outside of the Game</li>
                <li><strong className="text-white">Non-Refundable:</strong> All purchases of virtual items are final and non-refundable, except as required by applicable law</li>
                <li><strong className="text-white">Non-Transferable:</strong> Virtual items cannot be transferred, sold, or traded to other users or accounts</li>
                <li><strong className="text-white">Subject to Change:</strong> We reserve the right to modify, remove, or discontinue any virtual items at any time without prior notice</li>
              </ul>

              <h4 className="text-white font-bold text-sm mb-3 mt-4">3.2 Purchases</h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                When you make in-app purchases:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-2 ml-4">
                <li>You are purchasing a license to use virtual items within the Game</li>
                <li>Prices are displayed in your local currency (where applicable) or as set by the platform</li>
                <li>All sales are final unless otherwise required by law</li>
                <li>We reserve the right to change pricing at any time</li>
                <li>Refunds are subject to the policies of the platform through which you made the purchase</li>
              </ul>
            </section>

            <section className="mb-8 bg-red-500/10 border-l-4 border-red-500/50 p-5 rounded-r-xl">
              <h3 className="text-red-400 font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-3">
                <span className="w-1 h-6 bg-red-500/50"></span>
                4. User Conduct
              </h3>
              
              <h4 className="text-white font-bold text-sm mb-3 mt-4">4.1 No Toxicity Policy</h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                While our Game embraces a playful, sassy, and humorous tone, we maintain a strict <strong className="text-red-400">"No Toxicity"</strong> policy. You agree NOT to:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-2 ml-4">
                <li>Engage in hate speech, harassment, bullying, or discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or any other protected characteristic</li>
                <li>Threaten, intimidate, or harm other players</li>
                <li>Share personal information of other users without consent</li>
                <li>Impersonate other users, developers, or public figures</li>
                <li>Use the Game to promote illegal activities or content</li>
                <li>Spam, flood, or disrupt Game services or other players' experiences</li>
                <li>Exploit bugs, glitches, or vulnerabilities in the Game</li>
                <li>Use automated systems, bots, or unauthorized third-party software to access or interact with the Game</li>
              </ul>

              <h4 className="text-white font-bold text-sm mb-3 mt-4">4.2 Sassy vs. Toxic</h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                We encourage playful banter, friendly competition, and the Game's signature sassy tone. However, there is a clear distinction between:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-2 ml-4">
                <li><strong className="text-emerald-400">Acceptable:</strong> Playful teasing, competitive banter, using in-game quick chats and emotes as intended</li>
                <li><strong className="text-red-400">Not Acceptable:</strong> Personal attacks, hate speech, threats, harassment, or any behavior that creates a hostile environment</li>
              </ul>
              <p className="text-gray-300 text-sm leading-relaxed mt-3">
                We reserve the right to determine, in our sole discretion, what constitutes toxic behavior and to take appropriate action, including warnings, temporary suspensions, or permanent bans.
              </p>
            </section>

            <section className="mb-8 bg-blue-500/10 border-l-4 border-blue-500/50 p-5 rounded-r-xl">
              <h3 className="text-blue-400 font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-3">
                <span className="w-1 h-6 bg-blue-500/50"></span>
                5. Limitation of Liability
              </h3>
              
              <h4 className="text-white font-bold text-sm mb-3 mt-4">5.1 Service Availability</h4>
              <p className="text-yellow-200 font-bold text-sm mb-3">YOU ACKNOWLEDGE AND AGREE THAT:</p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-2 ml-4">
                <li>The Game is provided "AS IS" and "AS AVAILABLE" without warranties of any kind</li>
                <li>We do not guarantee that the Game will be available at all times, uninterrupted, or error-free</li>
                <li>Server downtime, maintenance, technical issues, or other disruptions may occur without notice</li>
                <li>We are not liable for any loss of data, progress, virtual items (including Gems, Quick Chats, or status like "Chill Guy"), or other in-game content due to server outages, technical failures, account suspension, force majeure events, or actions taken by third-party platforms</li>
              </ul>

              <h4 className="text-white font-bold text-sm mb-3 mt-4">5.2 Limitation of Damages</h4>
              <p className="text-yellow-200 font-bold text-sm mb-3">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-2 ml-4">
                <li>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Our total liability for any claims arising from or related to the Game shall not exceed the amount you paid to us in the 12 months preceding the claim (or $10, whichever is greater)</li>
                <li>Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-yellow-500 font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-3">
                <span className="w-1 h-6 bg-yellow-500/50"></span>
                6. Account Terms
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                You may be required to create an account to access certain features. You must provide accurate information and be at least 13 years old (or the minimum age in your jurisdiction). We reserve the right to suspend or terminate your account at any time for violations of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-yellow-500 font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-3">
                <span className="w-1 h-6 bg-yellow-500/50"></span>
                7. Intellectual Property
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                The Game, including all content, graphics, code, designs, trademarks, and other intellectual property, is owned by us or our licensors. We grant you a limited, non-exclusive, non-transferable, revocable license to use the Game for personal, non-commercial entertainment purposes only.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-yellow-500 font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-3">
                <span className="w-1 h-6 bg-yellow-500/50"></span>
                8. Modifications to Terms
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms in the Game or on our website. Your continued use of the Game after changes become effective constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-yellow-500 font-black text-lg uppercase tracking-wider mb-4 flex items-center gap-3">
                <span className="w-1 h-6 bg-yellow-500/50"></span>
                9. Contact Information
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                If you have questions about these Terms, please contact us at:
              </p>
              <p className="text-gray-300 text-sm leading-relaxed mt-2">
                <strong className="text-white">Email:</strong> thethirteengame@gmail.com
              </p>
            </section>

            <div className="mt-8 p-5 bg-white/[0.02] border border-white/10 rounded-xl">
              <p className="text-center text-gray-300 text-sm font-bold">
                By using Thirteen Cards, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="group w-full relative overflow-hidden py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 active:scale-95 border border-emerald-400/30 shadow-[0_15px_40px_rgba(16,185,129,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
            <span className="relative z-10 text-white flex items-center justify-center gap-3 drop-shadow-md">
              I Understand <span className="text-xl">✓</span>
            </span>
          </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer {
            0% { background-position: -100% 0; }
            100% { background-position: 100% 0; }
          }
        `}} />
      </div>
    </div>
  );
};
