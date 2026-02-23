import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Avatar,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Divider,
  Badge,
  Tooltip,
  Dialog,
  DialogContent,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PlaceIcon from "@mui/icons-material/Place";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";

const POLL_INTERVAL = 5000;

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { darkMode } = useTheme();
  const myId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Edit state
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Hover state (for showing edit/delete buttons)
  const [hoveredMsgId, setHoveredMsgId] = useState(null);

  // Post preview dialog
  const [postPreview, setPostPreview] = useState(null);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const lastMessageAtRef = useRef(null);
  const activePartnerRef = useRef(null);
  const openedFromUrlRef = useRef(null);

  // ── Load conversations on mount ──────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
  }, []);

  // ── Handle ?with=userId query param ──────────────────────────────────────
  useEffect(() => {
    const withId = searchParams.get("with");
    if (!withId || openedFromUrlRef.current === withId) return;
    openedFromUrlRef.current = withId;
    axios
      .get(`${API_BASE_URL}/users/${withId}`, { headers })
      .then((res) => openConversation(res.data))
      .catch(console.error);
  }, [searchParams]);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activePartner) { clearInterval(pollRef.current); return; }
    const tick = () => {
      const partnerId = activePartnerRef.current?._id;
      if (partnerId && document.visibilityState === "visible") pollNewMessages(partnerId);
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
      lastMessageAtRef.current = data.length > 0
        ? data[data.length - 1].createdAt
        : new Date().toISOString();
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

  const pollNewMessages = async (partnerId) => {
    if (!lastMessageAtRef.current) return;
    try {
      const since = encodeURIComponent(lastMessageAtRef.current);
      const res = await axios.get(`${API_BASE_URL}/messages/${partnerId}?since=${since}`, { headers });
      const newMsgs = res.data || [];
      if (newMsgs.length === 0) return;
      setMessages((prev) => [...prev, ...newMsgs]);
      lastMessageAtRef.current = newMsgs[newMsgs.length - 1].createdAt;
      const convRes = await axios.get(`${API_BASE_URL}/messages`, { headers });
      setConversations(convRes.data || []);
    } catch { /* silent */ }
  };

  const openConversation = (partner) => {
    if (activePartnerRef.current &&
        String(activePartnerRef.current._id) === String(partner._id)) return;
    clearInterval(pollRef.current);
    lastMessageAtRef.current = null;
    activePartnerRef.current = partner;
    setActivePartner(partner);
    setMessages([]);
    setMessageText("");
    setEditingMsgId(null);
    fetchMessages(partner._id);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!messageText.trim() || !activePartner) return;
    const text = messageText.trim();
    setMessageText("");
    setSending(true);
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
      const res = await axios.post(`${API_BASE_URL}/messages/${activePartner._id}`, { text }, { headers });
      setMessages((prev) => prev.map((m) => (m._id === optimistic._id ? res.data : m)));
      lastMessageAtRef.current = res.data.createdAt;
      const convRes = await axios.get(`${API_BASE_URL}/messages`, { headers });
      setConversations(convRes.data || []);
    } catch (err) {
      console.error("Send failed:", err);
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setMessageText(text);
    }
    setSending(false);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const startEdit = (msg) => {
    setEditingMsgId(msg._id);
    setEditText(msg.text);
  };

  const cancelEdit = () => {
    setEditingMsgId(null);
    setEditText("");
  };

  const handleEditSave = async (msgId) => {
    if (!editText.trim()) return;
    setEditSaving(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/messages/${msgId}/edit`,
        { text: editText.trim() },
        { headers }
      );
      setMessages((prev) => prev.map((m) => (m._id === msgId ? res.data : m)));
      setEditingMsgId(null);
    } catch (err) {
      console.error("Edit failed:", err);
    }
    setEditSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (msgId) => {
    setMessages((prev) => prev.filter((m) => m._id !== msgId));
    try {
      await axios.delete(`${API_BASE_URL}/messages/${msgId}`, { headers });
      const convRes = await axios.get(`${API_BASE_URL}/messages`, { headers });
      setConversations(convRes.data || []);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
    const label = formatDate(msg.createdAt);
    if (label !== lastDate) {
      groupedMessages.push({ type: "date", label });
      lastDate = label;
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
              <Typography variant="body2" color="text.secondary">No conversations yet.</Typography>
            </Box>
          ) : (
            conversations.map((conv) => {
              const isActive = String(activePartner?._id) === String(conv.partner._id);
              const isMine = String(conv.lastMessage?.sender?._id) === String(myId);
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
                  <Badge color="primary" variant="dot" invisible={!conv.unread} overlap="circular" anchorOrigin={{ vertical: "top", horizontal: "right" }}>
                    <Avatar
                      src={conv.partner.avatar}
                      sx={{ width: 44, height: 44, cursor: "pointer" }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${conv.partner._id}`); }}
                    >
                      {!conv.partner.avatar && <PersonIcon />}
                    </Avatar>
                  </Badge>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={conv.unread ? "bold" : "normal"} noWrap>
                      {conv.partner.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {isMine ? "You: " : ""}
                      {conv.lastMessage?.postRef ? "📎 Shared a post" : conv.lastMessage?.text || ""}
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
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "text.disabled", gap: 1 }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 64 }} />
            <Typography variant="body1">Select a conversation</Typography>
          </Box>
        ) : (
          <>
            {/* Chat header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Avatar src={activePartner.avatar} sx={{ width: 38, height: 38, cursor: "pointer" }} onClick={() => navigate(`/profile/${activePartner._id}`)}>
                {!activePartner.avatar && <PersonIcon />}
              </Avatar>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }} onClick={() => navigate(`/profile/${activePartner._id}`)}>
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
                  <Typography variant="body2" color="text.secondary">No messages yet. Say hi!</Typography>
                </Box>
              ) : (
                <AnimatePresence initial={false}>
                  {groupedMessages.map((item, idx) => {
                    if (item.type === "date") {
                      return (
                        <Box key={`date-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}>
                          <Divider sx={{ flex: 1 }} />
                          <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                          <Divider sx={{ flex: 1 }} />
                        </Box>
                      );
                    }

                    const msg = item.data;
                    const isMine = String(msg.sender?._id) === String(myId);
                    const isEditing = editingMsgId === msg._id;
                    const isHovered = hoveredMsgId === msg._id;

                    return (
                      <motion.div
                        key={msg._id}
                        initial={{ opacity: 0, x: isMine ? 20 : -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}
                        onMouseEnter={() => setHoveredMsgId(msg._id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        {/* Edit/delete actions — only on own messages, shown on hover */}
                        {isMine && !isEditing && !msg.optimistic && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.25,
                              mr: 0.5,
                              opacity: isHovered ? 1 : 0,
                              transition: "opacity 0.15s",
                              pointerEvents: isHovered ? "auto" : "none",
                            }}
                          >
                            {!msg.postRef && (
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => startEdit(msg)} sx={{ p: 0.5 }}>
                                  <EditIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDelete(msg._id)} sx={{ p: 0.5 }}>
                                <DeleteIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}

                        {isEditing ? (
                          /* Inline edit field */
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, maxWidth: "70%" }}>
                            <TextField
                              size="small"
                              autoFocus
                              fullWidth
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSave(msg._id); }
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                            <Tooltip title="Save">
                              <IconButton size="small" color="primary" onClick={() => handleEditSave(msg._id)} disabled={editSaving || !editText.trim()}>
                                {editSaving ? <CircularProgress size={14} /> : <CheckIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel">
                              <IconButton size="small" onClick={cancelEdit}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ) : (
                          /* Message bubble */
                          <Box
                            sx={{
                              maxWidth: "70%",
                              borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                              overflow: "hidden",
                              bgcolor: isMine ? "primary.main" : (darkMode ? "grey.800" : "grey.200"),
                              color: isMine ? "primary.contrastText" : (darkMode ? "grey.100" : "text.primary"),
                              opacity: msg.optimistic ? 0.6 : 1,
                            }}
                          >
                            {msg.postRef ? (
                              /* Post card */
                              <Box
                                sx={{ cursor: "pointer" }}
                                onClick={() => setPostPreview(msg.postRef)}
                              >
                                {msg.postRef.image?.[0] && (
                                  <Box
                                    component="img"
                                    src={msg.postRef.image[0]}
                                    alt={msg.postRef.title}
                                    sx={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                                  />
                                )}
                                <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
                                  <Typography variant="body2" fontWeight="bold" noWrap>
                                    {msg.postRef.title}
                                  </Typography>
                                  {msg.postRef.location && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                                      <PlaceIcon sx={{ fontSize: 12, opacity: 0.7 }} />
                                      <Typography variant="caption" sx={{ opacity: 0.8 }} noWrap>
                                        {msg.postRef.location}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            ) : (
                              <Box sx={{ px: 1.5, py: 1 }}>
                                <Typography variant="body2">{msg.text}</Typography>
                              </Box>
                            )}
                            <Box sx={{ px: 1.5, pb: 0.75 }}>
                              <Typography variant="caption" sx={{ display: "block", textAlign: "right", opacity: 0.7, fontSize: "0.65rem" }}>
                                {msg.edited && <span style={{ marginRight: 4 }}>edited ·</span>}
                                {formatTime(msg.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input row */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Write a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              <IconButton color="primary" onClick={handleSend} disabled={sending || !messageText.trim()}>
                {sending ? <CircularProgress size={20} /> : <SendIcon />}
              </IconButton>
            </Box>
          </>
        )}
      </Box>

      {/* ── Post preview dialog ───────────────────────────────────────────── */}
      <Dialog open={!!postPreview} onClose={() => setPostPreview(null)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          {postPreview?.image?.[0] && (
            <Box
              component="img"
              src={postPreview.image[0]}
              alt={postPreview.title}
              sx={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block" }}
            />
          )}
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold">{postPreview?.title}</Typography>
            {postPreview?.location && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                <PlaceIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">{postPreview.location}</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
