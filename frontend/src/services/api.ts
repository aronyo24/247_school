import axios from "axios";

// 🔹 Create a single Axios instance
const API = axios.create({
  baseURL: "/api",  // proxy will handle localhost in dev
});

// Fetch 5 random math questions
export const fetchRandomQuestions = async () => {
  const res = await API.get("/random-questions/");
  return res.data;
};

// Fetch team list
export const fetchTeam = async () => {
  const res = await API.get("/teams/");
  return res.data;
};

// Track visitor
export const trackVisitor = async (privateIp: string) => {
  try {
    await API.post("/track-visitor/", {
      private_ip: privateIp,
    });
  } catch (error) {
    console.error("Visitor tracking failed:", error);
  }
};

// Export quiz as PDF (sends questions payload, receives PDF blob)
export const exportQuizPdf = async (payload: { title?: string; questions: any[] }) => {
  const res = await API.post("/render-quiz-pdf/", payload, { responseType: "blob" });
  return res.data; // blob
};

export default API;
