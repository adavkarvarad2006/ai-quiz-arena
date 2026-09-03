import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const generateQuizWithAI = createAsyncThunk(
  "quiz/generateQuizWithAI",
  async (formData, thunkAPI) => {
    try {
      const res = await api.post("/quizzes/generate", formData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "AI generation failed"
      );
    }
  }
);

export const fetchMyQuizzes = createAsyncThunk(
  "quiz/fetchMyQuizzes",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/quizzes");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to load quizzes"
      );
    }
  }
);

export const createQuiz = createAsyncThunk(
  "quiz/createQuiz",
  async (quizData, thunkAPI) => {
    try {
      const res = await api.post("/quizzes", quizData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to create quiz"
      );
    }
  }
);

export const fetchQuizById = createAsyncThunk(
  "quiz/fetchQuizById",
  async (id, thunkAPI) => {
    try {
      const res = await api.get(`/quizzes/${id}`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.message || "Failed to load quiz"
      );
    }
  }
);

const quizSlice = createSlice({
  name: "quiz",
  initialState: {
    quizzes: [],
    currentQuiz: null,
    generatedPreview: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentQuiz: (state) => {
      state.currentQuiz = null;
    },
    clearGeneratedPreview: (state) => {
      state.generatedPreview = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyQuizzes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyQuizzes.fulfilled, (state, action) => {
        state.loading = false;
        state.quizzes = action.payload;
      })
      .addCase(fetchMyQuizzes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createQuiz.fulfilled, (state, action) => {
        state.quizzes.unshift(action.payload);
      })
      .addCase(fetchQuizById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQuizById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentQuiz = action.payload;
      })
      .addCase(fetchQuizById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateQuizWithAI.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.generatedPreview = null;
      })
      .addCase(generateQuizWithAI.fulfilled, (state, action) => {
        state.loading = false;
        state.generatedPreview = action.payload;
      })
      .addCase(generateQuizWithAI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentQuiz, clearGeneratedPreview } = quizSlice.actions;
export default quizSlice.reducer;