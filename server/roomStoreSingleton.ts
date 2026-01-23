// ============================================================================
// ROOM STORE SINGLETON - True Singleton Pattern
// ============================================================================
// This module provides a singleton RoomStore that persists across:
// - Multiple socket connections
// - Hot reloads (tsx watch, nodemon)
// - Module re-imports
// ============================================================================

import { v4 as uuidv4 } from 'uuid';

// Simplified interfaces for room management
export interface SimplePlayer {
  id: string;
  name: string;
  avatar: string;
}

export interface SimpleRoom {
  id: string;
  name: string;
  players: SimplePlayer[];
  isPublic: boolean;
  turnTimer: number; // in seconds (0, 15, 30, 60)
  createdAt: number;
}

// Declare global type for the singleton
declare global {
  // eslint-disable-next-line no-var
  var __ROOM_STORE_SINGLETON__: RoomStore | undefined;
}

/**
 * RoomStore - Singleton class for managing game rooms
 * Uses Node.js global object to persist across hot reloads
 */
class RoomStore {
  private rooms: Map<string, SimpleRoom>;

  private constructor() {
    // Check if singleton already exists in global
    if ((global as any).__ROOM_STORE_SINGLETON__) {
      // Reuse existing instance (hot reload scenario)
      const existing = (global as any).__ROOM_STORE_SINGLETON__;
      this.rooms = existing.rooms;
      console.log(`🔄 RoomStore: Reusing existing singleton (${this.rooms.size} rooms)`);
    } else {
      // Create new Map
      this.rooms = new Map<string, SimpleRoom>();
      console.log(`✨ RoomStore: Created new singleton`);
    }
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): RoomStore {
    if (!(global as any).__ROOM_STORE_SINGLETON__) {
      (global as any).__ROOM_STORE_SINGLETON__ = new RoomStore();
    }
    return (global as any).__ROOM_STORE_SINGLETON__;
  }

  /**
   * Create a new room
   */
  createRoom(
    player: SimplePlayer,
    roomName: string,
    isPublic: boolean = false,
    turnTimer: number = 30
  ): SimpleRoom {
    // Generate unique room ID
    const roomId = "LOBBY_" + Math.random().toString(36).substring(7).toUpperCase();
    
    // Validate turn timer
    const validTurnTimer = [0, 15, 30, 60].includes(turnTimer) ? turnTimer : 30;
    
    const room: SimpleRoom = {
      id: roomId,
      name: roomName,
      players: [player],
      isPublic: isPublic,
      turnTimer: validTurnTimer,
      createdAt: Date.now()
    };
    
    // Save to Map
    this.rooms.set(roomId, room);
    
    console.log(`✅ RoomStore: Created room '${roomId}' by ${player.name}`);
    console.log(`📋 RoomStore: Total rooms: ${this.rooms.size}, Keys: [${Array.from(this.rooms.keys()).join(', ')}]`);
    
    return room;
  }

  /**
   * Join an existing room
   */
  joinRoom(player: SimplePlayer, roomId: string): SimpleRoom {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      const availableRooms = Array.from(this.rooms.keys());
      console.error(`❌ RoomStore: Room '${roomId}' not found`);
      console.error(`📋 RoomStore: Available rooms: [${availableRooms.join(', ')}]`);
      throw new Error(`Room '${roomId}' not found`);
    }
    
    // Check if player is already in room (reconnection)
    const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex !== -1) {
      console.log(`🔄 RoomStore: Player ${player.name} reconnecting to room '${roomId}'`);
      // Update player info
      room.players[existingPlayerIndex] = player;
      return room;
    }
    
    // Check if room is full
    if (room.players.length >= 4) {
      throw new Error(`Room '${roomId}' is full (${room.players.length}/4 players)`);
    }
    
    // Add player to room
    room.players.push(player);
    
    console.log(`✅ RoomStore: Player ${player.name} joined room '${roomId}'`);
    console.log(`📋 RoomStore: Room '${roomId}' now has ${room.players.length} players`);
    
    return room;
  }

  /**
   * Get a room by ID
   */
  getRoom(roomId: string): SimpleRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get all public rooms
   */
  getPublicRooms(): SimpleRoom[] {
    return Array.from(this.rooms.values()).filter(room => room.isPublic);
  }

  /**
   * Get all room IDs
   */
  getAllRoomIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * Get total room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Delete a room
   */
  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }
}

// Export singleton instance
export const roomStore = RoomStore.getInstance();
