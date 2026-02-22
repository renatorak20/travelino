import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Container,
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
  List,
  ListItem,
  ListItemAvatar,
  TextField,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PersonIcon from "@mui/icons-material/Person";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PlaceIcon from "@mui/icons-material/Place";
import SendIcon from "@mui/icons-material/Send";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const SUGGEST_EVERY = 4; // insert a "People you might know" card after every N posts

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

  // Suggested users — two pools
  const [suggestedUsers, setSuggestedUsers] = useState([]);     // empty-state slider
  const [suggestedForFeed, setSuggestedForFeed] = useState([]); // between-post cards

  const [followLoadingIds, setFollowLoadingIds] = useState(new Set());
  const [followingSet, setFollowingSet] = useState(new Set());

  // Modal state
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalImagesLoading, setModalImagesLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    try {
      const meRes = await axios.get(`${API_BASE_URL}/users/${myId}`, { headers });
      const myFollowing = meRes.data.following || [];
      setFollowing(myFollowing);
      setFollowingSet(new Set(myFollowing.map(String)));

      if (myFollowing.length > 0) {
        // Fetch feed + all users in parallel
        const [feedRes, usersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/posts/feed?page=1&limit=10`, { headers }),
          axios.get(`${API_BASE_URL}/users`, { headers }),
        ]);

        const fetchedPosts = feedRes.data.posts || [];
        setHasMore(feedRes.data.hasMore || false);
        setPage(1);

        // Non-followed users for between-post suggestions
        const nonFollowed = (usersRes.data || [])
          .filter(
            (u) =>
              String(u._id) !== String(myId) &&
              !myFollowing.map(String).includes(String(u._id))
          )
          .sort(() => Math.random() - 0.5)
          .slice(0, 10);
        setSuggestedForFeed(nonFollowed);

        // Preload thumbnails before revealing feed
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
        const others = (usersRes.data || []).filter((u) => String(u._id) !== String(myId));
        setSuggestedUsers(others.sort(() => Math.random() - 0.5));
      }
    } catch (err) {
      console.error("Home init error:", err);
    }
    setLoading(false);
  };

  // ── Infinite scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) handleLoadMore();
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, feedPosts.length]);

  // ── Follow (empty state + between-post cards) ──────────────────────────────
  const handleFollowSuggested = async (userId) => {
    setFollowLoadingIds((prev) => new Set(prev).add(userId));
    try {
      const res = await axios.put(`${API_BASE_URL}/users/${userId}/follow`, {}, { headers });
      const updatedFollowers = res.data.followers || [];
      const nowFollowing = updatedFollowers.map(String).includes(String(myId));
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

  // ── Post helpers ───────────────────────────────────────────────────────────
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
    } catch (err) {
      console.error("Comment error:", err);
    }
    setCommentLoading(false);
  };

  // ── Skeleton loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Skeleton variant="text" width={120} height={40} sx={{ mb: 3 }} />
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
              <Skeleton variant="rectangular" width="100%" height={300} />
              <CardContent sx={{ pt: 1 }}>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="90%" height={20} />
                <Skeleton variant="text" width="75%" height={20} />
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={20} sx={{ alignSelf: "center" }} />
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={20} sx={{ alignSelf: "center" }} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
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

  // ── Feed ───────────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Your Feed</Typography>

      {feedPosts.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography color="text.secondary">No posts yet from people you follow.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {feedPosts.map((post, index) => (
            <React.Fragment key={post._id}>
              {/* ── Post card ─────────────────────────────────────────── */}
              <Card elevation={2}>
                {/* Author header */}
                <Box
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.5, p: 1.5,
                    cursor: "pointer", "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => navigate(`/profile/${post.author?._id}`)}
                >
                  <Avatar src={post.author?.avatar} sx={{ width: 36, height: 36 }}>
                    {!post.author?.avatar && <PersonIcon />}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{post.author?.username}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                {/* Image */}
                {post.image?.length > 0 && (
                  <Box
                    component="img"
                    src={post.image[0]}
                    alt=""
                    sx={{ width: "100%", maxHeight: 500, objectFit: "cover", display: "block", cursor: "pointer" }}
                    onClick={() => handleOpenModal(post)}
                  />
                )}

                <CardContent sx={{ pt: 1 }}>
                  {post.title && (
                    <Typography variant="subtitle1" fontWeight="bold">{post.title}</Typography>
                  )}
                  {post.location && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                      <PlaceIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">{post.location}</Typography>
                    </Box>
                  )}
                  {post.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {post.description}
                    </Typography>
                  )}

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                    <IconButton
                      size="small"
                      color={isPostLiked(post) ? "error" : "default"}
                      onClick={() => handleLike(post._id)}
                    >
                      {isPostLiked(post) ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                    </IconButton>
                    <Typography variant="body2">{post.likes?.length || 0}</Typography>

                    <IconButton size="small" onClick={() => handleOpenModal(post)}>
                      <ChatBubbleOutlineIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2">{post.comments?.length || 0}</Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* ── Suggested person after every Nth post ─────────────── */}
              {(index + 1) % SUGGEST_EVERY === 0 && suggestedForFeed.length > 0 && (() => {
                const u = suggestedForFeed[Math.floor(index / SUGGEST_EVERY) % suggestedForFeed.length];
                const iAmFollowing = followingSet.has(String(u._id));
                const isLoadingFollow = followLoadingIds.has(u._id);
                return (
                  <Card
                    elevation={1}
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
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
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
                );
              })()}
            </React.Fragment>
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
          {loadingMore && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </Box>
      )}

      {/* ── Post detail modal ──────────────────────────────────────────────── */}
      <Dialog open={!!selectedPost} onClose={handleCloseModal} maxWidth="lg" fullWidth>
        <DialogContent sx={{ p: 0, display: "flex", height: "600px" }}>
          {selectedPost && (
            <>
              {/* Left: image */}
              <Box
                sx={{
                  flex: 1, display: "flex", justifyContent: "center", alignItems: "center",
                  bgcolor: "#111", position: "relative",
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

              {/* Right: details */}
              <Box sx={{ width: 350, display: "flex", flexDirection: "column" }}>
                {/* Author */}
                <Box
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.5, p: 2,
                    borderBottom: "1px solid #ddd", cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => { handleCloseModal(); navigate(`/profile/${selectedPost.author?._id}`); }}
                >
                  <Avatar src={selectedPost.author?.avatar} sx={{ width: 36, height: 36 }}>
                    {!selectedPost.author?.avatar && <PersonIcon />}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{selectedPost.author?.username}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(selectedPost.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                {/* Title + location + description */}
                <Box sx={{ p: 2, borderBottom: "1px solid #ddd" }}>
                  {selectedPost.title && (
                    <Typography variant="subtitle1" fontWeight="bold">{selectedPost.title}</Typography>
                  )}
                  {selectedPost.location && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                      <PlaceIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">{selectedPost.location}</Typography>
                    </Box>
                  )}
                  {selectedPost.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {selectedPost.description}
                    </Typography>
                  )}
                </Box>

                {/* Likes */}
                <Box sx={{ display: "flex", alignItems: "center", p: 1.5, borderBottom: "1px solid #ddd" }}>
                  <IconButton
                    size="small"
                    color={isPostLiked(selectedPost) ? "error" : "default"}
                    onClick={() => handleLike(selectedPost._id)}
                  >
                    {isPostLiked(selectedPost) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <Typography variant="body2">{selectedPost.likes?.length || 0} likes</Typography>
                </Box>

                {/* Comments */}
                <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Comments</Typography>
                  {selectedPost.comments?.length > 0 ? (
                    <List disablePadding>
                      {selectedPost.comments.map((c) => (
                        <ListItem key={c._id} alignItems="flex-start" disableGutters>
                          <ListItemAvatar sx={{ minWidth: 36 }}>
                            <Avatar
                              src={c.author?.avatar}
                              sx={{ width: 28, height: 28, cursor: "pointer" }}
                              onClick={() => { handleCloseModal(); navigate(`/profile/${c.author?._id}`); }}
                            />
                          </ListItemAvatar>
                          <Box>
                            <Typography
                              variant="body2" fontWeight="bold"
                              sx={{ cursor: "pointer", display: "inline" }}
                              onClick={() => { handleCloseModal(); navigate(`/profile/${c.author?._id}`); }}
                            >
                              {c.author?.username || "User"}
                            </Typography>
                            <Typography variant="body2" sx={{ display: "inline", ml: 0.5 }}>{c.text}</Typography>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
                  )}
                </Box>

                {/* Add comment */}
                <Box sx={{ p: 2, borderTop: "1px solid #ddd", display: "flex", gap: 1 }}>
                  <TextField
                    fullWidth size="small" placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); }
                    }}
                  />
                  <IconButton color="primary" disabled={commentLoading || !commentText.trim()} onClick={handleAddComment}>
                    {commentLoading ? <CircularProgress size={20} /> : <SendIcon />}
                  </IconButton>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
