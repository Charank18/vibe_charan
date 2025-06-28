import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Helper to fetch room info
async function fetchRoom(code: string) {
  const res = await fetch(`/livequizzes/rooms/${code}`);
  if (!res.ok) throw new Error("Room not found");
  return await res.json();
}

// Helper to fetch polls in a room
async function fetchPolls(code: string) {
  const res = await fetch(`/livequizzes/rooms/${code}/polls`);
  if (!res.ok) throw new Error("No polls found");
  return await res.json();
}

// Helper to submit poll answer
async function submitAnswer(roomCode: string, pollId: string, userId: string, answerIndex: number) {
  const res = await fetch(`/livequizzes/rooms/${roomCode}/polls/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pollId, userId, answerIndex }),
  });
  if (!res.ok) throw new Error("Failed to submit answer");
  return await res.json();
}

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [userId, setUserId] = useState("");
  const [room, setRoom] = useState<any>(null);
  const [polls, setPolls] = useState<any[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Join room and fetch polls
  const handleJoin = async () => {
    setError(null);
    setSuccess("");
    setLoading(true);
    try {
      const roomData = await fetchRoom(roomCode);
      setRoom(roomData);
      const pollList = await fetchPolls(roomCode);
      setPolls(pollList);
      setSuccess("Joined room!");
    } catch (err: any) {
      setError(err.message || "Failed to join room");
      setRoom(null);
      setPolls([]);
    } finally {
      setLoading(false);
    }
  };

  // Submit answer to poll
  const handleSubmitAnswer = async () => {
    if (!selectedPoll || selectedOption === null || !userId) {
      setError("Please select an option and enter your User ID.");
      return;
    }
    setError(null);
    setSuccess("");
    setLoading(true);
    try {
      await submitAnswer(roomCode, selectedPoll.id, userId, selectedOption);
      setSuccess("Answer submitted!");
      setSelectedPoll(null);
      setSelectedOption(null);
    } catch (err: any) {
      setError(err.message || "Failed to submit answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-10">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Join Room</h2>
        <Card className="p-6 space-y-4">
          <Input
            placeholder="Room Code"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
          />
          <Input
            placeholder="Your User ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
          />
          <Button onClick={handleJoin} disabled={loading || !roomCode || !userId}>
            {loading ? "Joining..." : "Join Room"}
          </Button>
          {room && <p className="text-green-600">Room: {room.name}</p>}
        </Card>
      </div>

      {room && polls.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Available Polls</h2>
          <Card className="p-6 space-y-4">
            {polls.map((poll) => (
              <div key={poll.id} className="mb-6">
                <div className="font-medium mb-2">{poll.question}</div>
                <Button
                  variant="secondary"
                  onClick={() => setSelectedPoll(poll)}
                  disabled={selectedPoll && selectedPoll.id === poll.id}
                >
                  Attempt Poll
                </Button>
              </div>
            ))}
          </Card>
        </div>
      )}

      {selectedPoll && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Attempt Poll</h2>
          <Card className="p-6 space-y-4">
            <div className="mb-2 font-medium">{selectedPoll.question}</div>
            {selectedPoll.options.map((opt: string, idx: number) => (
              <div key={idx} className="flex items-center mb-2">
                <input
                  type="radio"
                  id={`option-${idx}`}
                  name="poll-option"
                  checked={selectedOption === idx}
                  onChange={() => setSelectedOption(idx)}
                />
                <label htmlFor={`option-${idx}`} className="ml-2">{opt}</label>
              </div>
            ))}
            <Button onClick={handleSubmitAnswer} disabled={selectedOption === null || loading}>
              {loading ? "Submitting..." : "Submit Answer"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="ml-2"
              onClick={() => {
                setSelectedPoll(null);
                setSelectedOption(null);
              }}
            >
              Cancel
            </Button>
          </Card>
        </div>
      )}

      {success && <p className="text-green-600">{success}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}