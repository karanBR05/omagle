import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, UserCircle, User } from 'lucide-react';

const ChatInterface = ({ isActive, connectionStatus, onSendMessage, messages = [] }) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    useEffect(() => {
        // Simulate typing indicator based on connection status or incoming messages
        // (This is handled by parent or logic hooks usually, but for now we simulate simple typing)
        if (connectionStatus === 'connected' && messages.length > 0 && messages[messages.length - 1].type === 'outgoing') {
            // logic to show typing handled by parent simulation
        }
    }, [connectionStatus, messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const emojis = ['😊', '😂', '😍', '🤔', '😎', '🤩', '🥳', '🤗', '👍', '❤️', '🔥', '✨', '🎉', '🙌', '💯'];

    if (!isActive) return null;

    return (
        <div className="text-chat-container">
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div key={index} className={`message message-${msg.type}`}>
                        <div className="message-sender">
                            {msg.type === 'outgoing' ? <User size={12} /> : <UserCircle size={12} />}
                            {msg.sender}
                        </div>
                        <div className="message-text">{msg.text}</div>
                        <div className="message-time">{msg.time}</div>
                    </div>
                ))}

                {/* Typing Bubble */}
                {isTyping && (
                    <div className="typing-indicator">
                        <span>Stranger is typing</span>
                        <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="text-input-area" onSubmit={handleSend}>
                <button
                    type="button"
                    className="emoji-toggle"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                    <Smile size={24} />
                </button>

                <input
                    type="text"
                    className="text-input"
                    placeholder="Type your message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={connectionStatus !== 'connected'}
                />

                <button type="button" className="send-button" onClick={handleSend} disabled={connectionStatus !== 'connected'}>
                    <Send size={20} />
                </button>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                    <div className="emoji-picker active">
                        {emojis.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                className="emoji-btn"
                                onClick={() => {
                                    setInputText(prev => prev + emoji);
                                    // don't close picker immediately
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </form>
        </div>
    );
};

export default ChatInterface;
