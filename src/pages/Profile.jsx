import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
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
  const [error, setError] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");

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

      setSelectedPost((prev) => ({ ...prev, comments: res.data.comments }));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === selectedPost._id ? { ...p, comments: res.data.comments } : p
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
      setError(err.response?.data?.message || "Failed to load profile");
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/posts/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data || []);
      setPostsLoading(false);
    } catch (err) {
      setPostsLoading(false);
    }
  };

  const handleOpenPostModal = (post) => {
    setSelectedPost(post);
    setCurrentImageIndex(0);
  };

  const handleClosePostModal = () => {
    setSelectedPost(null);
    setCurrentImageIndex(0);
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
              <Avatar
                src={userData.avatar}
                sx={{ width: 120, height: 120, fontSize: "3rem" }}
              >
                {!userData.avatar && <PersonIcon sx={{ fontSize: "4rem" }} />}
              </Avatar>

              <Box>
                <Typography variant="h4">{userData.username}</Typography>
                <Typography variant="body1">
                  <EmailIcon sx={{ mr: 1 }} />
                  {userData.email}
                </Typography>

                {userData.bio && (
                  <Typography sx={{ mt: 1 }}>{userData.bio}</Typography>
                )}

                <Box sx={{ display: "flex", gap: 3, mt: 2 }}>
                  <Typography>
                    <strong>{posts.length}</strong> Posts
                  </Typography>
                  <Typography>
                    <strong>{userData.followers.length}</strong> Followers
                  </Typography>
                  <Typography>
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
                  <Button variant="contained" color="primary">
                    Follow
                  </Button>

                  <Button variant="outlined" color="secondary">
                    Message
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Paper>

        {/* POSTS */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Posts
          </Typography>

          {postsLoading ? (
            <div>Loading posts...</div>
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
                    sx={{
                      cursor: "pointer",
                      "&:hover": { transform: "scale(1.01)" },
                    }}
                  >
                    {post.image?.length > 0 && (
                      <CardMedia
                        component="img"
                        height="200"
                        image={post.image[0]}
                      />
                    )}
                    <CardContent>
                      <Typography variant="h6" noWrap>
                        {post.title}
                      </Typography>
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
                    <img
                      src={selectedPost.image[currentImageIndex]}
                      alt=""
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />

                    {selectedPost.image.length > 1 && (
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
                  <Typography variant="h6">{selectedPost.title}</Typography>
                  <Typography variant="caption">
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>

                {/* Description */}
                <Box sx={{ p: 2, borderBottom: "1px solid #ddd", maxHeight: 150, overflowY: "auto" }}>
                  {selectedPost.description}
                </Box>

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
                    <List>
                      {selectedPost.comments.map((c, i) => (
                        <ListItem key={i}>
                          <ListItemAvatar>
                            <Avatar />
                          </ListItemAvatar>
                          <ListItemText primary={c.user?.username || "User"} secondary={c.text} />
                        </ListItem>
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

                  <Button
                    sx={{ mt: 1 }}
                    variant="contained"
                    disabled={commentLoading || !commentText.trim()}
                    onClick={handleAddComment}
                  >
                    {commentLoading ? "Posting..." : "Post"}
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
