import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Avatar,
  AvatarGroup,
  IconButton,
  Button,
  TextField,
  CircularProgress,
  Chip,
  Divider,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";

const POLL_INTERVAL = 5000;

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const renderMessageText = (text) => {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit", textDecorationColor: "currentcolor" }}
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
};

const STATUS_COLOR = { planning: "info", ongoing: "success", completed: "default" };

const formatDateRange = (start, end) => {
  const fmt = (d) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return null;
};

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

export default function TripDetail() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const myId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [trip, setTrip] = useState(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // AI assistant
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAsking, setAiAsking] = useState(false);

  // Status edit
  const [editStatusOpen, setEditStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const lastMessageAtRef = useRef(null);

  // ── Load trip ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const fetchTrip = async () => {
    setTripLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/trips/${tripId}`, { headers });
      setTrip(res.data);
    } catch (err) {
      console.error("Failed to fetch trip:", err);
    }
    setTripLoading(false);
  };

  // ── Load messages when user is a member ──────────────────────────────────
  const isMember = trip?.members?.some((m) => String(m._id) === String(myId));

  useEffect(() => {
    if (!isMember) return;
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMember, tripId]);

  const fetchMessages = async () => {
    setMsgLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/trips/${tripId}/messages`, { headers });
      const data = res.data || [];
      setMessages(data);
      lastMessageAtRef.current = data.length > 0 ? data[data.length - 1].createdAt : new Date().toISOString();
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
    setMsgLoading(false);
  };

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMember) return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (document.visibilityState === "visible" && lastMessageAtRef.current) {
        pollNewMessages();
      }
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMember, tripId]);

  const pollNewMessages = async () => {
    try {
      const since = encodeURIComponent(lastMessageAtRef.current);
      const res = await axios.get(`${API_BASE_URL}/trips/${tripId}/messages?since=${since}`, { headers });
      const newMsgs = res.data || [];
      if (newMsgs.length === 0) return;
      setMessages((prev) => [...prev, ...newMsgs]);
      lastMessageAtRef.current = newMsgs[newMsgs.length - 1].createdAt;
    } catch {
      // silent
    }
  };

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!messageText.trim()) return;
    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    const optimistic = {
      _id: `opt-${Date.now()}`,
      sender: { _id: myId, username: "You" },
      text,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await axios.post(`${API_BASE_URL}/trips/${tripId}/messages`, { text }, { headers });
      setMessages((prev) => prev.map((m) => (m._id === optimistic._id ? res.data : m)));
      lastMessageAtRef.current = res.data.createdAt;
    } catch (err) {
      console.error("Send failed:", err);
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setMessageText(text);
    }
    setSending(false);
  };

  // ── Ask AI ────────────────────────────────────────────────────────────────
  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;
    const question = aiQuestion.trim();
    setAiAsking(true);
    setAiDialogOpen(false);
    setAiQuestion("");

    // Optimistic local placeholder while waiting
    const optimisticId = `ai-q-${Date.now()}`;
    setMessages((prev) => [...prev, {
      _id: optimisticId,
      sender: { _id: myId, username: "You" },
      text: question,
      createdAt: new Date().toISOString(),
      optimistic: true,
    }]);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/ai/ask-trip`,
        { tripId, question },
        { headers }
      );
      const { userMessage, aiMessage } = res.data;
      // Replace optimistic with real saved messages
      setMessages((prev) => [
        ...prev.filter((m) => m._id !== optimisticId),
        userMessage,
        aiMessage,
      ]);
      lastMessageAtRef.current = aiMessage.createdAt;
    } catch (err) {
      console.error("AI ask error:", err);
      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
    }
    setAiAsking(false);
  };

  // ── Join / Leave ──────────────────────────────────────────────────────────
  const handleJoinLeave = async () => {
    setJoining(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/trips/${tripId}/join`, {}, { headers });
      setTrip(res.data);
    } catch (err) {
      console.error("Join/leave error:", err);
    }
    setJoining(false);
  };

  // ── Update status ─────────────────────────────────────────────────────────
  const handleSaveStatus = async () => {
    setSavingStatus(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/trips/${tripId}`, { status: newStatus }, { headers });
      setTrip(res.data);
    } catch (err) {
      console.error("Status update error:", err);
    }
    setSavingStatus(false);
    setEditStatusOpen(false);
  };

  // ── Delete trip ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/trips/${tripId}`, { headers });
      navigate("/trips");
    } catch (err) {
      console.error("Delete error:", err);
    }
    setDeleting(false);
  };

  // ── Group messages by date ────────────────────────────────────────────────
  const groupedMessages = [];
  let lastDateLabel = null;
  messages.forEach((msg) => {
    const label = formatDate(msg.createdAt);
    if (label !== lastDateLabel) {
      groupedMessages.push({ type: "date", label });
      lastDateLabel = label;
    }
    groupedMessages.push({ type: "message", data: msg });
  });

  // ── Loading state ─────────────────────────────────────────────────────────
  if (tripLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!trip) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 2 }}>
        <Typography color="text.secondary">Trip not found.</Typography>
        <Button onClick={() => navigate("/trips")}>Back to Trips</Button>
      </Box>
    );
  }

  const isCreator = String(trip.creator?._id) === String(myId);
  const dateRange = formatDateRange(trip.startDate, trip.endDate);

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── Left panel: trip info ─────────────────────────────────────────── */}
      <Box
        sx={{
          width: 380,
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Back + actions */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.5,
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <IconButton onClick={() => navigate("/trips")} size="small">
            <ArrowBackIcon />
          </IconButton>
          {isCreator && (
            <Box>
              <Tooltip title="Change status">
                <IconButton
                  size="small"
                  onClick={() => {
                    setNewStatus(trip.status);
                    setEditStatusOpen(true);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete trip">
                <IconButton size="small" color="error" onClick={() => setDeleteOpen(true)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Cover image */}
        {trip.coverImage?.length > 0 && (
          <Box
            component="img"
            src={trip.coverImage[0]}
            alt={trip.title}
            sx={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
          />
        )}

        <Box sx={{ p: 2 }}>
          {/* Status + title */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Chip
              label={trip.status}
              color={STATUS_COLOR[trip.status] || "default"}
              size="small"
              sx={{ textTransform: "capitalize" }}
            />
          </Box>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
            {trip.title}
          </Typography>

          {/* Destination */}
          {trip.destination && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <PlaceIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">{trip.destination}</Typography>
            </Box>
          )}

          {/* Dates */}
          {dateRange && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <CalendarTodayIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">{dateRange}</Typography>
            </Box>
          )}

          {/* Description */}
          {trip.description && (
            <Typography variant="body2" sx={{ mt: 1, mb: 1 }} color="text.secondary">
              {trip.description}
            </Typography>
          )}

          <Divider sx={{ my: 1.5 }} />

          {/* Creator */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              "&:hover": { bgcolor: "action.hover" },
              borderRadius: 1,
              p: 0.5,
              mx: -0.5,
            }}
            onClick={() => navigate(`/profile/${trip.creator?._id}`)}
          >
            <Avatar src={trip.creator?.avatar} sx={{ width: 32, height: 32 }}>
              {!trip.creator?.avatar && <PersonIcon />}
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.disabled">Creator</Typography>
              <Typography variant="body2" fontWeight="bold">{trip.creator?.username}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Members */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
            <PeopleIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" fontWeight="bold">
              Members ({trip.members?.length || 0}
              {trip.maxParticipants ? `/${trip.maxParticipants}` : ""})
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {trip.members?.map((m) => (
              <Box
                key={m._id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "pointer",
                  borderRadius: 1,
                  p: 0.5,
                  mx: -0.5,
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => navigate(`/profile/${m._id}`)}
              >
                <Avatar src={m.avatar} sx={{ width: 28, height: 28 }}>
                  {!m.avatar && <PersonIcon sx={{ fontSize: 16 }} />}
                </Avatar>
                <Typography variant="body2">{m.username}</Typography>
                {String(m._id) === String(trip.creator?._id) && (
                  <Chip label="creator" size="small" variant="outlined" sx={{ ml: "auto", fontSize: "0.65rem", height: 18 }} />
                )}
              </Box>
            ))}
          </Box>

          {/* Join / Leave button */}
          {!isCreator && (
            <Button
              fullWidth
              variant={isMember ? "outlined" : "contained"}
              onClick={handleJoinLeave}
              disabled={
                joining ||
                (!isMember && trip.maxParticipants && trip.members?.length >= trip.maxParticipants)
              }
              startIcon={joining ? <CircularProgress size={16} /> : null}
              sx={{ mt: 2 }}
            >
              {joining
                ? ""
                : !isMember && trip.maxParticipants && trip.members?.length >= trip.maxParticipants
                ? "Trip is full"
                : isMember
                ? "Leave Trip"
                : "Join Trip"}
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Right panel: group chat ───────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Chat header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <ChatBubbleOutlineIcon color="action" />
          <Typography variant="subtitle1" fontWeight="bold">
            Group Chat
          </Typography>
          {isMember && (
            <Tooltip title="Ask AI travel assistant">
              <Button
                size="small"
                variant="outlined"
                startIcon={aiAsking ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />}
                onClick={() => setAiDialogOpen(true)}
                disabled={aiAsking}
                sx={{ ml: 1 }}
              >
                {aiAsking ? "Thinking…" : "Ask AI"}
              </Button>
            </Tooltip>
          )}
          <AvatarGroup
            max={4}
            sx={{ ml: "auto", "& .MuiAvatar-root": { width: 24, height: 24, fontSize: "0.65rem" } }}
          >
            {trip.members?.map((m) => (
              <Avatar key={m._id} src={m.avatar} alt={m.username}>
                {!m.avatar && <PersonIcon sx={{ fontSize: 12 }} />}
              </Avatar>
            ))}
          </AvatarGroup>
        </Box>

        {/* Messages area */}
        {!isMember ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              color: "text.disabled",
              p: 3,
              textAlign: "center",
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 56 }} />
            <Typography variant="body1">Join the trip to see the group chat</Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              {msgLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", pt: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ textAlign: "center", mt: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No messages yet. Say hello!
                  </Typography>
                </Box>
              ) : (
                groupedMessages.map((item, idx) => {
                  if (item.type === "date") {
                    return (
                      <Box
                        key={`date-${idx}`}
                        sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}
                      >
                        <Divider sx={{ flex: 1 }} />
                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                        <Divider sx={{ flex: 1 }} />
                      </Box>
                    );
                  }
                  const msg = item.data;
                  const isMine = String(msg.sender?._id) === String(myId);
                  const isAIMsg = msg.isAI === true;
                  return (
                    <Box
                      key={msg._id}
                      sx={{
                        display: "flex",
                        flexDirection: isMine ? "row-reverse" : "row",
                        alignItems: "flex-end",
                        gap: 0.75,
                      }}
                    >
                      {/* Sender avatar (only for others) */}
                      {!isMine && (
                        <Tooltip title={msg.sender?.username}>
                          <Avatar
                            src={isAIMsg ? undefined : msg.sender?.avatar}
                            sx={{
                              width: 28, height: 28, flexShrink: 0,
                              cursor: isAIMsg ? "default" : "pointer",
                              bgcolor: isAIMsg ? "secondary.main" : undefined,
                            }}
                            onClick={isAIMsg ? undefined : () => navigate(`/profile/${msg.sender?._id}`)}
                          >
                            {isAIMsg
                              ? <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                              : !msg.sender?.avatar && <PersonIcon sx={{ fontSize: 16 }} />
                            }
                          </Avatar>
                        </Tooltip>
                      )}

                      <Box sx={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                        {/* Sender name (only for others) */}
                        {!isMine && (
                          <Typography
                            variant="caption"
                            color={isAIMsg ? "secondary.main" : "text.secondary"}
                            fontWeight={isAIMsg ? "bold" : "normal"}
                            sx={{ mb: 0.25, ml: 0.5, cursor: isAIMsg ? "default" : "pointer", "&:hover": { textDecoration: isAIMsg ? "none" : "underline" } }}
                            onClick={isAIMsg ? undefined : () => navigate(`/profile/${msg.sender?._id}`)}
                          >
                            {msg.sender?.username}
                          </Typography>
                        )}
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            bgcolor: isAIMsg
                              ? darkMode ? "secondary.dark" : "secondary.50"
                              : isMine
                              ? "primary.main"
                              : darkMode ? "grey.800" : "grey.200",
                            color: isAIMsg
                              ? darkMode ? "white" : "secondary.dark"
                              : isMine ? "primary.contrastText"
                              : darkMode ? "grey.100" : "text.primary",
                            border: isAIMsg ? "1px solid" : "none",
                            borderColor: isAIMsg ? "secondary.main" : "transparent",
                            opacity: msg.optimistic ? 0.6 : 1,
                          }}
                        >
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{renderMessageText(msg.text)}</Typography>
                          <Typography
                            variant="caption"
                            sx={{ display: "block", textAlign: "right", mt: 0.25, opacity: 0.7, fontSize: "0.65rem" }}
                          >
                            {formatTime(msg.createdAt)}
                          </Typography>
                        </Box>
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

      {/* ── Ask AI dialog ─────────────────────────────────────────────────── */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesomeIcon color="secondary" />
          Ask AI Travel Assistant
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ask anything about {trip.destination || "your destination"} — packing tips, best spots, weather, local customs…
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            placeholder={`e.g. What should we pack for ${trip.destination || "this trip"}?`}
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskAI(); }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAiDialogOpen(false); setAiQuestion(""); }}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleAskAI}
            disabled={!aiQuestion.trim()}
            startIcon={<AutoAwesomeIcon />}
          >
            Ask
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit status dialog ─────────────────────────────────────────────── */}
      <Dialog open={editStatusOpen} onClose={() => setEditStatusOpen(false)}>
        <DialogTitle>Change Trip Status</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              label="Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <MenuItem value="planning">Planning</MenuItem>
              <MenuItem value="ongoing">Ongoing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditStatusOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveStatus} disabled={savingStatus}>
            {savingStatus ? <CircularProgress size={18} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm dialog ──────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Trip?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete "{trip.title}" and all its group chat messages. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
