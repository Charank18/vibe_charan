import { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const socket = io("http://localhost:3000"); // adjust if needed
const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

type Poll = {
  id: string;
  question: string;
  options: string[];
  roomCode: string;
  creatorId: string;
  createdAt: string;
  timeLimit?: number; // in seconds
  isActive?: boolean;
  endTime?: string;
};

type RoomDetails = {
  code: string;
  creatorId: string;
  createdAt: string;
};

export default function StudentPollPage() {
  const [roomCode, setRoomCode] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [answeredPolls, setAnsweredPolls] = useState<Record<string, number>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [roomError, setRoomError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<"room" | "previous" | null>(null);
  const [pollTimers, setPollTimers] = useState<Record<string, number>>({});

  // Timer effect for active polls
  useEffect(() => {
    const interval = setInterval(() => {
      setPollTimers(prev => {
        const updated = { ...prev };
        let hasChanges = false;

        polls.forEach(poll => {
          if (poll.isActive && poll.timeLimit && poll.endTime) {
            const endTime = new Date(poll.endTime).getTime();
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            
            if (updated[poll.id] !== remaining) {
              updated[poll.id] = remaining;
              hasChanges = true;

              // Auto-submit when timer reaches 0
              if (remaining === 0 && selectedAnswers[poll.id] !== undefined) {
                submitAnswer(poll.id, selectedAnswers[poll.id], true);
              }
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [polls, selectedAnswers]);

  // Auto-rejoin if user refreshes
  useEffect(() => {
    const savedRoomCode = localStorage.getItem("activeRoomCode");
    const savedJoined = localStorage.getItem("joinedRoom");
    if (savedRoomCode && savedJoined === "true") {
      setRoomCode(savedRoomCode);
      setJoinedRoom(true);
      socket.emit("join-room", savedRoomCode);
      loadRoomDetails(savedRoomCode);
      const savedAnswers = localStorage.getItem(`answeredPolls_${savedRoomCode}`);
      if (savedAnswers) setAnsweredPolls(JSON.parse(savedAnswers));
    }
  }, []);

  useEffect(() => {
    socket.on("new-poll", (poll: Poll) => {
      setPolls(prev => [...prev, poll]);
      // Initialize timer if poll has time limit
      if (poll.timeLimit && poll.endTime) {
        const endTime = new Date(poll.endTime).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setPollTimers(prev => ({ ...prev, [poll.id]: remaining }));
      }
      toast("New poll received!");
    });

    socket.on("poll-ended", (pollId: string) => {
      setPolls(prev => prev.map(p => p.id === pollId ? { ...p, isActive: false } : p));
      // Auto-submit selected answer if poll ends
      if (selectedAnswers[pollId] !== undefined) {
        submitAnswer(pollId, selectedAnswers[pollId], true);
      }
      toast("Poll has ended!");
    });

    return () => { 
      socket.off("new-poll"); 
      socket.off("poll-ended");
    };
  }, [selectedAnswers]);

  useEffect(() => {
    if (roomCode) {
      localStorage.setItem(`answeredPolls_${roomCode}`, JSON.stringify(answeredPolls));
    }
  }, [answeredPolls, roomCode]);

  const loadRoomDetails = async (code: string) => {
    try {
      const res = await api.get(`/livequizzes/rooms/${code}`);
      if (res.data) setRoomDetails(res.data);
    } catch (e) {
      console.error("Failed to load room details:", e);
    }
  };

  const joinRoom = async () => {
    setRoomError(null);
    try {
      const res = await api.get(`/livequizzes/rooms/${roomCode}`);
      if (res.data?.code) {
        socket.emit("join-room", roomCode);
        setJoinedRoom(true);
        setRoomDetails(res.data);
        localStorage.setItem("activeRoomCode", roomCode);
        localStorage.setItem("joinedRoom", "true");
        setPolls([]); // reset polls
        setSelectedAnswers({});
        setPollTimers({});
        const savedAnswers = localStorage.getItem(`answeredPolls_${roomCode}`);
        setAnsweredPolls(savedAnswers ? JSON.parse(savedAnswers) : {});
        toast.success("Joined room!");
      } else {
        setRoomError("Invalid room code.");
      }
    } catch (error: any) {
      setRoomError(error.response?.status === 404 ? "Room not found." : "Unexpected error.");
    }
  };

  const selectAnswer = (pollId: string, answerIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [pollId]: answerIndex }));
  };

  const submitAnswer = async (pollId: string, answerIndex: number, autoSubmit = false) => {
    try {
      await api.post(`/livequizzes/rooms/${roomCode}/polls/answer`, {
        pollId, userId: "student-456", answerIndex
      });
      setAnsweredPolls(prev => ({ ...prev, [pollId]: answerIndex }));
      setSelectedAnswers(prev => {
        const updated = { ...prev };
        delete updated[pollId];
        return updated;
      });
      toast.success(autoSubmit ? "Answer auto-submitted!" : "Vote submitted!");
    } catch {
      toast.error("Failed to submit vote");
    }
  };

  const exitRoom = () => {
    socket.emit("leave-room", roomCode);
    setJoinedRoom(false);
    setPolls([]);
    setAnsweredPolls({});
    setSelectedAnswers({});
    setPollTimers({});
    setRoomDetails(null);
    localStorage.removeItem("activeRoomCode");
    localStorage.removeItem("joinedRoom");
    setActiveMenu(null);
    toast.info("Left the room.");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activePollsToShow = polls.filter(p => 
    answeredPolls[p.id] === undefined && (p.isActive !== false)
  );

  return (
    <div className="max-w-6xl mx-auto mt-10 flex gap-4">
      <Card className="flex-1 p-6">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Student Poll Room</CardTitle>
          {joinedRoom && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">☰</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() =>
                  setActiveMenu(activeMenu === "room" ? null : "room")
                }>
                  📄 Room Info
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() =>
                  setActiveMenu(activeMenu === "previous" ? null : "previous")
                }>
                  🗂 Previous Polls
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exitRoom} className="text-red-600">
                  ❌ Leave Room
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent>
          {!joinedRoom ? (
            <>
              <Input
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => { setRoomCode(e.target.value); setRoomError(null); }}
                className="mb-3"
              />
              {roomError && <div className="text-red-500 text-sm mb-2">{roomError}</div>}
              <Button className="w-full" onClick={joinRoom}>Join Room</Button>
            </>
          ) : (
            <>
              <div className="font-semibold mb-2">Active Polls:</div>
              {activePollsToShow.length === 0 && (
                <div className="text-sm text-gray-500">Waiting for new polls...</div>
              )}
              {activePollsToShow.map((poll) => {
                const timeRemaining = pollTimers[poll.id];
                const hasTimeLimit = poll.timeLimit && timeRemaining !== undefined;
                const selectedAnswer = selectedAnswers[poll.id];
                
                return (
                  <div key={poll.id} className="p-4 border rounded-md mb-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-medium text-lg">{poll.question}</div>
                      {hasTimeLimit && (
                        <div className={`text-sm font-mono px-2 py-1 rounded ${
                          timeRemaining <= 30 ? 'bg-red-100 text-red-700' : 
                          timeRemaining <= 60 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          ⏱ {formatTime(timeRemaining)}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {poll.options.map((opt, i) => (
                        <button
                          key={i}
                          className={`w-full p-3 text-left border rounded-md transition-colors ${
                            selectedAnswer === i 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => selectAnswer(poll.id, i)}
                          disabled={hasTimeLimit && timeRemaining === 0}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          {opt}
                        </button>
                      ))}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => submitAnswer(poll.id, selectedAnswer)}
                      disabled={selectedAnswer === undefined || (hasTimeLimit && timeRemaining === 0)}
                      variant={selectedAnswer !== undefined ? "default" : "outline"}
                    >
                      {selectedAnswer !== undefined ? "Submit Answer" : "Select an answer first"}
                    </Button>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {/* Side panel */}
      {activeMenu && (
        <div className="w-64 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
          {activeMenu === "room" && roomDetails && (
            <>
              <div className="font-semibold mb-2">Room Details</div>
              <div className="text-xs">
                Code: {roomDetails.code}<br/>
                Creator: {roomDetails.creatorId}<br/>
                Created: {new Date(roomDetails.createdAt).toLocaleString()}
              </div>
            </>
          )}
          {activeMenu === "previous" && (
            <>
              <div className="font-semibold mb-2">Previous Polls</div>
              <div className="text-xs space-y-2">
                {Object.keys(answeredPolls).length === 0 ? (
                  <div className="text-gray-500">No previous polls</div>
                ) : polls.filter(p => answeredPolls[p.id] !== undefined).map((poll) => (
                  <div key={poll.id} className="p-2 bg-white rounded border">
                    <div className="font-medium text-sm mb-1">{poll.question}</div>
                    <div className="text-xs text-green-600">
                      ✔ Your answer: <span className="font-semibold">{poll.options[answeredPolls[poll.id]]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}