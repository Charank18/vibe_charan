import { injectable } from 'inversify';
import { LivePoll, LivePollInput } from '../types.js';
import { generatePollId } from '../utils/generatePollId.js';

interface PollAnswer {
  pollId: string;
  userId: string;
  answerIndex: number;
}

@injectable()
export class LivePollService {
  private activePoll: LivePoll | null = null;
  private pollAnswers: PollAnswer[] = [];
    createPoll(input: LivePollInput, teacherId: string): LivePoll {
      const poll: LivePoll = {
      id: generatePollId(),
      question: input.question,
      options: input.options,
      duration: input.duration || 60,
      createdBy: teacherId,
      createdAt: Date.now(),
    };
    this.activePoll = poll;
    this.pollAnswers = []; // Reset
    return poll;
  }

  getActivePoll(): LivePoll | null {
    if (!this.activePoll) return null;
    const expired = Date.now() > this.activePoll.createdAt + this.activePoll.duration * 1000;
    return expired ? null : this.activePoll;
  }

  submitAnswer(pollId: string, userId: string, answerIndex: number): boolean {
    const already = this.pollAnswers.find(ans => ans.pollId === pollId && ans.userId === userId);
    if (already) return false;
    this.pollAnswers.push({ pollId, userId, answerIndex });
    return true;
  }

getResults(pollId: string): Record<string, { count: number; users: string[] }> {
  const poll = this.activePoll;
  if (!poll || poll.id !== pollId) return {};
  const result: Record<string, { count: number; users: string[] }> = {};

  // Initialize result object for each option
  poll.options.forEach(opt => {
    result[opt] = { count: 0, users: [] };
  });

  for (const ans of this.pollAnswers) {
    if (ans.pollId === pollId) {
      const option = poll.options[ans.answerIndex];
      result[option].count++;
      result[option].users.push(ans.userId); // You can map userId to userName if needed
    }
  }
  return result;
}

}