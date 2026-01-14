import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';
import VideoInterface from './components/VideoInterface';
import { LogOut, RefreshCw, Mic, MicOff, Video, VideoOff, Flag } from 'lucide-react';
import io from 'socket.io-client';

// NOTE: In production, URL should be your actual IP or Domain. 
// For local network testing, you MUST replacethis with your machine's IP, e.g., 'https://10.20.12.250:3000'
// Browsers will block non-HTTPS sockets in secure contexts, but since we are self-signed, we might need http if server is plain http.
// However, mixed content is blocked. Best is if server is also https or we just use http for dev if accessing via IP.
// Since user asked for IP access, we assume they are okay with warnings.
// To make things simple, we'll try to connect to the hostname.
// Socket used to point to http://hostname:3000 but that fails on HTTPS pages (Mixed Content).
// Now we rely on Vite's proxy, so we simply connect to the current origin.
// In production, this must point to your separate backend server (e.g. Render/Railway)
// because Vercel cannot host persistent WebSocket servers.
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || '/';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [chatMode, setChatMode] = useState('text');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(0);

  // Media State
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  // Real-Time Refs
  const socketRef = useRef();
  const peerRef = useRef();
  const roomIdRef = useRef(null);

  const localStreamRef = useRef(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Handle Mute/Unmute
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  // Handle Camera On/Off
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOn;
      });
    }
  }, [isVideoOn, localStream]);

  useEffect(() => {
    // Initialize Socket
    socketRef.current = io(SOCKET_URL);
    // ... rest of the socket initialization ...

    socketRef.current.on('connect', () => {
      console.log("Connected to signaling server");
      socketRef.current.emit('request_user_count');
    });

    socketRef.current.on('user_count', (count) => {
      setOnlineUsers(count);
    });

    socketRef.current.on('waiting', () => {
      setConnectionStatus('searching');
    });

    socketRef.current.on('partner_disconnected', () => {
      // Auto-reconnect logic
      addMessage('Ullu Assistant', "Stranger disconnected. Connecting to new stranger...", 'incoming');

      // Cleanup previous peer but keep stream
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      setRemoteStream(null);
      roomIdRef.current = null;

      setConnectionStatus('connecting');
      socketRef.current.emit('find_partner', chatMode);
    });

    socketRef.current.on('match_found', ({ roomId, initiator }) => {
      roomIdRef.current = roomId;
      setConnectionStatus('connected');
      setMessages([]); // Clear messages on new match
      addMessage('Ullu Assistant', "Matched with a stranger!", 'incoming');

      // Start WebRTC
      initializePeer(initiator, roomId);
    });

    socketRef.current.on('signal', (signal) => {
      if (peerRef.current) {
        peerRef.current.signal(signal);
      }
    });

    socketRef.current.on('message', (msg) => {
      setMessages(prev => [...prev, msg]);
      // Simple typing indicator simulation removed, real message arrived
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    }
  }, [chatMode]); // Add chatMode dependency so we can use it in auto-reconnect


  // WebRTC Logic (Using simple-peer logic but raw for reliability without node polyfills issues in Vite)
  // Actually, let's use a simplified RTCPeerConnection if we want to avoid 'global is not defined' which simple-peer often causes in vite.
  // For robustness in this demo, let's try to stick to standard API.

  const initializePeer = (initiator, roomId) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });
    peerRef.current = peer;

    // Add local tracks - USE REF TO GET CURRENT STREAM
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current));
    } else {
      console.warn("No local stream found when initializing peer!");
    }

    // Handle Remote Stream
    peer.ontrack = (event) => {
      // This must be handled in VideoInterface via state or ref
      // For now we set a state or pass this event elsewhere?
      // Let's modify VideoInterface to accept srcObject directly
      // We can't easily pass the stream up if we don't have it in state
      // But creating a new stream object might loop.
      // Let's assign to a "remoteStream" state.
      console.log("Remote track received", event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    // Handle ICE Candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('signal', { roomId, signal: { type: 'candidate', candidate: event.candidate } });
      }
    };

    // Negotiation (The simpler initiator logic)
    if (initiator) {
      peer.createOffer()
        .then(offer => peer.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit('signal', { roomId, signal: { type: 'offer', sdp: peer.localDescription } });
        })
        .catch(err => console.error("Offer Error", err));
    }

    // Data Channel (optional for text, but we use socket for text reliability)
  };

  // Helper to handle signals coming from socket (refactored from 'signal' listener above)
  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.off('signal'); // remove old listener to avoid dupes if re-rendering
    socketRef.current.on('signal', async (signal) => {
      if (!peerRef.current) return;
      const peer = peerRef.current;

      try {
        if (signal.type === 'offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          // IMPORTANT: Add local tracks before creating answer if not already added?
          // Usually we add them at Init. If we are receiver (not initiator), Init is called too.
          // So tracks should be there.

          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socketRef.current.emit('signal', { roomId: roomIdRef.current, signal: { type: 'answer', sdp: peer.localDescription } });
        } else if (signal.type === 'answer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate') {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error("Signaling error", err);
      }
    });
  }, [localStream]); // Re-bind if stream changes? No, stream is added at start.

  const [remoteStream, setRemoteStream] = useState(null);

  const startChat = async (mode) => {
    setChatMode(mode);
    setCurrentPage('chat');
    setIsMobileMenuOpen(false);

    if (mode === 'video') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
      } catch (err) {
        console.error("Failed to get media", err);
        alert("Could not access camera/microphone. Ensure you are on HTTPS.");
      }
    }

    // Find Partner
    setConnectionStatus('connecting');
    if (socketRef.current) {
      socketRef.current.emit('find_partner', mode);
    }
  };

  const addMessage = (sender, text, type) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { sender, text, type, time }]);
  };

  const handleSendMessage = (text) => {
    addMessage('You', text, 'outgoing');
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('message', { roomId: roomIdRef.current, text });
    }
  };

  const findNextPartner = () => {
    if (socketRef.current) socketRef.current.emit('leave_chat');
    handleEndChatCleanup();
    setConnectionStatus('connecting');
    socketRef.current.emit('find_partner', chatMode);
  };

  const endChat = () => {
    if (socketRef.current) socketRef.current.emit('leave_chat');
    handleEndChatCleanup();
    setCurrentPage('landing');
    setConnectionStatus('disconnected');
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const handleEndChatCleanup = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    roomIdRef.current = null;
    setRemoteStream(null);
    setMessages([]);
  }

  // ... (Render - Mostly same as before, passing remoteStream to VideoInterface)

  return (
    <>
      <Header
        toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <main className="main-content">
        <div className="container">
          {/* Landing Page View */}
          {currentPage === 'landing' && (
            <LandingPage onStartChat={startChat} onlineUsers={onlineUsers} />
          )}

          {/* Chat Session View */}
          <div className={`chat-session ${currentPage === 'chat' ? 'active' : ''}`} id="chatSession">
            {/* Header ... */}
            <div className="chat-header">
              <div className="container chat-header-content">
                <div className="chat-info">
                  <div className={`status-indicator status-${connectionStatus}`}>
                    <div className="status-dot"></div>
                    <span>{connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}</span>
                  </div>
                </div>
                <button className="control-button danger" onClick={endChat} style={{ minWidth: 'auto', padding: '10px' }}>
                  <LogOut size={20} />
                  <span>End</span>
                </button>
              </div>
            </div>

            <div className="chat-area">
              {chatMode === 'text' && (
                <ChatInterface
                  isActive={currentPage === 'chat'}
                  connectionStatus={connectionStatus}
                  onSendMessage={handleSendMessage}
                  messages={messages}
                />
              )}
              {chatMode === 'video' && (
                <VideoInterface
                  isActive={currentPage === 'chat'}
                  connectionStatus={connectionStatus}
                  localStream={localStream}
                  remoteStream={remoteStream}
                  isMuted={isMuted}
                  isCameraOff={!isVideoOn}
                />
              )}
            </div>

            {/* Controls ... */}
            {currentPage === 'chat' && (
              <div className="control-bar">
                <button className="control-button primary" onClick={findNextPartner} disabled={connectionStatus !== 'connected'}>
                  <RefreshCw size={24} />
                  <span>Next</span>
                </button>
                {/* ... other controls */}
                {chatMode === 'video' && (
                  <>
                    <button className={`control-button ${isMuted ? 'warning' : ''}`} onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                      <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                    </button>
                    <button className={`control-button ${!isVideoOn ? 'warning' : 'active-btn'}`} onClick={() => setIsVideoOn(!isVideoOn)}>
                      {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
                      <span>Cam</span>
                    </button>
                  </>
                )}
                <button className="control-button warning">
                  <Flag size={24} />
                  <span>Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default App;
