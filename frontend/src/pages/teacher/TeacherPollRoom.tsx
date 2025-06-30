import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Axios instance
const API_URL = import.meta.env.VITE_API_URL;
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

type PollResults = Record<string, Record<string, { count: number; users: string[] }>>;

type ActivePoll = {
  id: string;
  question: string;
  options: string[];
  timeLimit?: number;
  endTime?: string;
  isActive: boolean;
};

export default function TeacherPollRoom() {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [pollResults, setPollResults] = useState<PollResults>({});

  const [enableTimer, setEnableTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(2);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activePolls, setActivePolls] = useState<ActivePoll[]>([]);

  const createRoom = async () => {
    try {
      const res = await api.post("/livequizzes/rooms/", {
        name: roomName,
        teacherId: "teacher-123",
      });
      setRoomCode(res.data.code);
      setInviteLink(res.data.inviteLink);
      toast.success("Room created!");
    } catch {
      toast.error("Failed to create room");
    }
  };

  const createPoll = async () => {
    if (!roomCode) return toast.error("No room created");

    const filteredOptions = options.filter((o) => o.trim());
    if (filteredOptions.length < 2) {
      return toast.error("Please provide at least 2 options");
    }

    try {
      const timeLimit = enableTimer ? timerMinutes * 60 + timerSeconds : undefined;

      const response = await api.post(`/livequizzes/rooms/${roomCode}/polls`, {
        question,
        options: filteredOptions,
        creatorId: "teacher-123",
        timeLimit,
      });

      if (enableTimer && timeLimit) {
        const endTime = new Date(Date.now() + timeLimit * 1000).toISOString();
        setActivePolls((prev) => [
          ...prev,
          {
            id: response.data.id,
            question,
            options: filteredOptions,
            timeLimit,
            endTime,
            isActive: true,
          },
        ]);
      }

      toast.success("Poll created and sent to students!");
      setQuestion("");
      setOptions(["", "", "", ""]);
      setEnableTimer(false);
      setTimerMinutes(2);
      setTimerSeconds(0);
    } catch {
      toast.error("Failed to create poll");
    }
  };

  const endPoll = async (pollId: string) => {
    try {
      await api.post(`/livequizzes/rooms/${roomCode}/polls/${pollId}/end`);
      setActivePolls((prev) =>
        prev.map((p) => (p.id === pollId ? { ...p, isActive: false } : p))
      );
      toast.success("Poll ended!");
    } catch {
      toast.error("Failed to end poll");
    }
  };

  const fetchResults = async () => {
    if (!roomCode) return;
    try {
      const res = await api.get(`/livequizzes/rooms/${roomCode}/polls/results`);
      setPollResults(res.data);
    } catch {
      toast.error("Failed to fetch results");
    }
  };

  const fetchPollResults = async (pollId: string) => {
    try {
      const res = await api.get(`/livequizzes/rooms/${roomCode}/polls/${pollId}/results`);
      console.log("Poll results:", res.data);
      toast.success("Check console for detailed results");
    } catch {
      toast.error("Failed to fetch poll results");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-6">
      {/* Room Creation */}
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Teacher Room & Polls</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="mb-3"
          />
          <Button className="w-full mb-4" onClick={createRoom}>
            Create Room
          </Button>

          {inviteLink && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="text-sm font-medium text-green-800 mb-1">Room Created!</div>
              <div className="text-sm text-green-700">
                <strong>Room Code:</strong> {roomCode}
              </div>
              <div className="text-sm text-green-700">
                <strong>Invite Link:</strong>{" "}
                <code className="bg-green-100 px-2 py-1 rounded">{inviteLink}</code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Poll Creation */}
      {roomCode && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Create New Poll</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Poll question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="mb-4"
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
                className="mb-2"
              />
            ))}

            {/* Timer Configuration */}
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox
                  id="enable-timer"
                  checked={enableTimer}
                  onCheckedChange={(checked) => setEnableTimer(checked as boolean)}
                />
                <Label htmlFor="enable-timer" className="font-medium">
                  Enable Timer
                </Label>
              </div>

              {enableTimer && (
                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Duration:</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-sm">min</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-sm">sec</span>
                  <div className="text-sm text-gray-600 ml-4">
                    Total: {formatTime(timerMinutes * 60 + timerSeconds)}
                  </div>
                </div>
              )}
            </div>

            <Button className="w-full mt-4" onClick={createPoll}>
              Create Poll
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Polls */}
      {activePolls.length > 0 && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Active Polls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activePolls.map((poll) => (
                <div key={poll.id} className="p-4 border rounded-md bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{poll.question}</div>
                    <div className="flex items-center space-x-2">
                      {poll.timeLimit && (
                        <span
                          className={`text-sm px-2 py-1 rounded ${
                            poll.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {formatTime(poll.timeLimit)}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          poll.isActive ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {poll.isActive ? "Active" : "Ended"}
                      </span>
                    </div>
                  </div>
                  <ul className="mb-2 list-disc list-inside text-sm text-gray-700">
                    {poll.options.map((opt, i) => (
                      <li key={i}>{opt}</li>
                    ))}
                  </ul>
                  <div className="flex gap-2 mt-2">
                    {poll.isActive && (
                      <Button variant="destructive" size="sm" onClick={() => endPoll(poll.id)}>
                        End Poll
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => fetchPollResults(poll.id)}>
                      View Results
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
