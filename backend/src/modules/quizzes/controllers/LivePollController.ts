// import {
//   JsonController, Post, Body, Get, Param
// } from 'routing-controllers';
// import { inject, injectable } from 'inversify';
// import { LivePollService } from '../services/LivePollService.js';
// import { LivePollInput } from '../types.js';
// import { QUIZZES_TYPES } from '../types.js';

// @injectable()
// @JsonController('/quizzes/live-poll')
// export class LivePollController {
//   constructor(
//     @inject(QUIZZES_TYPES.LivePollService)
//     private pollService: LivePollService
//   ) {}

//   @Post('/')
//   createPoll(@Body() input: LivePollInput & { teacherId: string }) {
//     return this.pollService.createPoll(input, input.teacherId);
//   }

//   @Get('/active')
//   getActivePoll() {
//     return this.pollService.getActivePoll();
//   }

//   @Post('/answer')
//   submitAnswer(@Body() body: { pollId: string; answerIndex: number; userId: string }) {
//     const success = this.pollService.submitAnswer(body.pollId, body.userId, body.answerIndex);
//     return { success };
//   }

//   @Get('/results/:id')
//   getResults(@Param('id') id: string) {
//     return this.pollService.getResults(id);
//   }
// }

// Comment the above code and Uncomment the following code if you want to use authorization

@injectable()
@JsonController('/quizzes/live-poll')
export class LivePollController {
 constructor(
   @inject(QUIZZES_TYPES.LivePollService)
   private pollService: LivePollService
 ) {}

 @Authorized(['admin', 'instructor'])
 @Post('/')
 createPoll(@Body() input: LivePollInput, @CurrentUser() user: any) {
   return this.pollService.createPoll(input, user.id);
 }

 @Authorized(['admin', 'student'])
 @Get('/active')
 getActivePoll() {
   return this.pollService.getActivePoll();
 }

 @Authorized(['admin', 'student'])
 @Post('/answer')
 submitAnswer(@Body() body: { pollId: string; answerIndex: number }, @CurrentUser() user: any) {
   const success = this.pollService.submitAnswer(body.pollId, user.id, body.answerIndex);
   return { success };
 }

 @Authorized(['admin', 'instructor', 'student'])
 @Get('/results/:id')
 getResults(@Param('id') id: string) {
   return this.pollService.getResults(id);
 }
}
