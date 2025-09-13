import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import HeroSection from '@/components/HeroSection';
import ClassSelector from '@/components/ClassSelector';
import SubjectsSection from '@/components/SubjectsSection';
import FeaturesSection from '@/components/FeaturesSection';
import DashboardPreview from '@/components/DashboardPreview';

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

const Index = () => {
  const location = useLocation();
  const [djangoMessage, setDjangoMessage] = useState('');
  const [questionsCount, setQuestionsCount] = useState(6);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Scroll logic
    if (location.state?.scrollToSubjects) {
      const subjectsSection = document.getElementById('subjects');
      if (subjectsSection) {
        subjectsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // ✅ Fetch message from Django API

  }, [location]);

  const handleDownloadQuiz = async (nVariants = 1, questions = questionsCount) => {
    try {
      setDownloading(true);
      const url = `${API_BASE}/api/generate-quiz/?n_variants=${nVariants}&questions=${questions}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const blob = await res.blob();
      const filename = nVariants > 1 ? "quizzes.zip" : "quiz.pdf";
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlObj);
    } catch (err) {
      console.error("Download error:", err);
      alert("Quiz download failed — see console.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen">
         <div className="text-center fixed 4 left-1/2 transform -translate-x-1/2 bg-red-700 text-white font-extrabold px-8 py-3 rounded-md shadow-lg border border-red-900 animate-pulse tracking-wide">
  🚧 Site is Under Development 🚧
</div>

      {/* Quick Quiz PDF download controls */}
      

      <HeroSection />

      {/* ✅ Django Message */}
      <div className="text-center mt-6 text-blue-700 font-semibold animate-fade-in">
        {djangoMessage && `📡 Message from backend: ${djangoMessage}`}
      </div>

      <ClassSelector />
      <SubjectsSection />
      <FeaturesSection />
      <DashboardPreview />

      {/* Footer */}
      <footer className="bg-gradient-to-r from-eduplay-purple via-eduplay-blue to-eduplay-green py-12 animate-fade-in">
        <div className="container mx-auto px-4 text-center">
          <div className="text-white space-y-4">
            <h3 className="text-3xl font-bold animate-bounce-gentle">247School</h3>
            <p className="text-lg opacity-90 animate-slide-in-right">Learning 24/7, One Lesson at a Time! 🌟</p>
            <div className="flex justify-center space-x-6 text-4xl">
              <span className="animate-bounce-gentle">🎓</span>
              <span className="animate-wiggle">📚</span>
              <span className="animate-float">⭐</span>
              <span className="animate-scale-bounce">🏆</span>
              <span className="animate-pulse">🚀</span>
            </div>
            <p className="text-sm opacity-75 mt-8 animate-fade-in delay-500">
              © 2024 247School. Designed with ❤️ for young learners everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
