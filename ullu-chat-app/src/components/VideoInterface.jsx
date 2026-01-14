import React, { useEffect, useRef, useState } from 'react';
import { User, UserCircle } from 'lucide-react';

const VideoInterface = ({ isActive, connectionStatus, localStream, remoteStream, isMuted, isCameraOff }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Handle local stream attachment
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isActive]);

    // Handle remote stream attachment
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, isActive]);

    // Determine classes for video effects
    const localVideoStyle = isCameraOff ? { filter: 'blur(20px) brightness(0.5)' } : {};

    if (!isActive) return null;

    return (
        <div className="video-chat-container">
            <div className="desktop-layout">
                <div className="video-wrapper remote-video">
                    <div className="video-label">
                        <User size={14} />
                        <span>Stranger</span>
                    </div>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="remote-video-element"
                    ></video>

                    {/* Overlay when not connected or no video */}
                    {connectionStatus !== 'connected' && (
                        <div className="video-overlay">
                            <div className="video-placeholder-icon">
                                <UserCircle size={64} />
                            </div>
                            <p>
                                {connectionStatus === 'searching' ? 'Finding your perfect match...' : 'Waiting for connection...'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="video-wrapper local-video">
                    <div className="video-label">
                        <User size={14} />
                        <span>You</span>
                    </div>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={localVideoStyle}
                    ></video>

                    {!localStream && (
                        <div className="video-overlay">
                            <p>Getting camera access...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile layout could be handled via CSS classes 'mobile-layout' if we port that structure too, 
          but for now relying on responsive CSS in chat.css */}
        </div>
    );
};

export default VideoInterface;
