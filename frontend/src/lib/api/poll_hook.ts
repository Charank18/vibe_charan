export async function createPoll(data: {
  question: string;
  options: string[];
  creatorId: string;
  roomCode: string;
}) {
  const res = await fetch(`/livequizzes/rooms/${data.roomCode}/polls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Authorization: `Bearer ${yourToken}`
    },
    body: JSON.stringify({
      question: data.question,
      options: data.options,
      creatorId: data.creatorId,
    }),
  });

  if (!res.ok) throw new Error("Failed to create poll");

  return await res.json(); // returns the created Poll
}
