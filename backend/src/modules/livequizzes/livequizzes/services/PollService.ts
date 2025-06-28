import { inject, injectable } from 'inversify';
import { Poll, PollAnswer } from '../interfaces/Poll.js';
import { pollSocket } from '../utils/PollSocket.js';
import { LIVE_QUIZ_TYPES } from '../types.js';
import { RoomService } from './RoomService.js';

const polls: Poll[] = [];
const pollAnswers: PollAnswer[] = [];

@injectable()
export class PollService {
  constructor(
    @inject(LIVE_QUIZ_TYPES.RoomService)
    private roomService: RoomService
  ) { }

  createPoll(data: {
    question: string;
    options: string[];
    roomCode: string;
    creatorId: string;
  }): Poll {
    const poll: Poll = {
      id: crypto.randomUUID(),
      question: data.question,
      options: data.options,
      roomCode: data.roomCode,
      creatorId: data.creatorId,
      createdAt: new Date(),
    };
    polls.push(poll);
    pollSocket.emitToRoom(poll.roomCode, 'new-poll', poll);
    return poll;
  }

  submitAnswer(pollId: string, userId: string, answerIndex: number) {
    pollAnswers.push({ pollId, userId, answerIndex });
  }

  getPollResults(roomCode: string) {
    if (this.roomService.isRoomEnded(roomCode)) {
      return { message: "Room has ended. Showing final poll results." };
    }
    const roomPolls = polls.filter(p => p.roomCode === roomCode);
    const results: Record<string, Record<string, { count: number; users: string[] }>> = {};

    for (const poll of roomPolls) {
      if (!poll.question || !Array.isArray(poll.options)) continue;

      const counts: number[] = Array(poll.options.length).fill(0);
      const users: string[][] = poll.options.map(() => []);

      for (const ans of pollAnswers.filter(a => a.pollId === poll.id)) {
        const index = ans.answerIndex;
        if (typeof index === 'number' && index >= 0 && index < poll.options.length) {
          counts[index]++;
          users[index].push(ans.userId);
        }
      }

      const pollResult = poll.options.reduce((acc, opt, i) => {
        if (typeof opt === 'string') {
          acc[opt] = {
            count: counts[i],
            users: users[i],
          };
        }
        return acc;
      }, {} as Record<string, { count: number; users: string[] }>);

      // Use poll.id instead of poll.question if question might be empty
      results[poll.question || `Poll ${poll.id}`] = pollResult;
    }

    return results;
  }
}