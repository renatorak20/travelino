import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  MenuItem,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PeopleIcon from "@mui/icons-material/People";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const STEPS = ["Trip Details", "Dates & Capacity", "Review & Create"];
const STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

export default function CreateTrip() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    destination: "",
    status: "planning",
  });
  const [dates, setDates] = useState({ startDate: "", endDate: "" });
  const [maxParticipants, setMaxParticipants] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const canNext = () => {
    if (activeStep === 0) return form.title.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canNext()) return;
    setError("");
    setActiveStep((s) => s + 1);
  };

  const handleBack = () => setActiveStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      setActiveStep(0);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("title", form.title.trim());
      data.append("description", form.description.trim());
      data.append("destination", form.destination.trim());
      data.append("status", form.status);
      if (dates.startDate) data.append("startDate", dates.startDate);
      if (dates.endDate) data.append("endDate", dates.endDate);
      if (maxParticipants) data.append("maxParticipants", maxParticipants);
      if (imageFile) data.append("coverImage", imageFile);

      const res = await axios.post(`${API_BASE_URL}/trips`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      navigate(`/trips/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create trip.");
    }
    setLoading(false);
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/trips")}
        sx={{ mb: 2 }}
        color="inherit"
      >
        Back to Trips
      </Button>

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Create a Trip
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Step 0: Trip details ──────────────────────────────────────── */}
      {activeStep === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Trip Title *"
            name="title"
            value={form.title}
            onChange={handleFormChange}
            fullWidth
            inputProps={{ maxLength: 100 }}
            helperText={`${form.title.length}/100`}
          />
          <TextField
            label="Destination"
            name="destination"
            value={form.destination}
            onChange={handleFormChange}
            fullWidth
            placeholder="e.g. Dubrovnik, Croatia"
          />
          <TextField
            label="Description"
            name="description"
            value={form.description}
            onChange={handleFormChange}
            fullWidth
            multiline
            rows={4}
            inputProps={{ maxLength: 1000 }}
            helperText={`${form.description.length}/1000`}
          />
          <TextField
            select
            label="Status"
            name="status"
            value={form.status}
            onChange={handleFormChange}
            fullWidth
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>

          {/* Cover image */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Cover Image (optional)
            </Typography>
            {imagePreview ? (
              <Box sx={{ position: "relative", display: "inline-block" }}>
                <Box
                  component="img"
                  src={imagePreview}
                  alt="cover"
                  sx={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={removeImage}
                  sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    bgcolor: "rgba(0,0,0,0.6)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Button
                component="label"
                variant="outlined"
                startIcon={<AddPhotoAlternateIcon />}
                sx={{ width: "100%", height: 100, borderStyle: "dashed" }}
              >
                Upload Cover Photo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageSelect}
                />
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* ── Step 1: Dates & capacity ──────────────────────────────────── */}
      {activeStep === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Start Date"
            type="date"
            value={dates.startDate}
            onChange={(e) => setDates((p) => ({ ...p, startDate: e.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            value={dates.endDate}
            onChange={(e) => setDates((p) => ({ ...p, endDate: e.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: dates.startDate || undefined }}
          />
          <TextField
            label="Max Participants"
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            fullWidth
            placeholder="Leave blank for unlimited"
            inputProps={{ min: 1 }}
            helperText="Leave blank for unlimited participants"
          />
        </Box>
      )}

      {/* ── Step 2: Review ────────────────────────────────────────────── */}
      {activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          {imagePreview && (
            <Box
              component="img"
              src={imagePreview}
              alt="cover"
              sx={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 1, mb: 2 }}
            />
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Chip
              label={form.status}
              size="small"
              color={form.status === "planning" ? "info" : form.status === "ongoing" ? "success" : "default"}
              sx={{ textTransform: "capitalize" }}
            />
          </Box>

          <Typography variant="h6" fontWeight="bold">{form.title}</Typography>

          {form.destination && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
              <PlaceIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">{form.destination}</Typography>
            </Box>
          )}

          {(dates.startDate || dates.endDate) && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              <CalendarTodayIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {formatDate(dates.startDate)}
                {dates.startDate && dates.endDate ? " – " : ""}
                {formatDate(dates.endDate)}
              </Typography>
            </Box>
          )}

          {maxParticipants && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              <PeopleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Up to {maxParticipants} participants
              </Typography>
            </Box>
          )}

          {form.description && (
            <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
              {form.description}
            </Typography>
          )}

          {!form.destination && !dates.startDate && !maxParticipants && !form.description && !imagePreview && (
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Only the title was filled in — that's fine, you can always edit later.
            </Typography>
          )}
        </Paper>
      )}

      {/* Navigation buttons */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<ArrowBackIcon />}
        >
          Back
        </Button>

        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canNext()}
            endIcon={<ArrowForwardIcon />}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} /> : <ExploreOutlinedIcon />}
          >
            {loading ? "Creating..." : "Create Trip"}
          </Button>
        )}
      </Box>
    </Container>
  );
}
