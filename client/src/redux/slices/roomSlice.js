import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const createRoom = createAsyncThunk(
  "room/createRoom",
  async (quizId, thunkAPI) => {
    try {
      const res = await api.post("/rooms", { quizId });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to create room"
      );
    }
  }
);

export const fetchRoomByCode = createAsyncThunk(
  "room/fetchRoomByCode",
  async (roomCode, thunkAPI) => {
    try {
      const res = await api.get(`/rooms/${roomCode}`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Room not found"
      );
    }
  }
);

export const fetchRoomAnalytics = createAsyncThunk(
  "room/fetchRoomAnalytics",
  async (roomCode, thunkAPI) => {
    try {
      const res = await api.get(`/rooms/${roomCode}/analytics`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to load analytics"
      );
    }
  }
);

const roomSlice = createSlice({
  name: "room",
  initialState: {
    currentRoom: null,
    analytics: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearRoom: (state) => {
      state.currentRoom = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRoom = action.payload;
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchRoomByCode.fulfilled, (state, action) => {
        state.currentRoom = action.payload;
      })
      .addCase(fetchRoomByCode.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchRoomAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload;
      })
      .addCase(fetchRoomAnalytics.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearRoom } = roomSlice.actions;
export default roomSlice.reducer;