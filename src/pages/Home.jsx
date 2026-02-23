import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Container,
  Grid,
  Typography,
  Avatar,
  Card,
  CardContent,
  IconButton,
  Button,
  CircularProgress,
  Skeleton,
  Dialog,
  DialogContent,
  Divider,
  TextField,
  Tooltip,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PersonIcon from "@mui/icons-material/Person";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PlaceIcon from "@mui/icons-material/Place";
import SendIcon from "@mui/icons-material/Send";
import NearMeOutlinedIcon from "@mui/icons-material/NearMeOutlined";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const SUGGEST_EVERY = 4;

export default function Home() {
  const navigate = useNavigate();
  const myId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [suggestedForFeed, setSuggestedForFeed] = useState([]);

  const [followLoadingIds, setFollowLoadingIds] = useState(new Set());
  const [followingSet, setFollowingSet] = useState(new Set());

  const [selectedPost, setSelectedPost] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalImagesLoading, setModalImagesLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Share state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePostRef, setSharePostRef] = useState(null);
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [sharingSendingId, setSharingSendingId] = useState(null);

  const sentinelRef = useRef(null);
  const myFollowersRef = useRef([]);
  const allUsersRef = useRef([]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const meRes = await axios.get(`${API_BASE_URL}/users/${myId}`, { headers });
      const myFollowing = meRes.data.following || [];
      const myFollowers = meRes.data.followers || [];
      setFollowing(myFollowing);
      setFollowingSet(new Set(myFollowing.map(String)));
      myFollowersRef.current = myFollowers;

      if (myFollowing.length > 0) {
        const [feedRes, usersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/posts/feed?page=1&limit=10`, { headers }),
          axios.get(`${API_BASE_URL}/users`, { headers }),
        ]);

        const fetchedPosts = feedRes.data.posts || [];
        setHasMore(feedRes.data.hasMore || false);
        setPage(1);

        const allUsers = usersRes.data || [];
        allUsersRef.current = allUsers;

        const nonFollowed = allUsers
          .filter(
            (u) =>
              String(u._id) !== String(myId) &&
              !myFollowing.map(String).includes(String(u._id))
          )
          .sort(() => Math.random() - 0.5)
          .slice(0, 10);
        setSuggestedForFeed(nonFollowed);

        const thumbnailUrls = fetchedPosts.map((p) => p.image?.[0]).filter(Boolean);
        if (thumbnailUrls.length === 0) {
          setFeedPosts(fetchedPosts);
          setLoading(false);
        } else {
          let loaded = 0;
          thumbnailUrls.forEach((url) => {
            const img = new Image();
            img.onload = img.onerror = () => {
              loaded++;
              if (loaded === thumbnailUrls.length) {
                setFeedPosts(fetchedPosts);
                setLoading(false);
              }
            };
            img.src = url;
          });
        }
        return;
      } else {
        const usersRes = await axios.get(`${API_BASE_URL}/users`, { headers });
        const allUsers = usersRes.data || [];
        allUsersRef.current = allUsers;
        const others = allUsers.filter((u) => String(u._id) !== String(myId));
        setSuggestedUsers(others.sort(() => Math.random() - 0.5));
      }
    } catch (err) {
      console.error("Home init error:", err);
    }
    setLoading(false);
  };

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) handleLoadMore(); },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, feedPosts.length]);

  // ── Follow ────────────────────────────────────────────────────────────────
  const handleFollowSuggested = async (userId) => {
    setFollowLoadingIds((prev) => new Set(prev).add(userId));
    try {
      const res = await axios.put(`${API_BASE_URL}/users/${userId}/follow`, {}, { headers });
      const updatedFollowers = res.data.followers || [];
      const nowFollowing = updatedFollowers.map(String).includes(String(myId));
      const userObj = allUsersRef.current.find((u) => String(u._id) === String(userId));
      toast.success(nowFollowing ? `Now following ${userObj?.username || "user"}` : `Unfollowed ${userObj?.username || "user"}`);
      setFollowingSet((prev) => {
        const next = new Set(prev);
        if (nowFollowing) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
      if (nowFollowing) {
        const newFollowing = [...following, userId];
        setFollowing(newFollowing);
        if (newFollowing.length > 0) {
          const feedRes = await axios.get(`${API_BASE_URL}/posts/feed?page=1&limit=10`, { headers });
          setFeedPosts(feedRes.data.posts || []);
          setHasMore(feedRes.data.hasMore || false);
          setPage(1);
        }
      } else {
        setFollowing((prev) => prev.filter((id) => String(id) !== String(userId)));
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
    setFollowLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const feedRes = await axios.get(
        `${API_BASE_URL}/posts/feed?page=${nextPage}&limit=10`,
        { headers }
      );
      setFeedPosts((prev) => [...prev, ...(feedRes.data.posts || [])]);
      setHasMore(feedRes.data.hasMore || false);
      setPage(nextPage);
    } catch (err) {
      console.error("Load more error:", err);
    }
    setLoadingMore(false);
  };

  // ── Post helpers ──────────────────────────────────────────────────────────
  const isPostLiked = (post) =>
    Array.isArray(post?.likes) && post.likes.map(String).includes(String(myId));

  const handleLike = async (postId) => {
    const post = feedPosts.find((p) => p._id === postId);
    if (!post) return;
    const liked = isPostLiked(post);
    const newLikes = liked
      ? post.likes.filter((id) => String(id) !== String(myId))
      : [...post.likes, myId];
    setFeedPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, likes: newLikes } : p)));
    if (selectedPost?._id === postId) setSelectedPost((prev) => ({ ...prev, likes: newLikes }));
    try {
      await axios.put(`${API_BASE_URL}/posts/${postId}/like`, {}, { headers });
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleOpenModal = (post) => {
    setSelectedPost(post);
    setCurrentImageIndex(0);
    setCommentText("");
    if (!post.image?.length) return;
    setModalImagesLoading(true);
    let loaded = 0;
    post.image.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded === post.image.length) setModalImagesLoading(false);
      };
      img.src = url;
    });
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    setCurrentImageIndex(0);
    setCommentText("");
    setModalImagesLoading(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedPost) return;
    setCommentLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/posts/${selectedPost._id}/comment`,
        { text: commentText },
        { headers }
      );
      const newComment = res.data;
      const appendComment = (posts) =>
        posts.map((p) =>
          p._id === selectedPost._id
            ? { ...p, comments: [...(p.comments || []), newComment] }
            : p
        );
      setFeedPosts(appendComment);
      setSelectedPost((prev) => ({ ...prev, comments: [...(prev.comments || []), newComment] }));
      setCommentText("");
      toast.success("Comment posted!");
    } catch (err) {
      console.error("Comment error:", err);
    }
    setCommentLoading(false);
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleOpenShare = (post) => {
    setSharePostRef(post);
    const followerIds = new Set(myFollowersRef.current.map(String));
    const mutual = allUsersRef.current.filter(
      (u) => String(u._id) !== String(myId) &&
             followingSet.has(String(u._id)) &&
             followerIds.has(String(u._id))
    );
    setMutualFollowers(mutual);
    setShareDialogOpen(true);
  };

  const handleSendShare = async (toUserId) => {
    if (!sharePostRef || sharingSendingId) return;
    setSharingSendingId(toUserId);
    try {
      const post = sharePostRef;
      const text = `📎 Shared a post`;
      await axios.post(`${API_BASE_URL}/messages/${toUserId}`, { text, postId: post._id }, { headers });
      const toUser = mutualFollowers.find((u) => String(u._id) === String(toUserId));
      toast.success(`Sent to ${toUser?.username || "them"}!`);
      setShareDialogOpen(false);
      setSharePostRef(null);
    } catch (err) {
      console.error("Share error:", err);
    }
    setSharingSendingId(null);
  };

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Skeleton variant="text" width={140} height={40} sx={{ mb: 3 }} />
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[1, 2, 3].map((i) => (
            <Card key={i} elevation={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5 }}>
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="text" width="25%" height={16} />
                </Box>
              </Box>
              <Skeleton variant="rectangular" width="100%" height={260} />
              <CardContent>
                <Skeleton variant="text" width="65%" height={24} />
                <Skeleton variant="text" width="45%" height={18} />
                <Skeleton variant="text" width="90%" height={18} />
                <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={24} sx={{ alignSelf: "center" }} />
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={24} sx={{ alignSelf: "center" }} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (following.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ textAlign: "center", mb: 5 }}>
          <PeopleOutlineIcon sx={{ fontSize: 72, color: "text.disabled", mb: 2 }} />
          <Typography variant="h5" gutterBottom>Your feed is empty</Typography>
          <Typography color="text.secondary">Follow people to see their posts here.</Typography>
        </Box>

        <Typography variant="h6" sx={{ mb: 2 }}>Suggested for you</Typography>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
            pb: 2,
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": { borderRadius: 3, bgcolor: "divider" },
          }}
        >
          {suggestedUsers.length === 0 ? (
            <Typography color="text.secondary">No users found.</Typography>
          ) : (
            suggestedUsers.map((u) => {
              const iAmFollowing = followingSet.has(String(u._id));
              const isLoadingFollow = followLoadingIds.has(u._id);
              return (
                <Box
                  key={u._id}
                  sx={{
                    minWidth: 160, border: "1px solid", borderColor: "divider",
                    borderRadius: 2, p: 2, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 1, flexShrink: 0, cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={(e) => { if (e.target.closest("button")) return; navigate(`/profile/${u._id}`); }}
                >
                  <Avatar src={u.avatar} sx={{ width: 64, height: 64 }}>
                    {!u.avatar && <PersonIcon />}
                  </Avatar>
                  <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 130 }}>
                    {u.username}
                  </Typography>
                  {u.bio && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 130 }}>
                      {u.bio}
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant={iAmFollowing ? "outlined" : "contained"}
                    disabled={isLoadingFollow}
                    onClick={(e) => { e.stopPropagation(); handleFollowSuggested(u._id); }}
                    sx={{ mt: "auto", minWidth: 90 }}
                  >
                    {isLoadingFollow ? <CircularProgress size={16} /> : iAmFollowing ? "Unfollow" : "Follow"}
                  </Button>
                </Box>
              );
            })
          )}
        </Box>
      </Container>
    );
  }

  // ── Feed ──────────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Your Feed</Typography>

      {feedPosts.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography color="text.secondary">No posts yet from people you follow.</Typography>
        </Box>
      ) : (
        <Grid
          container spacing={3} alignItems="stretch"
          component={motion.div}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {feedPosts.map((post, index) => (
            <React.Fragment key={post._id}>
              {/* ── Post card ─────────────────────────────────────────── */}
              <Grid item xs={12}>
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{ height: "100%" }}
                >
                <Card
                  elevation={2}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "box-shadow 0.2s",
                    "&:hover": { boxShadow: 6 },
                  }}
                >
                  {/* Author header */}
                  <Box
                    sx={{
                      display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5,
                      cursor: "pointer", "&:hover": { bgcolor: "action.hover" },
                    }}
                    onClick={() => navigate(`/profile/${post.author?._id}`)}
                  >
                    <Avatar src={post.author?.avatar} sx={{ width: 38, height: 38 }}>
                      {!post.author?.avatar && <PersonIcon />}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{post.author?.username}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Image — fixed height so all cards align */}
                  <Box
                    component="img"
                    src={post.image?.[0] || ""}
                    alt=""
                    onClick={() => handleOpenModal(post)}
                    sx={{
                      width: "100%",
                      height: 260,
                      objectFit: "cover",
                      display: post.image?.length ? "block" : "none",
                      cursor: "pointer",
                    }}
                  />

                  {/* Content */}
                  <CardContent
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      px: 2,
                      pt: 1.5,
                      pb: "12px !important",
                    }}
                  >
                    {post.title && (
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {post.title}
                      </Typography>
                    )}

                    {post.location && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                        <PlaceIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary">{post.location}</Typography>
                      </Box>
                    )}

                    {post.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.75,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {post.description}
                      </Typography>
                    )}

                    {/* Like / comment / share row pinned to bottom */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: "auto", pt: 1 }}>
                      <motion.div whileTap={{ scale: 1.35 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                        <IconButton
                          size="small"
                          color={isPostLiked(post) ? "error" : "default"}
                          onClick={() => handleLike(post._id)}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {isPostLiked(post) ? (
                              <motion.div key="liked" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                                <FavoriteIcon fontSize="small" />
                              </motion.div>
                            ) : (
                              <motion.div key="unliked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                                <FavoriteBorderIcon fontSize="small" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </IconButton>
                      </motion.div>
                      <Typography variant="body2" sx={{ mr: 0.5 }}>{post.likes?.length || 0}</Typography>

                      <IconButton size="small" onClick={() => handleOpenModal(post)}>
                        <ChatBubbleOutlineIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="body2">{post.comments?.length || 0}</Typography>

                      <Box sx={{ flex: 1 }} />
                      <Tooltip title="Send to a friend">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleOpenShare(post); }}
                        >
                          <NearMeOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
                </motion.div>
              </Grid>

              {/* ── Suggested person after every Nth post — full width ─── */}
              {(index + 1) % SUGGEST_EVERY === 0 && suggestedForFeed.length > 0 && (() => {
                const u = suggestedForFeed[Math.floor(index / SUGGEST_EVERY) % suggestedForFeed.length];
                const iAmFollowing = followingSet.has(String(u._id));
                const isLoadingFollow = followLoadingIds.has(u._id);
                return (
                  <Grid item xs={12} key={`suggest-${index}`}>
                    <motion.div variants={cardVariants}>
                    <Card
                      elevation={0}
                      sx={{ border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}
                    >
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                          People you might know
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box
                            sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }}
                            onClick={() => navigate(`/profile/${u._id}`)}
                          >
                            <Avatar src={u.avatar} sx={{ width: 44, height: 44 }}>
                              {!u.avatar && <PersonIcon />}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{u.username}</Typography>
                              {u.bio && (
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 260 }}>
                                  {u.bio}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Button
                            size="small"
                            variant={iAmFollowing ? "outlined" : "contained"}
                            disabled={isLoadingFollow}
                            onClick={(e) => { e.stopPropagation(); handleFollowSuggested(u._id); }}
                          >
                            {isLoadingFollow ? <CircularProgress size={14} /> : iAmFollowing ? "Unfollow" : "Follow"}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                    </motion.div>
                  </Grid>
                );
              })()}
            </React.Fragment>
          ))}

          {/* Infinite scroll sentinel */}
          <Grid item xs={12}>
            {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
            {loadingMore && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={28} />
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      {/* ── Post detail modal ────────────────────────────────────────────── */}
      <Dialog open={!!selectedPost} onClose={handleCloseModal} maxWidth="xl" fullWidth>
        <DialogContent sx={{ p: 0, display: "flex", height: "88vh" }}>
          {selectedPost && (
            <>
              {/* Left: image */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  bgcolor: "#111",
                  position: "relative",
                  minWidth: 0,
                }}
              >
                {selectedPost.image?.length > 0 ? (
                  <>
                    {modalImagesLoading ? (
                      <CircularProgress sx={{ color: "white" }} />
                    ) : (
                      <img
                        src={selectedPost.image[currentImageIndex]}
                        alt=""
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    )}
                    {!modalImagesLoading && selectedPost.image.length > 1 && (
                      <>
                        <IconButton
                          onClick={() =>
                            setCurrentImageIndex((p) => (p - 1 + selectedPost.image.length) % selectedPost.image.length)
                          }
                          sx={{ position: "absolute", left: 8, top: "50%", bgcolor: "rgba(0,0,0,0.4)", color: "white" }}
                        >
                          &lt;
                        </IconButton>
                        <IconButton
                          onClick={() =>
                            setCurrentImageIndex((p) => (p + 1) % selectedPost.image.length)
                          }
                          sx={{ position: "absolute", right: 8, top: "50%", bgcolor: "rgba(0,0,0,0.4)", color: "white" }}
                        >
                          &gt;
                        </IconButton>
                      </>
                    )}
                  </>
                ) : (
                  <Typography sx={{ color: "white" }}>No image</Typography>
                )}
              </Box>

              {/* Right: details + comments */}
              <Box sx={{ width: 420, display: "flex", flexDirection: "column", flexShrink: 0 }}>

                {/* Author */}
                <Box
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 2,
                    borderBottom: "1px solid", borderColor: "divider",
                    cursor: "pointer", "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => { handleCloseModal(); navigate(`/profile/${selectedPost.author?._id}`); }}
                >
                  <Avatar src={selectedPost.author?.avatar} sx={{ width: 40, height: 40 }}>
                    {!selectedPost.author?.avatar && <PersonIcon />}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{selectedPost.author?.username}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(selectedPost.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                {/* Title + location + description + actions */}
                <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  {selectedPost.title && (
                    <Typography variant="subtitle1" fontWeight="bold">{selectedPost.title}</Typography>
                  )}
                  {selectedPost.location && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                      <PlaceIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">{selectedPost.location}</Typography>
                    </Box>
                  )}
                  {selectedPost.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>
                      {selectedPost.description}
                    </Typography>
                  )}
                  {/* Like + share inline */}
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1.25 }}>
                    <motion.div whileTap={{ scale: 1.35 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                      <IconButton
                        size="small"
                        color={isPostLiked(selectedPost) ? "error" : "default"}
                        onClick={() => handleLike(selectedPost._id)}
                        sx={{ ml: -0.75 }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {isPostLiked(selectedPost) ? (
                            <motion.div key="liked" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                              <FavoriteIcon fontSize="small" />
                            </motion.div>
                          ) : (
                            <motion.div key="unliked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                              <FavoriteBorderIcon fontSize="small" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </IconButton>
                    </motion.div>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPost.likes?.length || 0} {selectedPost.likes?.length === 1 ? "like" : "likes"}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Send to a friend">
                      <IconButton size="small" onClick={() => handleOpenShare(selectedPost)}>
                        <NearMeOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Comments list */}
                <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: 0.8 }}>
                    Comments ({selectedPost.comments?.length || 0})
                  </Typography>

                  {selectedPost.comments?.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {selectedPost.comments.map((c, idx) => (
                        <Box key={c._id}>
                          {/* Comment */}
                          <Box sx={{ display: "flex", gap: 1.5, py: 1.5 }}>
                            <Avatar
                              src={c.author?.avatar}
                              sx={{ width: 36, height: 36, flexShrink: 0, cursor: "pointer" }}
                              onClick={() => { handleCloseModal(); navigate(`/profile/${c.author?._id}`); }}
                            >
                              {!c.author?.avatar && <PersonIcon sx={{ fontSize: 18 }} />}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                  onClick={() => { handleCloseModal(); navigate(`/profile/${c.author?._id}`); }}
                                >
                                  {c.author?.username || "User"}
                                </Typography>
                                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{c.text}</Typography>
                              </Box>
                              {c.createdAt && (
                                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, display: "block" }}>
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </Typography>
                              )}

                              {/* Replies */}
                              {c.replies?.length > 0 && (
                                <Box sx={{ mt: 1.25, display: "flex", flexDirection: "column", gap: 1.25 }}>
                                  {c.replies.map((r, rIdx) => (
                                    <Box key={rIdx} sx={{ display: "flex", gap: 1.25 }}>
                                      <Avatar
                                        src={r.author?.avatar}
                                        sx={{ width: 28, height: 28, flexShrink: 0, cursor: "pointer" }}
                                        onClick={() => { handleCloseModal(); navigate(`/profile/${r.author?._id}`); }}
                                      >
                                        {!r.author?.avatar && <PersonIcon sx={{ fontSize: 14 }} />}
                                      </Avatar>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
                                          <Typography
                                            variant="body2"
                                            fontWeight="bold"
                                            sx={{ fontSize: "0.8rem", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                            onClick={() => { handleCloseModal(); navigate(`/profile/${r.author?._id}`); }}
                                          >
                                            {r.author?.username || "User"}
                                          </Typography>
                                          <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>{r.text}</Typography>
                                        </Box>
                                      </Box>
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          </Box>

                          {idx < selectedPost.comments.length - 1 && (
                            <Divider sx={{ opacity: 0.5 }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <ChatBubbleOutlineIcon sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
                      <Typography variant="caption" color="text.disabled">Be the first to comment!</Typography>
                    </Box>
                  )}
                </Box>

                {/* Add comment */}
                <Box
                  sx={{
                    px: 2, py: 1.5,
                    borderTop: "1px solid", borderColor: "divider",
                    display: "flex", gap: 1, alignItems: "center",
                  }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Add a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); }
                    }}
                    multiline
                    maxRows={3}
                  />
                  <IconButton
                    color="primary"
                    disabled={commentLoading || !commentText.trim()}
                    onClick={handleAddComment}
                  >
                    {commentLoading ? <CircularProgress size={20} /> : <SendIcon />}
                  </IconButton>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Share dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => { setShareDialogOpen(false); setSharePostRef(null); }}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6">Send post</Typography>
          <Typography variant="caption" color="text.secondary">
            {sharePostRef?.title && `"${sharePostRef.title}" · `}People you mutually follow
          </Typography>
        </Box>
        <DialogContent sx={{ p: 0, maxHeight: 420, overflowY: "auto" }}>
          {mutualFollowers.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <NearMeOutlinedIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">No mutual followers yet.</Typography>
              <Typography variant="caption" color="text.disabled">Follow people back to share posts with them.</Typography>
            </Box>
          ) : (
            mutualFollowers.map((u) => (
              <Box
                key={u._id}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5,
                  px: 2.5, py: 1.5, cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                  opacity: sharingSendingId && sharingSendingId !== u._id ? 0.4 : 1,
                }}
                onClick={() => handleSendShare(u._id)}
              >
                <Avatar src={u.avatar} sx={{ width: 46, height: 46 }}>
                  {!u.avatar && <PersonIcon />}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight="bold">{u.username}</Typography>
                  {u.bio && (
                    <Typography variant="caption" color="text.secondary" noWrap>{u.bio}</Typography>
                  )}
                </Box>
                {sharingSendingId === u._id ? (
                  <CircularProgress size={20} />
                ) : (
                  <IconButton size="small" tabIndex={-1}>
                    <SendIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
