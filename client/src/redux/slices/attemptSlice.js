import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const submitAttempt = createAsyncThunk(
  "attempt/submitAttempt",
  async ({ quizId, answers }, thunkAPI) => {
    try {
      const res = await api.post("/attempts", { quizId, answers });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to submit attempt"
      );
    }
  }
);

export const fetchAttemptById = createAsyncThunk(
  "attempt/fetchAttemptById",
  async (id, thunkAPI) => {
    try {
      const res = await api.get(`/attempts/${id}`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to load attempt"
      );
    }
  }
);

export const fetchMyAttempts = createAsyncThunk(
  "attempt/fetchMyAttempts",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/attempts/my");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to load attempts"
      );
    }
  }
);

const attemptSlice = createSlice({
  name: "attempt",
  initialState: {
    myAttempts: [],
    currentAttempt: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentAttempt: (state) => {
      state.currentAttempt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitAttempt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitAttempt.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAttempt = action.payload;
      })
      .addCase(submitAttempt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAttemptById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAttemptById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAttempt = action.payload;
      })
      .addCase(fetchMyAttempts.fulfilled, (state, action) => {
        state.myAttempts = action.payload;
      });
  },
});

export const { clearCurrentAttempt } = attemptSlice.actions;
export default attemptSlice.reducer;