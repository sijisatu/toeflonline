import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway({
  namespace: '/monitoring',
  cors: {
    origin: true,
  },
})
export class ProctoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  handleConnection() {
    return;
  }

  handleDisconnect() {
    return;
  }
}
