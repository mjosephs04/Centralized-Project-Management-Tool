import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { FaEnvelope, FaPaperPlane, FaUser } from "react-icons/fa";
import { messagesAPI, authAPI } from "../services/api";
import { useSnackbar } from "../contexts/SnackbarContext";
import UserNavbar from "../components/UserNavbar";

const MessagesPage = () => {
  const { showSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const selectedConversationIdRef = useRef(null);
  const isMarkingReadRef = useRef(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchConversations();
    fetchUnreadCount();
    // Refresh conversations every 30 seconds
    const interval = setInterval(() => {
      fetchConversations(false); // Pass false to prevent updating selectedConversation
      fetchUnreadCount();
      if (selectedConversationIdRef.current) {
        fetchMessages(selectedConversationIdRef.current);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const user = await authAPI.me();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  useEffect(() => {
    // Check if there's a conversation ID in URL params
    const conversationId = searchParams.get("conversation");
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === parseInt(conversationId));
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      const conversationId = selectedConversation.id;
      // Only mark as read if this is a new conversation selection
      if (selectedConversationIdRef.current !== conversationId) {
        selectedConversationIdRef.current = conversationId;
        fetchMessages(conversationId);
        markConversationRead(conversationId);
      }
    } else {
      selectedConversationIdRef.current = null;
    }
  }, [selectedConversation?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async (updateSelected = true) => {
    try {
      const data = await messagesAPI.getConversations();
      setConversations(data || []);
      // If we have a selected conversation, update it only if updateSelected is true
      // This prevents infinite loops when called from markConversationRead
      if (updateSelected && selectedConversation) {
        const updated = data.find(c => c.id === selectedConversation.id);
        if (updated) {
          // Only update if something actually changed to prevent unnecessary re-renders
          const hasChanged = JSON.stringify(updated) !== JSON.stringify(selectedConversation);
          if (hasChanged) {
            setSelectedConversation(updated);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      showSnackbar("Failed to load conversations", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const data = await messagesAPI.getMessages(conversationId);
      setMessages(data.messages || []);
      // Don't auto-scroll on fetch - let user control their position
    } catch (error) {
      console.error("Error fetching messages:", error);
      showSnackbar("Failed to load messages", "error");
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await messagesAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markConversationRead = async (conversationId) => {
    // Prevent multiple simultaneous calls for the same conversation
    if (isMarkingReadRef.current) {
      return;
    }
    
    try {
      isMarkingReadRef.current = true;
      await messagesAPI.markConversationRead(conversationId);
      // Don't update selectedConversation to prevent infinite loop
      fetchConversations(false);
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    } finally {
      isMarkingReadRef.current = false;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const message = await messagesAPI.sendMessage(selectedConversation.id, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage("");
      fetchConversations(); // Refresh to update last message time
      // Scroll to bottom only when user sends a message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      showSnackbar("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatLastMessageTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getParticipantName = (conversation) => {
    const participant = conversation.otherParticipant;
    if (!participant) return "Unknown User";
    return [participant.firstName, participant.lastName].filter(Boolean).join(" ") || participant.emailAddress || "Unknown User";
  };

  const getParticipantInitials = (conversation) => {
    const participant = conversation.otherParticipant;
    if (!participant) return "U";
    const firstName = participant.firstName || "";
    const lastName = participant.lastName || "";
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    } else if (firstName) {
      return firstName[0].toUpperCase();
    } else if (participant.emailAddress) {
      return participant.emailAddress[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <UserNavbar />
      <div style={styles.pageContainer}>
        <div style={styles.container}>
          {/* Conversations Sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h2 style={styles.sidebarTitle}>Messages</h2>
              {unreadCount > 0 && (
                <span style={styles.unreadBadge}>{unreadCount}</span>
              )}
            </div>
            <div style={styles.conversationsList}>
              {loading ? (
                <div style={styles.emptyState}>
                  <p>Loading conversations...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div style={styles.emptyState}>
                  <FaEnvelope size={48} style={styles.emptyIcon} />
                  <p style={styles.emptyText}>No conversations yet</p>
                  <p style={styles.emptySubtext}>Start a conversation from the teams page</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    style={{
                      ...styles.conversationItem,
                      ...(selectedConversation?.id === conversation.id ? styles.conversationItemActive : {}),
                    }}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div style={styles.conversationAvatar}>
                      {conversation.otherParticipant?.profileImageUrl ? (
                        <img
                          src={conversation.otherParticipant.profileImageUrl}
                          alt={getParticipantName(conversation)}
                          style={styles.avatarImage}
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          {getParticipantInitials(conversation)}
                        </div>
                      )}
                    </div>
                    <div style={styles.conversationContent}>
                      <div style={styles.conversationHeader}>
                        <span style={styles.conversationName}>
                          {getParticipantName(conversation)}
                        </span>
                        <span style={styles.conversationTime}>
                          {formatLastMessageTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div style={styles.unreadIndicator}>
                          <span style={styles.unreadDot}></span>
                          <span style={styles.unreadText}>{conversation.unreadCount} new</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div style={styles.chatArea}>
            {selectedConversation ? (
              <>
                <div style={styles.chatHeader}>
                  <div style={styles.chatHeaderInfo}>
                    {selectedConversation.otherParticipant?.profileImageUrl ? (
                      <img
                        src={selectedConversation.otherParticipant.profileImageUrl}
                        alt={getParticipantName(selectedConversation)}
                        style={styles.chatAvatarImage}
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    ) : (
                      <div style={styles.chatAvatarPlaceholder}>
                        {getParticipantInitials(selectedConversation)}
                      </div>
                    )}
                    <div>
                      <h3 style={styles.chatTitle}>
                        {getParticipantName(selectedConversation)}
                      </h3>
                      {selectedConversation.otherParticipant?.emailAddress && (
                        <p style={styles.chatSubtitle}>
                          {selectedConversation.otherParticipant.emailAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div 
                  style={styles.messagesContainer} 
                  ref={messagesContainerRef}
                >
                  {messages.length === 0 ? (
                    <div style={styles.emptyMessages}>
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isSent = message.senderId === currentUserId;
                      return (
                        <div
                          key={message.id}
                          style={{
                            ...styles.message,
                            ...(isSent ? styles.messageSent : styles.messageReceived),
                          }}
                        >
                          <div style={{
                            ...styles.messageContent,
                            ...(isSent ? styles.messageContentSent : styles.messageContentReceived),
                          }}>
                            <p style={{
                              ...styles.messageText,
                              ...(isSent ? styles.messageTextSent : {}),
                            }}>{message.content}</p>
                            <span style={{
                              ...styles.messageTime,
                              ...(isSent ? styles.messageTimeSent : {}),
                            }}>
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form style={styles.messageInputContainer} onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = "#0052D4")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    placeholder="Type a message..."
                    style={styles.messageInput}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    style={{
                      ...styles.sendButton,
                      ...(sending || !newMessage.trim() ? styles.sendButtonDisabled : {}),
                    }}
                    disabled={sending || !newMessage.trim()}
                  >
                    <FaPaperPlane size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div style={styles.noSelection}>
                <FaEnvelope size={64} style={styles.noSelectionIcon} />
                <h3 style={styles.noSelectionTitle}>Select a conversation</h3>
                <p style={styles.noSelectionText}>
                  Choose a conversation from the sidebar to start messaging
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  container: {
    width: "100%",
    flex: 1,
    margin: 0,
    display: "flex",
    backgroundColor: "white",
    borderRadius: 0,
    boxShadow: "none",
    overflow: "hidden",
  },
  sidebar: {
    width: "350px",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f9fafb",
  },
  sidebarHeader: {
    padding: "1.5rem",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
  },
  sidebarTitle: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#1f2937",
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    color: "white",
    borderRadius: "12px",
    padding: "4px 10px",
    fontSize: "0.75rem",
    fontWeight: "600",
  },
  conversationsList: {
    flex: 1,
    overflowY: "auto",
  },
  conversationItem: {
    display: "flex",
    padding: "1rem 1.5rem",
    cursor: "pointer",
    borderBottom: "1px solid #e5e7eb",
    transition: "background 0.2s ease",
    backgroundColor: "white",
  },
  conversationItemActive: {
    backgroundColor: "#eff6ff",
    borderLeft: "3px solid #0052D4",
  },
  conversationAvatar: {
    marginRight: "0.75rem",
  },
  avatarImage: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  avatarPlaceholder: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#0052D4",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    fontWeight: "600",
  },
  conversationContent: {
    flex: 1,
    minWidth: 0,
  },
  conversationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.25rem",
  },
  conversationName: {
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "#1f2937",
  },
  conversationTime: {
    fontSize: "0.75rem",
    color: "#6b7280",
  },
  unreadIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.25rem",
  },
  unreadDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#0052D4",
  },
  unreadText: {
    fontSize: "0.75rem",
    color: "#0052D4",
    fontWeight: "500",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "white",
  },
  chatHeader: {
    padding: "1.5rem",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
  },
  chatHeaderInfo: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  chatAvatarImage: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  chatAvatarPlaceholder: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#0052D4",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    fontWeight: "600",
  },
  chatTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1f2937",
  },
  chatSubtitle: {
    margin: "0.25rem 0 0 0",
    fontSize: "0.875rem",
    color: "#6b7280",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  message: {
    display: "flex",
    maxWidth: "70%",
  },
  messageSent: {
    alignSelf: "flex-end",
  },
  messageReceived: {
    alignSelf: "flex-start",
  },
  messageContent: {
    padding: "0.75rem 1rem",
    borderRadius: "12px",
    backgroundColor: "#f3f4f6",
  },
  messageContentSent: {
    backgroundColor: "#0052D4",
    color: "white",
  },
  messageContentReceived: {
    backgroundColor: "#f3f4f6",
  },
  messageText: {
    margin: 0,
    fontSize: "0.95rem",
    lineHeight: "1.5",
    color: "#1f2937",
  },
  messageTextSent: {
    color: "white",
  },
  messageTime: {
    fontSize: "0.75rem",
    color: "#6b7280",
    marginTop: "0.25rem",
    display: "block",
  },
  messageTimeSent: {
    color: "rgba(255,255,255,0.8)",
  },
  messageInputContainer: {
    display: "flex",
    padding: "1.5rem",
    borderTop: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    gap: "0.75rem",
  },
  messageInput: {
    flex: 1,
    padding: "0.75rem 1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  sendButton: {
    padding: "0.75rem 1.25rem",
    backgroundColor: "#0052D4",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
  },
  sendButtonDisabled: {
    backgroundColor: "#9ca3af",
    cursor: "not-allowed",
  },
  noSelection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  },
  noSelectionIcon: {
    color: "#d1d5db",
    marginBottom: "1rem",
  },
  noSelectionTitle: {
    margin: "0.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#374151",
  },
  noSelectionText: {
    margin: 0,
    fontSize: "1rem",
    color: "#6b7280",
  },
  emptyState: {
    padding: "2rem",
    textAlign: "center",
    color: "#6b7280",
  },
  emptyIcon: {
    color: "#d1d5db",
    marginBottom: "1rem",
  },
  emptyText: {
    margin: "0.5rem 0",
    fontSize: "1rem",
    fontWeight: "500",
    color: "#374151",
  },
  emptySubtext: {
    margin: 0,
    fontSize: "0.875rem",
    color: "#6b7280",
  },
  emptyMessages: {
    padding: "2rem",
    textAlign: "center",
    color: "#6b7280",
  },
};

export default MessagesPage;

