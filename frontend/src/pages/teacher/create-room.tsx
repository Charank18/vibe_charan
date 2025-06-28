import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCreateRoom } from "@/lib/api/room_hook";
import { useCreatePoll } from "@/lib/api/poll_hook";

export default function CreateRoom() {
  const [roomName, setRoomName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const [roomSuccess, setRoomSuccess] = useState(false);
  const [pollSuccess, setPollSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loading states
  const [roomLoading, setRoomLoading] = useState(false);
  const [pollLoading, setPollLoading] = useState(false);

  const handleRoomSubmit = async () => {
    setError(null);
    setRoomSuccess(false);
    setRoomLoading(true);

    if (!roomName || !teacherId) {
      setError("Room Name and Teacher ID are required.");
      setRoomLoading(false);
      return;
    }

    try {
      const room = await useCreateRoom({ name: roomName, teacherId });
      setRoomCode(room.code);
      setRoomSuccess(true);
      setRoomName("");
      setTeacherId("");
    } catch (err) {
      setError("Failed to create room.");
    } finally {
      setRoomLoading(false);
    }
  };

  const handlePollSubmit = async () => {
    setError(null);
    setPollSuccess(false);
    setPollLoading(true);

    if (!question || options.some(opt => !opt) || !roomCode) {
      setError("Please complete all fields for the poll.");
      setPollLoading(false);
      return;
    }

    try {
      await useCreatePoll({ question, options, roomCode, creatorId: teacherId });
      setPollSuccess(true);
      setQuestion("");
      setOptions(["", ""]);
    } catch {
      setError("Failed to create poll. Please try again.");
    } finally {
      setPollLoading(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    setOptions(updatedOptions);
  };

  return (
    <div className="max-w-xl mx-auto space-y-10">
      {/* Room Creation */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Create Room</h2>
        <Card className="p-6 space-y-4">
          <Input
            placeholder="Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <Input
            placeholder="Teacher ID"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          />
          <Button onClick={handleRoomSubmit} disabled={roomLoading}>
            {roomLoading ? "Creating..." : "Create Room"}
          </Button>
          {roomSuccess && <p className="text-green-600">Room created successfully!</p>}
        </Card>
      </div>

      {/* Poll Creation */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Create Poll</h2>
        <Card className="p-6 space-y-4">
          <Input
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          {options.map((option, index) => (
            <Input
              key={index}
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOptions([...options, ""])}
          >
            Add Option
          </Button>

          <Input
            placeholder="Room Code"
            value={roomCode}
            disabled
          />

          <Button
            onClick={handlePollSubmit}
            disabled={!roomCode || pollLoading}
          >
            {pollLoading ? "Creating..." : "Create Poll"}
          </Button>
          {pollSuccess && <p className="text-green-600">Poll created successfully!</p>}
        </Card>
      </div>

      {/* Error Display */}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
