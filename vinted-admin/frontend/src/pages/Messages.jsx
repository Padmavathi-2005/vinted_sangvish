import React, { useState, useEffect, useRef } from 'react';
import { Spinner, Form, Button, Modal } from 'react-bootstrap';
import { FaUser, FaSearch, FaPaperPlane, FaEllipsisV, FaImage, FaSmile, FaCheckDouble, FaEnvelope, FaExclamationCircle, FaPlus } from 'react-icons/fa';
import axios from '../utils/axios';
import { getAdminInfo } from '../utils/auth';
import { safeString } from '../utils/constants';
import '../styles/AdminMessages.css';

const Messages = () => {
    const adminInfo = getAdminInfo();
    const adminId = adminInfo?._id || adminInfo?.id;

    // Helper to format image URLs
    const getImageUrl = (path) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${path}`;
    };

    const [conversations, setConversations] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef(null);

    // New conversation states
    const [allUsers, setAllUsers] = useState([]);
    const [showUserPicker, setShowUserPicker] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [usersLoading, setUsersLoading] = useState(false);

    const scrollToBottom = (behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const fetchConversations = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get('/api/admin-messages/conversations');
            setConversations(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setLoading(false);
        }
    };

    const fetchMessages = async (convId, silent = false) => {
        if (!silent) setMsgLoading(true);
        try {
            const res = await axios.get(`/api/admin-messages/${convId}`);
            setSelectedConv(res.data.conversation);
            setMessages(res.data.messages);
            setMsgLoading(false);
            if (!silent) {
                setTimeout(() => scrollToBottom("auto"), 50);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            setMsgLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await axios.get('/api/admin/users');
            setAllUsers(res.data);
            setUsersLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsersLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
        fetchAllUsers();
        // Polling every 10 seconds for new messages
        const interval = setInterval(() => {
            fetchConversations(true);
            if (activeConvIdRef.current) {
                fetchMessages(activeConvIdRef.current, true);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Keep track of active ID for polling
    const activeConvIdRef = useRef(null);
    useEffect(() => {
        activeConvIdRef.current = selectedConv?._id;
    }, [selectedConv]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!messageInput.trim() || !selectedConv) return;

        const otherParticipant = getOtherParticipant(selectedConv);
        const targetId = otherParticipant?.id?._id || otherParticipant?.id;
        const targetModel = otherParticipant?.on_model || 'User';

        if (!targetId) return;

        try {
            const res = await axios.post('/api/admin-messages', {
                receiver_id: targetId,
                receiver_model: targetModel,
                message: messageInput
            });

            // Optimistic update
            setMessages(prev => [...prev, res.data.message]);
            setMessageInput('');
            fetchConversations(true);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const getOtherParticipant = (conv) => {
        if (!conv || !conv.participants) return null;
        return conv.participants.find(p => (p.id?._id || p.id || p._id).toString() !== (adminId || '').toString());
    };

    const filteredConversations = conversations.filter(c => {
        const other = getOtherParticipant(c);
        const name = safeString(other?.id?.username || other?.id?.name) || 'User';
        return name.toLowerCase().includes(search.toLowerCase());
    });

    const filteredUsers = allUsers.filter(u =>
        (u.username || u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
    );

    const startNewChat = (user) => {
        // Check if conversation already exists
        const existing = conversations.find(c => {
            const other = getOtherParticipant(c);
            return (other?.id?._id || other?.id).toString() === user._id.toString();
        });

        if (existing) {
            fetchMessages(existing._id);
        } else {
            // Setup a "pseudo" conversation object for the UI
            setSelectedConv({
                _id: 'new',
                participants: [
                    { id: adminId, on_model: 'Admin' },
                    { id: user, on_model: 'User' }
                ],
                status: 'accepted'
            });
            setMessages([]);
        }
        setShowUserPicker(false);
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <Spinner animation="border" variant="primary" />
        </div>
    );

    return (
        <div className="admin-messages-container">
            {/* Sidebar */}
            <aside className="messages-sidebar">
                <div className="messages-sidebar-header">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h2>Messages</h2>
                        <button className="input-action-btn" onClick={() => setShowUserPicker(true)}>
                            <FaPlus />
                        </button>
                    </div>

                    <div className="compose-btn-wrapper">
                        <button className="sidebar-compose-btn" onClick={() => setShowUserPicker(true)}>
                            <FaPlus /> Start New Chat
                        </button>
                    </div>

                    <div className="search-wrapper">
                        <FaSearch className="search-icon-inside" />
                        <input
                            placeholder="Search conversation..."
                            className="sidebar-search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="conversations-list scroll-premium">
                    {filteredConversations.map((c) => {
                        const otherParticipant = getOtherParticipant(c);
                        const other = otherParticipant?.id;
                        const isOnline = other?.last_login && (new Date() - new Date(other.last_login)) < 5 * 60000;
                        const isActive = selectedConv?._id === c._id;

                        return (
                            <div
                                key={c._id}
                                className={`conv-item ${isActive ? 'active-conv' : ''}`}
                                onClick={() => fetchMessages(c._id)}
                            >
                                <div className="conv-avatar-wrapper">
                                    {other?.profile_image ? (
                                        <img src={getImageUrl(other.profile_image)} className="conv-avatar" alt={other.name} />
                                    ) : (
                                        <div className="conv-avatar-placeholder">
                                            <FaUser />
                                        </div>
                                    )}
                                    {isOnline && <div className="online-status-dot"></div>}
                                </div>
                                <div className="conv-info">
                                    <div className="conv-header">
                                        <span className="conv-name">{safeString(other?.username || other?.name) || 'User'}</span>
                                        <span className="conv-time">
                                            {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <p className="conv-last-msg">{safeString(c.last_message) || 'No messages yet'}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredConversations.length === 0 && (
                        <div className="p-5 text-center text-muted">
                            <FaExclamationCircle size={30} className="mb-3 opacity-25" />
                            <p className="small mb-0">No conversations found</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Chat Main Area */}
            <main className="chat-main">
                {selectedConv ? (
                    <>
                        <header className="chat-header">
                            {(() => {
                                const otherData = getOtherParticipant(selectedConv);
                                const other = otherData?.id || {};
                                const isOnline = other?.last_login && (new Date() - new Date(other.last_login)) < 5 * 60000;
                                return (
                                    <>
                                        <div className="chat-header-info">
                                            <div className="conv-avatar-wrapper">
                                                {other?.profile_image ? (
                                                    <img src={getImageUrl(other.profile_image)} className="conv-avatar" style={{ width: '40px', height: '40px' }} alt="" />
                                                ) : (
                                                    <div className="conv-avatar-placeholder" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                                                        <FaUser />
                                                    </div>
                                                )}
                                                {isOnline && <div className="online-status-dot"></div>}
                                            </div>
                                            <div>
                                                <h4 className="chat-header-name">{safeString(other?.username || other?.name) || 'User'}</h4>
                                                <span className="chat-header-status" style={{ color: isOnline ? '#10b981' : '#94a3b8' }}>
                                                    {isOnline ? 'Active Now' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                            <button className="input-action-btn"><FaEllipsisV /></button>
                        </header>

                        <div className="chat-messages-area scroll-premium">
                            {msgLoading ? (
                                <div className="d-flex justify-content-center p-5"><Spinner animation="border" size="sm" /></div>
                            ) : (
                                <>
                                    {messages.length === 0 && selectedConv._id === 'new' && (
                                        <div className="text-center py-5 opacity-50">
                                            <FaEnvelope size={40} className="mb-3" />
                                            <p>Send a message to start this conversation</p>
                                        </div>
                                    )}
                                    {messages.map((m) => {
                                        const senderId = m.sender_id?._id || m.sender_id;
                                        const isMe = m.sender_model === 'Admin' && senderId?.toString() === (adminId || '').toString();
                                        return (
                                            <div key={m._id} className={`message-wrapper ${isMe ? 'sent' : 'received'}`}>
                                                <div className="message-bubble">
                                                    {safeString(m.message)}
                                                    <div className="message-time-meta">
                                                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {isMe && <FaCheckDouble size={10} />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        <div className="chat-input-wrapper">
                            <form className="chat-input-form" onSubmit={handleSendMessage}>
                                <button type="button" className="input-action-btn"><FaImage /></button>
                                <button type="button" className="input-action-btn"><FaSmile /></button>
                                <input
                                    placeholder="Type a message..."
                                    className="chat-input-field"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="send-btn-primary"
                                    disabled={!messageInput.trim()}
                                >
                                    <FaPaperPlane />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="messages-empty-state">
                        <div className="empty-state-illustration">
                            <FaEnvelope />
                        </div>
                        <h3>Select a Conversation</h3>
                        <p>Choose a user from the list on the left to start a real-time conversation.</p>
                        <Button variant="primary" className="mt-4 rounded-pill px-4" onClick={() => setShowUserPicker(true)}>
                            Start New Chat
                        </Button>
                    </div>
                )}
            </main>

            {/* User Picker Modal */}
            <Modal
                show={showUserPicker}
                onHide={() => setShowUserPicker(false)}
                centered
                size="md"
                className="user-picker-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>New Message</Modal.Title>
                </Modal.Header>
                <div className="user-picker-search-container">
                    <div className="user-picker-search-wrapper">
                        <FaSearch className="text-muted" />
                        <input
                            className="user-picker-search-input"
                            placeholder="Search users by name or email..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="user-picker-list scroll-premium">
                    {usersLoading ? (
                        <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>
                    ) : (
                        filteredUsers.map(u => (
                            <div key={u._id} className="user-picker-item" onClick={() => startNewChat(u)}>
                                <div className="conv-avatar-wrapper">
                                    {u.profile_image ? (
                                        <img src={getImageUrl(u.profile_image)} className="conv-avatar" style={{ width: '40px', height: '40px' }} alt="" />
                                    ) : (
                                        <div className="conv-avatar-placeholder" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                                            <FaUser />
                                        </div>
                                    )}
                                </div>
                                <div className="user-picker-info">
                                    <h6 className="user-picker-name">{safeString(u.username || u.name)}</h6>
                                    <p className="user-picker-email">{u.email}</p>
                                </div>
                                <div className="user-picker-action">Message</div>
                            </div>
                        ))
                    )}
                    {!usersLoading && filteredUsers.length === 0 && (
                        <div className="text-center p-5 text-muted">No users found</div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Messages;
