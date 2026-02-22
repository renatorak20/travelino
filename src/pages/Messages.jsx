import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Avatar,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Divider,
  Badge,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";

const POLL_INTERVAL = 5000; // ms — only polls for NEW messages since last seen

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { darkMode } = useTheme();
  const myId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [activePartner, setActivePartner] = useState(null); // { _id, username, avatar }
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const lastMessageAtRef = useRef(null); // ISO string of newest message seen
  const activePartnerRef = useRef(null); // mirrors activePartner without causing re-renders
  const openedFromUrlRef = useRef(null); // which userId we already opened from URL param

  // ── Load conversations on mount ──────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
  }, []);

  // ── Handle ?with=userId query param — runs ONLY when the URL param changes ─
  useEffect(() => {
    const withId = searchParams.get("with");
    // Skip if no param, or we already opened this user from the URL this session
    if (!withId || openedFromUrlRef.current === withId) return;
    openedFromUrlRef.current = withId;

    // Always fetch the user directly — avoids depending on conversations state
    axios
      .get(`${API_BASE_URL}/users/${withId}`, { headers })
      .then((res) => openConversationById(res.data))
      .catch(console.error);
  }, [searchParams]); // ← conversations intentionally excluded

  // ── Scroll to bottom when messages change ─────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Polling: only when a conversation is active and tab is visible ────────
  useEffect(() => {
    if (!activePartner) {
      clearInterval(pollRef.current);
      return;
    }

    // Use ref so the interval always reads the current partner without recreating
    const tick = () => {
      const partnerId = activePartnerRef.current?._id;
      if (partnerId && document.visibilityState === "visible") {
        pollNewMessages(partnerId);
      }
    };

    clearInterval(pollRef.current);
    pollRef.current = setInterval(tick, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [activePartner]);

  const fetchConversations = async () => {
    setConvLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/messages`, { headers });
      setConversations(res.data || []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
    setConvLoading(false);
  };

  const fetchMessages = async (partnerId) => {
    setMsgLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/messages/${partnerId}`, { headers });
      const data = res.data || [];
      setMessages(data);
      // Track the newest message timestamp for delta polling
      if (data.length > 0) {
        lastMessageAtRef.current = data[data.length - 1].createdAt;
      } else {
        lastMessageAtRef.current = new Date().toISOString();
      }
      // Mark conversation as read locally
      setConversations((prev) =>
        prev.map((c) =>
          String(c.partner._id) === String(partnerId) ? { ...c, unread: false } : c
        )
      );
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
    setMsgLoading(false);
  };

  // Only fetch messages NEWER than what we already have — no full reload
  const pollNewMessages = async (partnerId) => {
    if (!lastMessageAtRef.current) return;
    try {
      const since = encodeURIComponent(lastMessageAtRef.current);
      const res = await axios.get(
        `${API_BASE_URL}/messages/${partnerId}?since=${since}`,
        { headers }
      );
      const newMsgs = res.data || [];
      if (newMsgs.length === 0) return; // nothing new — no state update

      setMessages((prev) => [...prev, ...newMsgs]);
      lastMessageAtRef.current = newMsgs[newMsgs.length - 1].createdAt;

      // Only refresh conversations when something actually arrived
      const convRes = await axios.get(`${API_BASE_URL}/messages`, { headers });
      setConversations(convRes.data || []);
    } catch {
      // silent — don't spam errors on poll failures
    }
  };

  const openConversation = (partner) => {
    // Guard: don't re-open if this partner is already active
    if (activePartnerRef.current &&
        String(activePartnerRef.current._id) === String(partner._id)) return;

    clearInterval(pollRef.current);
    lastMessageAtRef.current = null;
    activePartnerRef.current = partner;
    setActivePartner(partner);
    setMessages([]);
    setMessageText("");
    fetchMessages(partner._id);
  };

  // Alias used from the URL-param effect — same guard logic
  const openConversationById = openConversation;

  const handleSend = async () => {
    if (!messageText.trim() || !activePartner) return;
    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    // Optimistic message
    const optimistic = {
      _id: `opt-${Date.now()}`,
      sender: { _id: myId },
      receiver: { _id: activePartner._id },
      text,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/messages/${activePartner._id}`,
        { text },
        { headers }
      );
      // Replace optimistic with real message and advance the poll cursor
      setMessages((prev) =>
        prev.map((m) => (m._id === optimistic._id ? res.data : m))
      );
      lastMessageAtRef.current = res.data.createdAt;
      // Refresh conversations to show latest message
      const convRes = await axios.get(`${API_BASE_URL}/messages`, { headers });
      setConversations(convRes.data || []);
    } catch (err) {
      console.error("Send failed:", err);
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setMessageText(text); // restore
    }
    setSending(false);
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const dateLabel = formatDate(msg.createdAt);
    if (dateLabel !== lastDate) {
      groupedMessages.push({ type: "date", label: dateLabel });
      lastDate = dateLabel;
    }
    groupedMessages.push({ type: "message", data: msg });
  });

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── Left: Conversations sidebar ──────────────────────────────────── */}
      <Box
        sx={{
          width: 300,
          borderRight: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6">Messages</Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto" }}>
          {convLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : conversations.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No conversations yet.
              </Typography>
            </Box>
          ) : (
            conversations.map((conv) => {
              const isActive = String(activePartner?._id) === String(conv.partner._id);
              const isMine =
                String(conv.lastMessage?.sender?._id) === String(myId);
              return (
                <Box
                  key={conv.partner._id}
                  onClick={() => openConversation(conv.partner)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    cursor: "pointer",
                    bgcolor: isActive ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: isActive ? "action.selected" : "action.hover" },
                  }}
                >
                  <Badge
                    color="primary"
                    variant="dot"
                    invisible={!conv.unread}
                    overlap="circular"
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    <Avatar
                      src={conv.partner.avatar}
                      sx={{ width: 44, height: 44, cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${conv.partner._id}`);
                      }}
                    >
                      {!conv.partner.avatar && <PersonIcon />}
                    </Avatar>
                  </Badge>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={conv.unread ? "bold" : "normal"}
                      noWrap
                    >
                      {conv.partner.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {isMine ? "You: " : ""}
                      {conv.lastMessage?.text || ""}
                    </Typography>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* ── Right: Chat window ───────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!activePartner ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "text.disabled",
              gap: 1,
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 64 }} />
            <Typography variant="body1">Select a conversation</Typography>
          </Box>
        ) : (
          <>
            {/* Chat header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Avatar
                src={activePartner.avatar}
                sx={{ width: 38, height: 38, cursor: "pointer" }}
                onClick={() => navigate(`/profile/${activePartner._id}`)}
              >
                {!activePartner.avatar && <PersonIcon />}
              </Avatar>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                onClick={() => navigate(`/profile/${activePartner._id}`)}
              >
                {activePartner.username}
              </Typography>
            </Box>

            {/* Messages area */}
            <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
              {msgLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", pt: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ textAlign: "center", mt: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No messages yet. Say hi!
                  </Typography>
                </Box>
              ) : (
                groupedMessages.map((item, idx) => {
                  if (item.type === "date") {
                    return (
                      <Box key={`date-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}>
                        <Divider sx={{ flex: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Divider sx={{ flex: 1 }} />
                      </Box>
                    );
                  }
                  const msg = item.data;
                  const isMine = String(msg.sender?._id) === String(myId);
                  return (
                    <Box
                      key={msg._id}
                      sx={{
                        display: "flex",
                        justifyContent: isMine ? "flex-end" : "flex-start",
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: "70%",
                          px: 1.5,
                          py: 1,
                          borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          bgcolor: isMine ? "primary.main" : (darkMode ? "grey.800" : "grey.200"),
                          color: isMine ? "primary.contrastText" : (darkMode ? "grey.100" : "text.primary"),
                          opacity: msg.optimistic ? 0.6 : 1,
                        }}
                      >
                        <Typography variant="body2">{msg.text}</Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            textAlign: "right",
                            mt: 0.25,
                            opacity: 0.7,
                            fontSize: "0.65rem",
                          }}
                        >
                          {formatTime(msg.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input row */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 1.5,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Write a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={sending || !messageText.trim()}
              >
                {sending ? <CircularProgress size={20} /> : <SendIcon />}
              </IconButton>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
