import React from 'react';
import { MessageSquare, Video, Bird } from 'lucide-react';

const LandingPage = ({ onStartChat, onlineUsers }) => {
    return (
        <div className="landing-page" id="landingPage">
            <section className="hero-section">
                <h1 className="hero-title">Connect with Strangers Anonymously</h1>
                <p className="hero-subtitle">Intelligent matching, complete privacy, and real conversations. No registration, no tracking.</p>
                <div style={{
                    marginTop: '1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(32, 201, 151, 0.1)',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    color: '#20C997',
                    fontWeight: 500
                }}>
                    <span style={{ fontSize: '1.5rem' }}>•</span>
                    {onlineUsers > 0 ? `${onlineUsers} Users Online` : 'Connecting to Server...'}
                </div>
            </section>

            <div className="mode-selection">
                <h2 className="mode-title">Choose Your Experience</h2>
                <p className="mode-subtitle">Select how you want to connect with random people</p>

                <div className="mode-cards">
                    <button
                        className="mode-card text-mode selected"
                        onClick={() => onStartChat('text')}
                    >
                        <div className="mode-icon">
                            <MessageSquare size={48} />
                        </div>
                        <h3>Text Chat</h3>
                        <p>Anonymous text conversations with intelligent matching</p>
                    </button>

                    <button
                        className="mode-card video-mode"
                        onClick={() => onStartChat('video')}
                    >
                        <div className="mode-icon">
                            <Video size={48} />
                        </div>
                        <h3>Video Chat</h3>
                        <p>Face-to-face video calls with privacy filters</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
