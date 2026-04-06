import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardMedia,
  IconButton,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import CancelIcon from "@mui/icons-material/Cancel";
import PublishIcon from "@mui/icons-material/Publish";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function Create() {
  const [activeStep, setActiveStep] = useState(0);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [aiCaptionLoading, setAiCaptionLoading] = useState(false);
  const navigate = useNavigate();

  const steps = ["Upload Images", "Post Details", "Review & Publish"];

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 10) {
      setError("Maximum 10 images allowed");
      return;
    }

    setError("");
    setUploadingImages(true);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, file]);
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    setUploadingImages(false);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (images.length === 0) {
        setError("Please upload at least one image");
        return;
      }
    } else if (activeStep === 1) {
      if (!formData.title.trim()) {
        setError("Title is required");
        return;
      }
    }
    setError("");
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError("");
    setActiveStep((prev) => prev - 1);
  };

  const handlePublish = async () => {
    try {
      setError("");
      setLoading(true);

      if (!formData.title.trim()) {
        setError("Title is required");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      // Convert image previews back to files and upload
      const postFormData = new FormData();
      postFormData.append("title", formData.title);
      postFormData.append("description", formData.description);
      postFormData.append("location", formData.location);

      images.forEach((image) => {
        postFormData.append("image", image);
      });

      await axios.post(`${API_BASE_URL}/posts`, postFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess("Post published successfully!");
      setTimeout(() => {
        navigate(`/profile/${localStorage.getItem("userId")}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create post");
      setLoading(false);
    }
  };

  const handleSuggestCaption = async () => {
    if (!formData.title.trim()) {
      setError("Enter a title first so AI knows what your post is about");
      return;
    }
    setError("");
    setAiCaptionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/ai/caption`,
        { title: formData.title, location: formData.location },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData((prev) => ({ ...prev, description: res.data.caption }));
    } catch (err) {
      setError("Failed to generate caption. Please try again.");
    }
    setAiCaptionLoading(false);
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure? Your post will not be saved.")) {
      navigate("/home");
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          Create a New Post
        </Typography>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Error and Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Step 1: Upload Images */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Upload Images (Maximum 10)
              </Typography>

              {/* Upload Area */}
              <Box
                sx={{
                  display: "block",
                  border: "2px dashed",
                  borderColor: "primary.main",
                  borderRadius: 2,
                  p: 4,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  bgcolor: "action.hover",
                  mb: 3,
                  "&:hover": {
                    borderColor: "primary.dark",
                    bgcolor: "action.selected",
                  },
                }}
                component="label"
              >
                <input
                  hidden
                  accept="image/*"
                  multiple
                  type="file"
                  onChange={handleImageSelect}
                  disabled={uploadingImages}
                />
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  {uploadingImages ? (
                    <CircularProgress size={40} />
                  ) : (
                    <>
                      <CloudUploadIcon sx={{ fontSize: 48, color: "primary.main" }} />
                      <Typography variant="h6">
                        Click or drag images here
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Supported formats: JPG, PNG, GIF (Max 10 images)
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Selected Images ({imagePreviews.length}/10)
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {imagePreviews.map((preview, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card sx={{ position: "relative", height: 200 }}>
                          <CardMedia
                            component="img"
                            height="200"
                            image={preview}
                            alt={`Preview ${index + 1}`}
                            sx={{ objectFit: "cover" }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveImage(index)}
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              bgcolor: "error.main",
                              color: "white",
                              "&:hover": {
                                bgcolor: "error.dark",
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 8,
                              left: 8,
                              bgcolor: "rgba(0, 0, 0, 0.6)",
                              color: "white",
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: "0.75rem",
                            }}
                          >
                            {index + 1}
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Step Actions */}
              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  startIcon={<CancelIcon />}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={images.length === 0 || uploadingImages}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 2: Post Details */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Post Details
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Enter post title..."
                  variant="outlined"
                  required
                  inputProps={{ maxLength: 100 }}
                  helperText={`${formData.title.length}/100`}
                />

                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  placeholder="e.g. Dubrovnik, Croatia"
                  variant="outlined"
                  inputProps={{ maxLength: 100 }}
                />

                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Description</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={aiCaptionLoading ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />}
                      onClick={handleSuggestCaption}
                      disabled={aiCaptionLoading || !formData.title.trim()}
                    >
                      {aiCaptionLoading ? "Generating…" : "Suggest with AI"}
                    </Button>
                  </Box>
                  <TextField
                    fullWidth
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Describe your travel experience…"
                    variant="outlined"
                    multiline
                    rows={6}
                    inputProps={{ maxLength: 2000 }}
                    helperText={`${formData.description.length}/2000`}
                  />
                </Box>

                <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                  <Button variant="outlined" onClick={handleBack}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!formData.title.trim()}
                  >
                    Review
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          {/* Step 3: Review & Publish */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Review Your Post
              </Typography>

              {/* Image Preview */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Images ({imagePreviews.length})
                </Typography>
                <Grid container spacing={2}>
                  {imagePreviews.map((preview, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card>
                        <CardMedia
                          component="img"
                          height="200"
                          image={preview}
                          alt={`Review ${index + 1}`}
                          sx={{ objectFit: "cover" }}
                        />
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Content Preview */}
              <Box sx={{ mb: 4, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {formData.title}
                </Typography>
                {formData.location && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    📍 {formData.location}
                  </Typography>
                )}
                <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {formData.description}
                </Typography>
              </Box>

              {/* Actions */}
              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handlePublish}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <PublishIcon />}
                >
                  {loading ? "Publishing..." : "Publish Post"}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
