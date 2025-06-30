import {
  JsonController,
  Post,
  Get,
  Body,
  Param,
  Authorized,
} from 'routing-controllers';
import { inject, injectable } from 'inversify';
import { RoomService } from '../services/RoomService.js';
import { PollService } from '../services/PollService.js';
import { LIVE_QUIZ_TYPES } from '../types.js';
import { pollSocket } from '../utils/pollSocket.js';

@injectable()
@JsonController('/livequizzes/rooms')
export class PollRoomController {
  constructor(
    @inject(LIVE_QUIZ_TYPES.RoomService) private roomService: RoomService,
    @inject(LIVE_QUIZ_TYPES.PollService) private pollService: PollService
  ) { }

  @Authorized()
  @Post('/')
  createRoom(@Body() body: { name: string; teacherId: string }) {
    const room = this.roomService.createRoom(body.name, body.teacherId);
    return {
      ...room,
      inviteLink: `http://localhost:5137/join/${room.code}`
    };
  }

  // @Authorized()
  @Get('/:code')
  getRoom(@Param('code') code: string) {
    const room = this.roomService.getRoomByCode(code);
    if (!room) throw new Error('Room not found');
    return room;
  }

  // 🔹 Create Poll in Room with Timer Support
  // @Authorized()
  @Post('/:code/polls')
  createPollInRoom(
    @Param('code') roomCode: string,
    @Body() body: { 
      question: string; 
      options: string[]; 
      creatorId: string;
      timeLimit?: number; // in seconds
    }
  ) {
    const room = this.roomService.getRoomByCode(roomCode);
    if (!room) throw new Error('Invalid room');
    
    const poll = this.pollService.createPoll({ 
      ...body, 
      roomCode,
      timeLimit: body.timeLimit 
    });

    // Emit to all students in the room
    pollSocket.emitToRoom(roomCode, 'new-poll', poll);

    // Set up auto-end timer if timeLimit is specified
    if (body.timeLimit && body.timeLimit > 0) {
      setTimeout(() => {
        this.pollService.endPoll(poll.id);
        pollSocket.emitToRoom(roomCode, 'poll-ended', poll.id);
      }, body.timeLimit * 1000);
    }

    return poll;
  }

  // 🔹 Manually End Poll
  // @Authorized()
  @Post('/:code/polls/:pollId/end')
  endPoll(
    @Param('code') roomCode: string,
    @Param('pollId') pollId: string
  ) {
    const room = this.roomService.getRoomByCode(roomCode);
    if (!room) throw new Error('Invalid room');
    
    const success = this.pollService.endPoll(pollId);
    if (!success) throw new Error('Poll not found or already ended');

    // Notify all students that poll has ended
    pollSocket.emitToRoom(roomCode, 'poll-ended', pollId);
    
    return { success: true, message: 'Poll ended successfully' };
  }

  // 🔹 Submit Poll Answer
  // @Authorized()
  @Post('/:code/polls/answer')
  submitPollAnswer(
    @Param('code') roomCode: string,
    @Body() body: { pollId: string; userId: string; answerIndex: number }
  ) {
    // Check if poll is still active
    const poll = this.pollService.getPollById(body.pollId);
    if (!poll) throw new Error('Poll not found');
    if (!poll.isActive) throw new Error('Poll has ended');

    this.pollService.submitAnswer(body.pollId, body.userId, body.answerIndex);
    return { success: true };
  }

  // Fetch Results for All Polls in Room
  // @Authorized()
  @Get('/:code/polls/results')
  getResultsForRoom(@Param('code') code: string) {
    return this.pollService.getPollResults(code);
  }

  // Get specific poll results
  // @Authorized()
  @Get('/:code/polls/:pollId/results')
  getPollResults(
    @Param('code') roomCode: string,
    @Param('pollId') pollId: string
  ) {
    return this.pollService.getPollResultsById(pollId);
  }

  // Get active polls in room
  // @Authorized()
  @Get('/:code/polls/active')
  getActivePolls(@Param('code') roomCode: string) {
    const room = this.roomService.getRoomByCode(roomCode);
    if (!room) throw new Error('Room not found');
    
    return this.pollService.getActivePollsInRoom(roomCode);
  }

  //@Authorized()
  @Post('/:code/end')
  endRoom(@Param('code') code: string) {
    const success = this.roomService.endRoom(code);
    if (!success) throw new Error('Room not found');
    
    // End all active polls in the room
    this.pollService.endAllPollsInRoom(code);
    
    // Notify all students that room has ended
    pollSocket.emitToRoom(code, 'room-ended', { message: 'Room has been closed by the teacher' });
    
    return { success: true, message: 'Room ended successfully' };
  }
}