import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Container,
  Typography,
  Avatar,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Skeleton,
  Tabs,
  Tab,
  Grid,
  Tooltip,
  AvatarGroup,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PeopleIcon from "@mui/icons-material/People";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import PersonIcon from "@mui/icons-material/Person";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const STATUS_TABS = ["all", "planning", "ongoing", "completed"];

const STATUS_COLOR = {
  planning: "info",
  ongoing: "success",
  completed: "default",
};

const formatDateRange = (start, end) => {
  const fmt = (d) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return null;
};

export default function Trips() {
  const navigate = useNavigate();
  const myId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState(0); // 0=all,1=planning,2=ongoing,3=completed
  const [joiningId, setJoiningId] = useState(null);
  const sentinelRef = useRef(null);

  const fetchTrips = useCallback(
    async (pageNum, statusIdx, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      try {
        const status = STATUS_TABS[statusIdx];
        const params = `page=${pageNum}&limit=12${status !== "all" ? `&status=${status}` : ""}`;
        const res = await axios.get(`${API_BASE_URL}/trips?${params}`, { headers });
        const fetched = res.data.trips || [];
        setTrips((prev) => (append ? [...prev, ...fetched] : fetched));
        setHasMore(res.data.hasMore || false);
        setPage(pageNum);
      } catch (err) {
        console.error("Failed to fetch trips:", err);
      }
      if (!append) setLoading(false);
      else setLoadingMore(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    fetchTrips(1, activeTab, false);
  }, [activeTab, fetchTrips]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchTrips(page + 1, activeTab, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, trips.length, page, activeTab, fetchTrips]);

  const handleTabChange = (_, newVal) => {
    setActiveTab(newVal);
  };

  const handleJoinLeave = async (e, trip) => {
    e.stopPropagation();
    const wasAlreadyMember = isMember(trip);
    setJoiningId(trip._id);
    try {
      const res = await axios.put(`${API_BASE_URL}/trips/${trip._id}/join`, {}, { headers });
      setTrips((prev) => prev.map((t) => (t._id === trip._id ? res.data : t)));
      toast.success(wasAlreadyMember ? `Left "${trip.title}"` : `Joined "${trip.title}"!`);
    } catch (err) {
      console.error("Join/leave error:", err);
      toast.error("Something went wrong");
    }
    setJoiningId(null);
  };

  const isMember = (trip) => trip.members?.some((m) => String(m._id) === String(myId));
  const isCreator = (trip) => String(trip.creator?._id) === String(myId);

  // ── Skeleton loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ height: "100%", overflowY: "auto" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Skeleton variant="text" width={160} height={44} />
          <Skeleton variant="rounded" width={130} height={36} />
        </Box>
        <Skeleton variant="rounded" width={380} height={48} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card elevation={2} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <Skeleton variant="rectangular" width="100%" height={180} />
                <CardContent sx={{ flex: 1, pb: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Skeleton variant="rounded" width={72} height={22} />
                  </Box>
                  <Skeleton variant="text" width="80%" height={28} />
                  <Skeleton variant="text" width="60%" height={20} sx={{ mt: 0.5 }} />
                  <Skeleton variant="text" width="70%" height={20} />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5 }}>
                    <Skeleton variant="text" width="40%" height={20} />
                    <Skeleton variant="text" width="25%" height={20} />
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
                    <Skeleton variant="circular" width={26} height={26} />
                    <Skeleton variant="circular" width={26} height={26} />
                    <Skeleton variant="circular" width={26} height={26} />
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 1 }}>
                  <Skeleton variant="rounded" width={80} height={32} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflowY: "auto" }}>
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Trips
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/create-trip")}
        >
          Create Trip
        </Button>
      </Box>

      {/* Status filter tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="All" />
        <Tab label="Planning" />
        <Tab label="Ongoing" />
        <Tab label="Completed" />
      </Tabs>

      {trips.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10 }}>
          <ExploreOutlinedIcon sx={{ fontSize: 72, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No trips found
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Be the first to create one!
          </Typography>
        </Box>
      ) : (
        <>
          <Grid
            container spacing={3}
            component={motion.div}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {trips.map((trip) => {
              const amMember = isMember(trip);
              const amCreator = isCreator(trip);
              const full =
                trip.maxParticipants && trip.members?.length >= trip.maxParticipants && !amMember;
              const dateRange = formatDateRange(trip.startDate, trip.endDate);

              return (
                <Grid item xs={12} sm={6} md={4} key={trip._id}>
                  <motion.div
                    variants={cardVariants}
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{ height: "100%" }}
                  >
                  <Card
                    elevation={2}
                    sx={{
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      "&:hover": { boxShadow: 6 },
                      transition: "box-shadow 0.2s",
                    }}
                    onClick={() => navigate(`/trips/${trip._id}`)}
                  >
                    {/* Cover image */}
                    {trip.coverImage?.length > 0 ? (
                      <CardMedia
                        component="img"
                        height="180"
                        image={trip.coverImage[0]}
                        alt={trip.title}
                        sx={{ objectFit: "cover" }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 180,
                          bgcolor: "action.hover",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ExploreOutlinedIcon sx={{ fontSize: 56, color: "text.disabled" }} />
                      </Box>
                    )}

                    <CardContent sx={{ flex: 1, pb: 0 }}>
                      {/* Status + title */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Chip
                          label={trip.status}
                          color={STATUS_COLOR[trip.status] || "default"}
                          size="small"
                          sx={{ textTransform: "capitalize" }}
                        />
                      </Box>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {trip.title}
                      </Typography>

                      {/* Destination */}
                      {trip.destination && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                          <PlaceIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {trip.destination}
                          </Typography>
                        </Box>
                      )}

                      {/* Dates */}
                      {dateRange && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                          <CalendarTodayIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                          <Typography variant="caption" color="text.secondary">
                            {dateRange}
                          </Typography>
                        </Box>
                      )}

                      {/* Creator + members */}
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Avatar src={trip.creator?.avatar} sx={{ width: 22, height: 22 }}>
                            {!trip.creator?.avatar && <PersonIcon sx={{ fontSize: 14 }} />}
                          </Avatar>
                          <Typography variant="caption" color="text.secondary">
                            {trip.creator?.username}
                          </Typography>
                        </Box>

                        <Tooltip
                          title={`${trip.members?.length || 0}${trip.maxParticipants ? `/${trip.maxParticipants}` : ""} members`}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <PeopleIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">
                              {trip.members?.length || 0}
                              {trip.maxParticipants ? `/${trip.maxParticipants}` : ""}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>

                      {/* Member avatars */}
                      {trip.members?.length > 0 && (
                        <AvatarGroup
                          max={5}
                          sx={{ justifyContent: "flex-start", mt: 1, "& .MuiAvatar-root": { width: 26, height: 26, fontSize: "0.7rem" } }}
                        >
                          {trip.members.map((m) => (
                            <Avatar key={m._id} src={m.avatar} alt={m.username}>
                              {!m.avatar && <PersonIcon sx={{ fontSize: 14 }} />}
                            </Avatar>
                          ))}
                        </AvatarGroup>
                      )}
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 2, pt: 1 }}>
                      {!amCreator && (
                        <Button
                          size="small"
                          variant={amMember ? "outlined" : "contained"}
                          disabled={joiningId === trip._id || (full && !amMember)}
                          onClick={(e) => handleJoinLeave(e, trip)}
                          startIcon={joiningId === trip._id ? <CircularProgress size={14} /> : null}
                        >
                          {joiningId === trip._id
                            ? ""
                            : full
                            ? "Full"
                            : amMember
                            ? "Leave"
                            : "Join"}
                        </Button>
                      )}
                      {amCreator && (
                        <Chip label="Your trip" size="small" variant="outlined" color="primary" />
                      )}
                    </CardActions>
                  </Card>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>

          <Box ref={sentinelRef} sx={{ height: 1 }} />
          {loadingMore && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </>
      )}
    </Container>
    </Box>
  );
}
