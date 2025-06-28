export async function createRoom(data: {
  name: string;
  teacherId: string;
}) {
  const res = await fetch("/livequizzes/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Include token header if using auth:
      // Authorization: `Bearer ${yourToken}`
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create room");

  return await res.json(); // returns { code, name, teacherId, createdAt, status, inviteLink }
}
