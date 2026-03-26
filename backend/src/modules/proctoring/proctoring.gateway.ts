import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

type MonitoringSignal =
  | RTCSessionDescriptionInit
  | {
      type: 'ice-candidate';
      candidate: RTCIceCandidateInit;
    };

type SessionMembership = {
  role: 'participant' | 'admin';
  sessionId: string;
};

@WebSocketGateway({
  namespace: '/monitoring',
  cors: {
    origin: true,
  },
})
export class ProctoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly participantBySession = new Map<string, string>();
  private readonly adminsBySession = new Map<string, Set<string>>();
  private readonly membershipBySocket = new Map<string, SessionMembership>();

  handleConnection() {
    return;
  }

  handleDisconnect(client: Socket) {
    this.removeSocketMembership(client.id);
  }

  @SubscribeMessage('participant:join')
  handleParticipantJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    if (!body?.sessionId) return;

    this.removeSocketMembership(client.id);
    client.join(this.roomName(body.sessionId));

    const previousParticipantSocketId = this.participantBySession.get(body.sessionId);
    if (previousParticipantSocketId && previousParticipantSocketId !== client.id) {
      this.server.to(previousParticipantSocketId).emit('participant:replaced', {
        sessionId: body.sessionId,
      });
      this.removeSocketMembership(previousParticipantSocketId);
    }

    this.participantBySession.set(body.sessionId, client.id);
    this.membershipBySocket.set(client.id, {
      role: 'participant',
      sessionId: body.sessionId,
    });

    this.server.to(this.roomName(body.sessionId)).emit('participant:presence', {
      sessionId: body.sessionId,
      online: true,
    });
  }

  @SubscribeMessage('admin:join')
  handleAdminJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    if (!body?.sessionId) return;

    this.removeSocketMembership(client.id);
    client.join(this.roomName(body.sessionId));

    const admins = this.adminsBySession.get(body.sessionId) || new Set<string>();
    admins.add(client.id);
    this.adminsBySession.set(body.sessionId, admins);
    this.membershipBySocket.set(client.id, {
      role: 'admin',
      sessionId: body.sessionId,
    });

    client.emit('participant:presence', {
      sessionId: body.sessionId,
      online: this.participantBySession.has(body.sessionId),
    });
  }

  @SubscribeMessage('admin:watch')
  handleAdminWatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    if (!body?.sessionId) return;

    const participantSocketId = this.participantBySession.get(body.sessionId);
    if (!participantSocketId) {
      client.emit('participant:presence', {
        sessionId: body.sessionId,
        online: false,
      });
      return;
    }

    this.server.to(participantSocketId).emit('admin:viewer-joined', {
      sessionId: body.sessionId,
      viewerSocketId: client.id,
    });
  }

  @SubscribeMessage('participant:signal')
  handleParticipantSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      sessionId: string;
      targetSocketId: string;
      signal: MonitoringSignal;
    },
  ) {
    const membership = this.membershipBySocket.get(client.id);
    if (!membership || membership.role !== 'participant' || membership.sessionId !== body?.sessionId) return;

    this.server.to(body.targetSocketId).emit('participant:signal', {
      sessionId: body.sessionId,
      participantSocketId: client.id,
      signal: body.signal,
    });
  }

  @SubscribeMessage('admin:signal')
  handleAdminSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      sessionId: string;
      targetSocketId: string;
      signal: MonitoringSignal;
    },
  ) {
    const membership = this.membershipBySocket.get(client.id);
    if (!membership || membership.role !== 'admin' || membership.sessionId !== body?.sessionId) return;

    this.server.to(body.targetSocketId).emit('admin:signal', {
      sessionId: body.sessionId,
      viewerSocketId: client.id,
      signal: body.signal,
    });
  }

  private removeSocketMembership(socketId: string) {
    const membership = this.membershipBySocket.get(socketId);
    if (!membership) return;

    this.membershipBySocket.delete(socketId);

    if (membership.role === 'participant') {
      if (this.participantBySession.get(membership.sessionId) === socketId) {
        this.participantBySession.delete(membership.sessionId);
      }

      this.server.to(this.roomName(membership.sessionId)).emit('participant:presence', {
        sessionId: membership.sessionId,
        online: false,
      });
      return;
    }

    const admins = this.adminsBySession.get(membership.sessionId);
    admins?.delete(socketId);
    if (admins && admins.size === 0) {
      this.adminsBySession.delete(membership.sessionId);
    }

    const participantSocketId = this.participantBySession.get(membership.sessionId);
    if (participantSocketId) {
      this.server.to(participantSocketId).emit('admin:viewer-left', {
        sessionId: membership.sessionId,
        viewerSocketId: socketId,
      });
    }
  }

  private roomName(sessionId: string) {
    return `session:${sessionId}`;
  }
}
