import React, { useState, useEffect, useRef } from "react";
import {
  Avatar,
  Button,
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Skeleton,
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PeopleIcon from "@mui/icons-material/People";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import PersonIcon from "@mui/icons-material/Person";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import SendIcon from "@mui/icons-material/Send";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  // Detect if we are viewing our own profile
  const myId = localStorage.getItem("userId");
  const isMyProfile = myId === userId;

  const [userData, setUserData] = useState({
    _id: "",
    username: "",
    email: "",
    bio: "",
    avatar: "",
    followers: [],
    following: [],
  });

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalImagesLoading, setModalImagesLoading] = useState(false);
  const [error, setError] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editingPost, setEditingPost] = useState(false);
  const [editPostData, setEditPostData] = useState({ title: "", description: "" });
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [deletePostLoading, setDeletePostLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followListModal, setFollowListModal] = useState(null); // "followers" | "following" | null
  const [followListData, setFollowListData] = useState([]);
  const [profileTab, setProfileTab] = useState(0); // 0 = Posts, 1 = Completed Trips
  const [completedTrips, setCompletedTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [followListLoading, setFollowListLoading] = useState(false);

  const isFollowing = userData.followers.map(String).includes(String(myId));

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API_BASE_URL}/users/${userId}/follow`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserData((prev) => ({ ...prev, followers: res.data.followers }));
    } catch (err) {
      console.error("Follow error:", err);
    }
    setFollowLoading(false);
  };

  const handleOpenFollowList = async (type) => {
    setFollowListModal(type);
    setFollowListLoading(true);
    setFollowListData([]);
    try {
      const token = localStorage.getItem("token");
      const ids = type === "followers" ? userData.followers : userData.following;
      const results = await Promise.all(
        ids.map((id) =>
          axios
            .get(`${API_BASE_URL}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.data)
            .catch(() => null)
        )
      );
      setFollowListData(results.filter(Boolean));
    } catch (err) {
      console.error("Failed to load follow list:", err);
    }
    setFollowListLoading(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await axios.put(`${API_BASE_URL}/users/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserData((prev) => ({ ...prev, avatar: res.data.avatar }));
    } catch (err) {
      console.error("Avatar upload error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to upload avatar");
    }
    setAvatarUploading(false);
  };

const isPostLiked = (post) => {
  const myId = localStorage.getItem("userId");
  if (!post || !myId || !Array.isArray(post.likes)) return false;
  return post.likes.includes(myId);
};


const handleLikePost = async (postId) => {
  if (!postId) return;
  
  const myId = localStorage.getItem("userId");
  if (!myId) return;

  // Optimistically update UI
  const isLiked = posts.find(p => p._id === postId)?.likes?.includes(myId);
  const newLikes = isLiked
    ? posts.find(p => p._id === postId).likes.filter(id => id !== myId)
    : [...(posts.find(p => p._id === postId).likes || []), myId];

  // Update selectedPost if open
  if (selectedPost && selectedPost._id === postId) {
    setSelectedPost(prev => ({ ...prev, likes: newLikes }));
  }

  // Update posts array
  setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: newLikes } : p));

  // Send request to backend
  try {
    const token = localStorage.getItem("token");
    await axios.put(`${API_BASE_URL}/posts/${postId}/like`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error("Failed to update like:", err);
    // Optional: revert UI if request fails
  }
};

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedPost) return;
    setCommentLoading(true);
    setCommentError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/posts/${selectedPost._id}/comment`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newComment = res.data;
      setSelectedPost((prev) => ({ ...prev, comments: [...(prev.comments || []), newComment] }));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === selectedPost._id
            ? { ...p, comments: [...(p.comments || []), newComment] }
            : p
        )
      );
      setCommentText("");
    } catch (err) {
      setCommentError("Failed to add comment");
    }
    setCommentLoading(false);
  };

  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
  }, [userId]);

  const fetchUserProfile = async () => {
    if (!userId || userId === "null" || userId === "undefined") {
      navigate("/not-found", { replace: true });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserData({
        _id: res.data._id || "",
        username: res.data.username || "",
        email: res.data.email || "",
        bio: res.data.bio || "",
        avatar: res.data.avatar || "",
        followers: res.data.followers || [],
        following: res.data.following || [],
      });

      setLoading(false);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 400) {
        navigate("/not-found", { replace: true });
        return;
      }
      setError(err.response?.data?.message || "Failed to load profile");
      setLoading(false);
    }
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim() || !selectedPost) return;
    setReplyLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/posts/${selectedPost._id}/comment/${commentId}/reply`,
        { text: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newReply = res.data;
      const appendReply = (comments) =>
        comments.map((c) =>
          c._id === commentId
            ? { ...c, replies: [...(c.replies || []), newReply] }
            : c
        );
      setSelectedPost((prev) => ({ ...prev, comments: appendReply(prev.comments || []) }));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === selectedPost._id ? { ...p, comments: appendReply(p.comments || []) } : p
        )
      );
      setReplyText("");
      setReplyingToId(null);
    } catch (err) {
      console.error("Failed to add reply:", err);
    }
    setReplyLoading(false);
  };

  const handleEditComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/posts/${selectedPost._id}/comment/${commentId}`,
        { text: editCommentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updateText = (comments) =>
        comments.map((c) => (c._id === commentId ? { ...c, text: editCommentText } : c));
      setSelectedPost((prev) => ({ ...prev, comments: updateText(prev.comments || []) }));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === selectedPost._id ? { ...p, comments: updateText(p.comments || []) } : p
        )
      );
      setEditingCommentId(null);
      setEditCommentText("");
    } catch (err) {
      console.error("Failed to edit comment:", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE_URL}/posts/${selectedPost._id}/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const removeComment = (comments) => comments.filter((c) => c._id !== commentId);
      setSelectedPost((prev) => ({ ...prev, comments: removeComment(prev.comments || []) }));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === selectedPost._id ? { ...p, comments: removeComment(p.comments || []) } : p
        )
      );
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    setDeletePostLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/posts/${selectedPost._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((p) => p._id !== selectedPost._id));
      handleClosePostModal();
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
    setDeletePostLoading(false);
  };

  const handleSavePost = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API_BASE_URL}/posts/${selectedPost._id}`,
        editPostData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedPost((prev) => ({ ...prev, title: res.data.title, description: res.data.description }));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === selectedPost._id
            ? { ...p, title: res.data.title, description: res.data.description }
            : p
        )
      );
      setEditingPost(false);
    } catch (err) {
      console.error("Failed to update post:", err);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/posts/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedPosts = res.data || [];

      const thumbnailUrls = fetchedPosts.map((p) => p.image?.[0]).filter(Boolean);

      if (thumbnailUrls.length === 0) {
        setPosts(fetchedPosts);
        setPostsLoading(false);
        return;
      }

      let loadedCount = 0;
      thumbnailUrls.forEach((url) => {
        const img = new Image();
        img.onload = img.onerror = () => {
          loadedCount++;
          if (loadedCount === thumbnailUrls.length) {
            setPosts(fetchedPosts);
            setPostsLoading(false);
          }
        };
        img.src = url;
      });
    } catch (err) {
      setPostsLoading(false);
    }
  };

  const fetchCompletedTrips = async () => {
    setTripsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/trips?memberId=${userId}&status=completed&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompletedTrips(res.data.trips || []);
    } catch (err) {
      console.error("Failed to fetch trips:", err);
    }
    setTripsLoading(false);
  };

  const handleTabChange = (_, newVal) => {
    setProfileTab(newVal);
    if (newVal === 1 && completedTrips.length === 0) fetchCompletedTrips();
  };

  const handleOpenPostModal = (post) => {
    setSelectedPost(post);
    setCurrentImageIndex(0);

    if (!post.image?.length) return;

    setModalImagesLoading(true);
    let loadedCount = 0;
    post.image.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === post.image.length) {
          setModalImagesLoading(false);
        }
      };
      img.src = url;
    });
  };

  const handleClosePostModal = () => {
    setSelectedPost(null);
    setCurrentImageIndex(0);
    setReplyingToId(null);
    setReplyText("");
    setCommentText("");
    setEditingCommentId(null);
    setEditCommentText("");
    setEditingPost(false);
    setConfirmDeletePost(false);
  };

  const handleNextImage = () => {
    if (selectedPost?.image?.length > 0) {
      setCurrentImageIndex(
        (prev) => (prev + 1) % selectedPost.image.length
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedPost?.image?.length > 0) {
      setCurrentImageIndex(
        (prev) => (prev - 1 + selectedPost.image.length) % selectedPost.image.length
      );
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container component="main" maxWidth="lg">
      <Box sx={{ py: 4 }}>  
        {/* Error */}
        {error && (
          <Box sx={{ mb: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {/* Header */}
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            {/* Left */}
            <Box sx={{ display: "flex", gap: 3 }}>
              <Box sx={{ position: "relative", width: 120, height: 120 }}>
                <Avatar
                  src={userData.avatar}
                  sx={{ width: 120, height: 120, fontSize: "3rem" }}
                >
                  {!userData.avatar && <PersonIcon sx={{ fontSize: "4rem" }} />}
                </Avatar>

                {isMyProfile && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      ref={avatarInputRef}
                      onChange={handleAvatarChange}
                    />
                    <Box
                      onClick={() => !avatarUploading && avatarInputRef.current.click()}
                      sx={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        bgcolor: "rgba(0,0,0,0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0,
                        cursor: "pointer",
                        transition: "opacity 0.2s",
                        "&:hover": { opacity: 1 },
                      }}
                    >
                      {avatarUploading
                        ? <CircularProgress size={28} sx={{ color: "white" }} />
                        : <CameraAltIcon sx={{ color: "white", fontSize: 32 }} />}
                    </Box>
                  </>
                )}
              </Box>

              <Box>
                <Typography variant="h4">{userData.username}</Typography>

                {userData.bio && (
                  <Typography sx={{ mt: 1 }}>{userData.bio}</Typography>
                )}

                <Box sx={{ display: "flex", gap: 3, mt: 2 }}>
                  <Typography>
                    <strong>{posts.length}</strong> Posts
                  </Typography>
                  <Typography
                    sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                    onClick={() => handleOpenFollowList("followers")}
                  >
                    <strong>{userData.followers.length}</strong> Followers
                  </Typography>
                  <Typography
                    sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                    onClick={() => handleOpenFollowList("following")}
                  >
                    <strong>{userData.following.length}</strong> Following
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Right — CONDITIONAL BASED ON PROFILE OWNER */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {isMyProfile ? (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate("/settings")}
                  >
                    Edit Profile
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={isFollowing ? "outlined" : "contained"}
                    color="primary"
                    disabled={followLoading}
                    onClick={handleFollow}
                  >
                    {followLoading ? <CircularProgress size={20} /> : isFollowing ? "Unfollow" : "Follow"}
                  </Button>

                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate(`/messages?with=${userId}`)}
                  >
                    Message
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Paper>

        {/* TABS */}
        <Tabs value={profileTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Posts" />
          <Tab label="Completed Trips" />
        </Tabs>

        {/* POSTS TAB */}
        {profileTab === 0 && (
          <Box sx={{ mb: 3 }}>
            {postsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : posts.length === 0 ? (
              <Paper sx={{ p: 3 }}>
                <Typography>No posts yet.</Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {posts.map((post) => (
                  <Grid item xs={12} sm={6} md={4} key={post._id}>
                    <Card
                      onClick={() => handleOpenPostModal(post)}
                      sx={{ cursor: "pointer", "&:hover": { transform: "scale(1.01)" } }}
                    >
                      {post.image?.length > 0 && (
                        <CardMedia component="img" height="200" image={post.image[0]} />
                      )}
                      <CardContent>
                        <Typography variant="h6" noWrap>{post.title}</Typography>
                        {post.location && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                            <PlaceIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {post.location}
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="body2" color="textSecondary" noWrap>
                          {post.description}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                          <FavoriteBorderIcon fontSize="small" />
                          <Typography>{post?.likes?.length || 0} Likes</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* COMPLETED TRIPS TAB */}
        {profileTab === 1 && (
          <Box sx={{ mb: 3 }}>
            {tripsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : completedTrips.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: "center" }}>
                <ExploreOutlinedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                <Typography color="text.secondary">No completed trips yet.</Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {completedTrips.map((trip) => (
                  <Grid item xs={12} sm={6} md={4} key={trip._id}>
                    <Card
                      onClick={() => navigate(`/trips/${trip._id}`)}
                      sx={{ cursor: "pointer", "&:hover": { boxShadow: 6 }, transition: "box-shadow 0.2s" }}
                    >
                      {trip.coverImage?.length > 0 ? (
                        <CardMedia component="img" height="180" image={trip.coverImage[0]} alt={trip.title} />
                      ) : (
                        <Box sx={{ height: 180, bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <ExploreOutlinedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
                        </Box>
                      )}
                      <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Chip label="Completed" size="small" color="default" />
                        </Box>
                        <Typography variant="h6" noWrap>{trip.title}</Typography>
                        {trip.destination && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                            <PlaceIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {trip.destination}
                            </Typography>
                          </Box>
                        )}
                        {(trip.startDate || trip.endDate) && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                            <CalendarTodayIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">
                              {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : ""}
                              {trip.startDate && trip.endDate ? " – " : ""}
                              {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : ""}
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                          <PeopleIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                          <Typography variant="caption" color="text.secondary">
                            {trip.members?.length || 0} members
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Box>

      {/* POST MODAL */}
      <Dialog open={!!selectedPost} onClose={handleClosePostModal} maxWidth="lg" fullWidth>
        <DialogContent sx={{ p: 0, display: "flex", height: "600px" }}>
          {selectedPost && (
            <>
              {/* Left image */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  bgcolor: "#f5f5f5",
                  position: "relative",
                }}
              >
                {selectedPost.image?.length > 0 ? (
                  <>
                    {modalImagesLoading ? (
                      <CircularProgress size={48} />
                    ) : (
                      <img
                        src={selectedPost.image[currentImageIndex]}
                        alt=""
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />
                    )}

                    {!modalImagesLoading && selectedPost.image.length > 1 && (
                      <>
                        <IconButton
                          onClick={handlePrevImage}
                          sx={{
                            position: "absolute",
                            top: "50%",
                            left: 10,
                            bgcolor: "rgba(0,0,0,0.4)",
                            color: "white",
                          }}
                        >
                          &lt;
                        </IconButton>

                        <IconButton
                          onClick={handleNextImage}
                          sx={{
                            position: "absolute",
                            top: "50%",
                            right: 10,
                            bgcolor: "rgba(0,0,0,0.4)",
                            color: "white",
                          }}
                        >
                          &gt;
                        </IconButton>
                      </>
                    )}
                  </>
                ) : (
                  <Typography>No image available</Typography>
                )}
              </Box>

              {/* Right details */}
              <Box sx={{ width: 350, display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <Box sx={{ p: 2, borderBottom: "1px solid #ddd" }}>
                  {editingPost ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={editPostData.title}
                        onChange={(e) => setEditPostData((p) => ({ ...p, title: e.target.value }))}
                        inputProps={{ maxLength: 100 }}
                      />
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={3}
                        value={editPostData.description}
                        onChange={(e) => setEditPostData((p) => ({ ...p, description: e.target.value }))}
                        inputProps={{ maxLength: 2000 }}
                      />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton size="small" color="primary" onClick={handleSavePost}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setEditingPost(false)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Box>
                        <Typography variant="h6">{selectedPost.title}</Typography>
                        {selectedPost.location && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                            <PlaceIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">
                              {selectedPost.location}
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="caption">
                          {new Date(selectedPost.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      {selectedPost.author?._id === myId && (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          {confirmDeletePost ? (
                            <>
                              <Typography variant="caption" sx={{ mr: 1 }}>Delete post?</Typography>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={deletePostLoading}
                                onClick={handleDeletePost}
                              >
                                {deletePostLoading ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                              </IconButton>
                              <IconButton size="small" onClick={() => setConfirmDeletePost(false)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditPostData({ title: selectedPost.title, description: selectedPost.description || "" });
                                  setEditingPost(true);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setConfirmDeletePost(true)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Description */}
                {!editingPost && (
                  <Box sx={{ p: 2, borderBottom: "1px solid #ddd", maxHeight: 150, overflowY: "auto" }}>
                    {selectedPost.description}
                  </Box>
                )}

                {/* Likes */}
                <Box sx={{ p: 2, borderBottom: "1px solid #ddd" }}>
                  <IconButton
                    color={isPostLiked(selectedPost) ? "error" : "default"}
                    onClick={() => handleLikePost(selectedPost._id)}
                    disabled={likeLoading}
                  >
                    {isPostLiked(selectedPost) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <Typography>{selectedPost?.likes?.length || 0} Likes</Typography>
                </Box>

                {/* Comments */}
                <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Comments
                  </Typography>

                  {selectedPost.comments?.length > 0 ? (
                    <List disablePadding>
                      {selectedPost.comments.map((c) => (
                        <Box key={c._id}>
                          <ListItem alignItems="flex-start" disableGutters>
                            <ListItemAvatar sx={{ minWidth: 40 }}>
                              <Avatar
                                src={c.author?.avatar}
                                sx={{ width: 32, height: 32, cursor: "pointer" }}
                                onClick={() => c.author?._id && navigate(`/profile/${c.author._id}`)}
                              />
                            </ListItemAvatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                sx={{ cursor: "pointer", display: "inline" }}
                                onClick={() => c.author?._id && navigate(`/profile/${c.author._id}`)}
                              >
                                {c.author?.username || "User"}
                              </Typography>

                              {/* Inline edit or display text */}
                              {editingCommentId === c._id ? (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditComment(c._id); }
                                      if (e.key === "Escape") { setEditingCommentId(null); setEditCommentText(""); }
                                    }}
                                  />
                                  <IconButton size="small" color="primary" onClick={() => handleEditComment(c._id)}>
                                    <CheckIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => { setEditingCommentId(null); setEditCommentText(""); }}>
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              ) : (
                                <Typography variant="body2" sx={{ display: "inline", ml: 0.5 }}>
                                  {c.text}
                                </Typography>
                              )}

                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                  onClick={() => {
                                    setReplyingToId(replyingToId === c._id ? null : c._id);
                                    setReplyText("");
                                  }}
                                >
                                  Reply
                                </Typography>
                                {c.author?._id === myId && (
                                  <>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                      onClick={() => { setEditingCommentId(c._id); setEditCommentText(c.text); setReplyingToId(null); }}
                                    >
                                      Edit
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="error.main"
                                      sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                      onClick={() => handleDeleteComment(c._id)}
                                    >
                                      Delete
                                    </Typography>
                                  </>
                                )}
                              </Box>

                              {/* Replies */}
                              {c.replies?.length > 0 && (
                                <Box sx={{ mt: 0.5, pl: 1, borderLeft: "2px solid", borderColor: "divider" }}>
                                  {c.replies.map((r, ri) => (
                                    <Box key={ri} sx={{ display: "flex", gap: 1, mb: 0.5 }}>
                                      <Avatar
                                        src={r.author?.avatar}
                                        sx={{ width: 24, height: 24, cursor: "pointer", flexShrink: 0 }}
                                        onClick={() => r.author?._id && navigate(`/profile/${r.author._id}`)}
                                      />
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          fontWeight="bold"
                                          sx={{ cursor: "pointer" }}
                                          onClick={() => r.author?._id && navigate(`/profile/${r.author._id}`)}
                                        >
                                          {r.author?.username || "User"}
                                        </Typography>
                                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                                          {r.text}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  ))}
                                </Box>
                              )}

                              {/* Reply input */}
                              {replyingToId === c._id && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write a reply..."
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddReply(c._id);
                                      }
                                    }}
                                  />
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    disabled={replyLoading || !replyText.trim()}
                                    onClick={() => handleAddReply(c._id)}
                                  >
                                    {replyLoading ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                                  </IconButton>
                                </Box>
                              )}
                            </Box>
                          </ListItem>
                        </Box>
                      ))}
                    </List>
                  ) : (
                    <Typography>No comments yet.</Typography>
                  )}
                </Box>

                {/* Add Comment */}
                <Box sx={{ p: 2, borderTop: "1px solid #ddd" }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />

                  <IconButton
                    sx={{ mt: 1 }}
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
      {/* Followers / Following modal */}
      <Dialog
        open={!!followListModal}
        onClose={() => { setFollowListModal(null); setFollowListData([]); }}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6" sx={{ textTransform: "capitalize" }}>
            {followListModal}
          </Typography>
        </Box>
        <DialogContent sx={{ p: 0, minHeight: 200 }}>
          {followListLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
              <CircularProgress />
            </Box>
          ) : followListData.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">No users found.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {followListData.map((u) => (
                <ListItem
                  key={u._id}
                  button
                  onClick={() => {
                    setFollowListModal(null);
                    setFollowListData([]);
                    navigate(`/profile/${u._id}`);
                  }}
                  sx={{ "&:hover": { bgcolor: "action.hover" } }}
                >
                  <ListItemAvatar>
                    <Avatar src={u.avatar}>
                      {!u.avatar && <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={u.username}
                    secondary={u.bio || null}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
