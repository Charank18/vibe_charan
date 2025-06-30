// import { inject, injectable } from 'inversify';
// import { Poll, PollAnswer } from '../interfaces/Poll.js';
// import { pollSocket } from '../utils/PollSocket.js';
// import { LIVE_QUIZ_TYPES } from '../types.js';
// import { RoomService } from './RoomService.js';

// const polls: Poll[] = [];
// const pollAnswers: PollAnswer[] = [];

// @injectable()
// export class PollService {
//   constructor(
//     @inject(LIVE_QUIZ_TYPES.RoomService)
//     private roomService: RoomService
//   ) { }

//   createPoll(data: {
//     question: string;
//     options: string[];
//     roomCode: string;
//     creatorId: string;
//   }): Poll {
//     const poll: Poll = {
//       id: crypto.randomUUID(),
//       question: data.question,
//       options: data.options,
//       roomCode: data.roomCode,
//       creatorId: data.creatorId,
//       createdAt: new Date(),
//     };
//     polls.push(poll);
//     pollSocket.emitToRoom(poll.roomCode, 'new-poll', poll);
//     return poll;
//   }

//   submitAnswer(pollId: string, userId: string, answerIndex: number) {
//     pollAnswers.push({ pollId, userId, answerIndex });
//   }

//   getPollResults(roomCode: string) {
//     if (this.roomService.isRoomEnded(roomCode)) {
//       return { message: "Room has ended. Showing final poll results." };
//     }
//     const roomPolls = polls.filter(p => p.roomCode === roomCode);
//     const results: Record<string, Record<string, { count: number; users: string[] }>> = {};

//     for (const poll of roomPolls) {
//       if (!poll.question || !Array.isArray(poll.options)) continue;

//       const counts: number[] = Array(poll.options.length).fill(0);
//       const users: string[][] = poll.options.map(() => []);

//       for (const ans of pollAnswers.filter(a => a.pollId === poll.id)) {
//         const index = ans.answerIndex;
//         if (typeof index === 'number' && index >= 0 && index < poll.options.length) {
//           counts[index]++;
//           users[index].push(ans.userId);
//         }
//       }

//       const pollResult = poll.options.reduce((acc, opt, i) => {
//         if (typeof opt === 'string') {
//           acc[opt] = {
//             count: counts[i],
//             users: users[i],
//           };
//         }
//         return acc;
//       }, {} as Record<string, { count: number; users: string[] }>);

//       // Use poll.id instead of poll.question if question might be empty
//       results[poll.question || `Poll ${poll.id}`] = pollResult;
//     }

//     return results;
//   }
// }




import { injectable } from 'inversify';

export type Poll = {
  id: string;
  question: string;
  options: string[];
  roomCode: string;
  creatorId: string;
  createdAt: string;
  timeLimit?: number; // in seconds
  endTime?: string; // ISO string
  isActive: boolean;
};

export type PollAnswer = {
  pollId: string;
  userId: string;
  answerIndex: number;
  submittedAt: string;
};

@injectable()
export class PollService {
  private polls: Map<string, Poll> = new Map();
  private answers: Map<string, PollAnswer[]> = new Map(); // pollId -> answers

  createPoll(data: {
    question: string;
    options: string[];
    roomCode: string;
    creatorId: string;
    timeLimit?: number;
  }): Poll {
    const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const poll: Poll = {
      id: pollId,
      question: data.question,
      options: data.options,
      roomCode: data.roomCode,
      creatorId: data.creatorId,
      createdAt: now,
      timeLimit: data.timeLimit,
      endTime: data.timeLimit ? new Date(Date.now() + data.timeLimit * 1000).toISOString() : undefined,
      isActive: true,
    };

    this.polls.set(pollId, poll);
    this.answers.set(pollId, []);
    
    console.log(`Created poll: ${pollId} with timer: ${data.timeLimit}s`);
    return poll;
  }

  getPollById(pollId: string): Poll | undefined {
    return this.polls.get(pollId);
  }

  endPoll(pollId: string): boolean {
    const poll = this.polls.get(pollId);
    if (!poll) return false;
    
    poll.isActive = false;
    this.polls.set(pollId, poll);
    
    console.log(`Ended poll: ${pollId}`);
    return true;
  }

  submitAnswer(pollId: string, userId: string, answerIndex: number): boolean {
    const poll = this.polls.get(pollId);
    if (!poll || !poll.isActive) {
      console.log(`Cannot submit answer - poll ${pollId} is not active or doesn't exist`);
      return false;
    }

    // Check if poll has expired
    if (poll.endTime && new Date() > new Date(poll.endTime)) {
      console.log(`Cannot submit answer - poll ${pollId} has expired`);
      poll.isActive = false;
      this.polls.set(pollId, poll);
      return false;
    }

    // Check if user already answered
    const existingAnswers = this.answers.get(pollId) || [];
    const existingAnswer = existingAnswers.find(a => a.userId === userId);
    
    if (existingAnswer) {
      console.log(`User ${userId} already answered poll ${pollId}`);
      return false;
    }

    // Validate answer index
    if (answerIndex < 0 || answerIndex >= poll.options.length) {
      console.log(`Invalid answer index ${answerIndex} for poll ${pollId}`);
      return false;
    }

    const answer: PollAnswer = {
      pollId,
      userId,
      answerIndex,
      submittedAt: new Date().toISOString(),
    };

    existingAnswers.push(answer);
    this.answers.set(pollId, existingAnswers);
    
    console.log(`Answer submitted for poll ${pollId} by user ${userId}: option ${answerIndex}`);
    return true;
  }

  getPollResults(roomCode: string): Record<string, Record<string, { count: number; users: string[] }>> {
    const results: Record<string, Record<string, { count: number; users: string[] }>> = {};

    // Get all polls for this room
    const roomPolls = Array.from(this.polls.values()).filter(p => p.roomCode === roomCode);

    for (const poll of roomPolls) {
      const pollAnswers = this.answers.get(poll.id) || [];
      const pollResults: Record<string, { count: number; users: string[] }> = {};

      // Initialize options
      poll.options.forEach(option => {
        pollResults[option] = { count: 0, users: [] };
      });

      // Count answers
      pollAnswers.forEach(answer => {
        const selectedOption = poll.options[answer.answerIndex];
        if (selectedOption) {
          pollResults[selectedOption].count++;
          pollResults[selectedOption].users.push(answer.userId);
        }
      });

      results[poll.question] = pollResults;
    }

    return results;
  }

  getPollResultsById(pollId: string): Record<string, { count: number; users: string[] }> | null {
    const poll = this.polls.get(pollId);
    if (!poll) return null;

    const pollAnswers = this.answers.get(pollId) || [];
    const results: Record<string, { count: number; users: string[] }> = {};

    // Initialize options
    poll.options.forEach(option => {
      results[option] = { count: 0, users: [] };
    });

    // Count answers
    pollAnswers.forEach(answer => {
      const selectedOption = poll.options[answer.answerIndex];
      if (selectedOption) {
        results[selectedOption].count++;
        results[selectedOption].users.push(answer.userId);
      }
    });

    return results;
  }

  getActivePollsInRoom(roomCode: string): Poll[] {
    const now = new Date();
    return Array.from(this.polls.values())
      .filter(poll => {
        if (poll.roomCode !== roomCode) return false;
        if (!poll.isActive) return false;
        
        // Check if poll has expired
        if (poll.endTime && now > new Date(poll.endTime)) {
          poll.isActive = false;
          this.polls.set(poll.id, poll);
          return false;
        }
        
        return true;
      });
  }

  endAllPollsInRoom(roomCode: string): number {
    let endedCount = 0;
    
    for (const [pollId, poll] of this.polls.entries()) {
      if (poll.roomCode === roomCode && poll.isActive) {
        poll.isActive = false;
        this.polls.set(pollId, poll);
        endedCount++;
      }
    }
    
    console.log(`Ended ${endedCount} polls in room ${roomCode}`);
    return endedCount;
  }

  // Get polls by room (all polls, active and inactive)
  getPollsByRoom(roomCode: string): Poll[] {
    return Array.from(this.polls.values()).filter(p => p.roomCode === roomCode);
  }

  // Get user's answers for a specific room
  getUserAnswersInRoom(userId: string, roomCode: string): Record<string, number> {
    const userAnswers: Record<string, number> = {};
    const roomPolls = this.getPollsByRoom(roomCode);
    
    for (const poll of roomPolls) {
      const pollAnswers = this.answers.get(poll.id) || [];
      const userAnswer = pollAnswers.find(a => a.userId === userId);
      if (userAnswer) {
        userAnswers[poll.id] = userAnswer.answerIndex;
      }
    }
    
    return userAnswers;
  }

  // Clean up expired polls (optional maintenance method)
  cleanupExpiredPolls(): number {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [pollId, poll] of this.polls.entries()) {
      if (poll.endTime && now > new Date(poll.endTime) && poll.isActive) {
        poll.isActive = false;
        this.polls.set(pollId, poll);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired polls`);
    }
    
    return cleanedCount;
  }
}