import { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Create a pre-configured axios instance
const API_URL = import.meta.env.VITE_API_URL;
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

type PollResults = Record<string, { count: number; users: string[] }>;

export default function StudentPoll() {
  const [poll, setPoll] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<PollResults | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const { data } = await api.get("/quizzes/live-poll/active");
        if (!poll || poll.id !== data.id) {
          toast.info("New poll received!");
          setPoll(data);
          setResult(null);
          const createdAt = data.createdAt;
          const duration = data.duration;
          const elapsed = Math.floor((Date.now() - createdAt) / 1000);
          setRemaining(Math.max(0, duration - elapsed));

          // Restore state from localStorage
          const submitted = localStorage.getItem(`poll_${data.id}_submitted`) === "true";
          const storedSelected = localStorage.getItem(`poll_${data.id}_selected`);
          setHasSubmitted(submitted);
          setSelected(storedSelected ? Number(storedSelected) : null);
        }
      } catch {
        console.warn("No active poll found or expired.");
      }
    };

    fetchPoll();
    const interval = setInterval(fetchPoll, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!poll || remaining <= 0) {return};
    const timeout = setTimeout(() => {
      setRemaining(0);
      fetchResults();
    }, remaining * 1000);

    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [poll, remaining]);


  const handleSubmit = async () => {
    if (selected === null || !poll) return;
    try {
      await api.post("/quizzes/live-poll/answer", {
        pollId: poll.id,
        answerIndex: selected,
      });
      toast.success("Answer submitted successfully!");
      setHasSubmitted(true);
      // Save to localStorage
      localStorage.setItem(`poll_${poll.id}_submitted`, "true");
      localStorage.setItem(`poll_${poll.id}_selected`, String(selected));
    } catch {
      toast.error("You may have already submitted.");
    }
  };


  const fetchResults = async () => {
    try {
      const res = await api.get(`/quizzes/live-poll/results/${poll.id}`);
      setResult(res.data);
      setShowResults(true);
      toast.warning("Poll ended. Results displayed.");
    } catch {
      toast.error("Could not load results.");
    }
  };

  const exitResults = () => {
    setResult(null);
    setHasSubmitted(false);
    setSelected(null);
    localStorage.removeItem(`poll_${poll?.id}_submitted`);
    localStorage.removeItem(`poll_${poll?.id}_selected`);
  };

  if (!poll)
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          Waiting for live poll...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-xl p-6 shadow-lg rounded-xl border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            {poll.question}
          </CardTitle>
          <p className="text-muted-foreground mt-1">
            Time left: {remaining}s
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {poll.options.map((option: string, index: number) => (
            <Button
              key={index}
              variant={selected === index ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setSelected(index)}
              disabled={hasSubmitted || !!result || remaining === 0}
            >
              {option}
            </Button>
          ))}

          <Button
            onClick={handleSubmit}
            disabled={selected === null || hasSubmitted || !!result || remaining === 0}
            className="w-full"
          >
            Submit Answer
          </Button>

          {hasSubmitted && !result && (
            <div className="text-sm text-green-600 dark:text-green-400 text-center">
              ✅ Your response has been recorded. Waiting for poll to end...
            </div>
          )}

          {result && (
            <div className="mt-6">
              <h3 className="font-bold text-lg">Results:</h3>
              <ul className="space-y-2 mt-2 text-sm">
                {Object.entries(result).map(([option, data], index) => (
                  <li key={index} className="border-b pb-3">
                    <div className="flex justify-between font-medium">
                      <span>{option}</span>
                      <span className="font-semibold text-blue-600">{data.count} vote(s)</span>
                    </div>
                    <ul className="ml-4 mt-1 text-sm text-gray-600 dark:text-gray-300 list-disc">
                      {data.users.length > 0 ? (
                        data.users.map((user, i) => (
                          <li key={i}>👤 {user || <em>Anonymous</em>}</li>
                        ))
                      ) : (
                        <li><em>No voters</em></li>
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
              <Button onClick={exitResults}
                className="w-full mt-4"
                variant="destructive"
              >
                Exit Results
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
