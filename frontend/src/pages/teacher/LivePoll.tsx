import { useState } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function TeacherPoll() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [pollId, setPollId] = useState<string | null>(null);
  const [results, setResults] = useState<PollResults>({});

  const createPoll = async () => {
    try {
      const res = await api.post("/quizzes/live-poll", {
        question,
        options: options.filter((o) => o.trim()),
      });
      toast.success("Poll created!");
      setPollId(res.data.id);
      setResults({});
    } catch {
      toast.error("Poll creation failed.");
    }
  };

  const fetchResults = async () => {
    if (!pollId) return;
    try {
      const res = await api.get(`/quizzes/live-poll/results/${pollId}`);
      setResults(res.data);
    } catch {
      toast.error("Could not fetch results.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-2xl p-6 shadow-lg rounded-xl border bg-card">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Create Live Poll
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter your question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          {options.map((opt, i) => (
            <Input
              key={i}
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const copy = [...options];
                copy[i] = e.target.value;
                setOptions(copy);
              }}
            />
          ))}
          <Button className="w-full" onClick={createPoll}>
            Create Poll
          </Button>

          {pollId && (
            <>
              <Button
                variant="secondary"
                className="w-full"
                onClick={fetchResults}
              >
                Fetch Results
              </Button>
              <div>
                <h3 className="text-lg font-semibold mb-2">Poll Results</h3>
                <ul className="space-y-3">
                  {Object.entries(results).map(([option, data]) => (
                    <li
                      key={option}
                      className="border rounded-md p-3 shadow-sm bg-white dark:bg-muted"
                    >
                      <div className="font-medium text-black dark:text-white">
                        {option}:{" "}
                        <span className="text-blue-600 font-semibold">
                          {data.count}
                        </span>{" "}
                        vote(s)
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 ml-2">
                        {data.users && data.users.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {data.users.map((user, i) => <li key={i}>{user}</li>)}
                          </ul>
                        ) : (
                          <em>No users</em>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
