/**
 * Local Discovery Service
 * Handles Wi-Fi/Hotspot detection and local network game hosting
 */

export interface LocalNetworkInfo {
  isLocalNetwork: boolean;
  networkType: 'wifi' | 'hotspot' | 'unknown';
  canHost: boolean;
}

export interface LocalRoom {
  roomCode: string;
  hostName: string;
  hostAvatar: string;
  playerCount: number;
  maxPlayers: number;
}

class LocalDiscoveryService {
  private localRooms: Map<string, LocalRoom> = new Map();
  private isHosting: boolean = false;
  private currentRoomCode: string | null = null;

  /**
   * Detect if user is on a local network (Wi-Fi or Hotspot)
   */
  async detectLocalNetwork(): Promise<LocalNetworkInfo> {
    try {
      // Check if we're in a browser environment
      if (typeof navigator === 'undefined') {
        return { isLocalNetwork: false, networkType: 'unknown', canHost: false };
      }

      // Check connection API if available
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        const type = connection.type || connection.effectiveType;
        // WiFi types: 'wifi', 'ethernet'
        // Mobile types: 'cellular', '2g', '3g', '4g', '5g'
        const isWifi = type === 'wifi' || type === 'ethernet';
        
        if (isWifi) {
          return { isLocalNetwork: true, networkType: 'wifi', canHost: true };
        }
      }

      // Fallback: Check if we can access local network features
      // In a real implementation, you might check for WebRTC or other local networking APIs
      // For now, we'll allow hosting if on a non-cellular connection
      const isLikelyLocal = !connection || connection.type !== 'cellular';
      
      return {
        isLocalNetwork: isLikelyLocal,
        networkType: isLikelyLocal ? 'wifi' : 'unknown',
        canHost: isLikelyLocal
      };
    } catch (error) {
      console.warn('LocalDiscovery: Error detecting network:', error);
      // Default to allowing local network (optimistic)
      return { isLocalNetwork: true, networkType: 'wifi', canHost: true };
    }
  }

  /**
   * Generate a 4-digit room code for local hosting
   */
  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Host a local room
   */
  async hostRoom(hostName: string, hostAvatar: string): Promise<string> {
    const networkInfo = await this.detectLocalNetwork();
    
    if (!networkInfo.canHost) {
      throw new Error('Cannot host on this network. Please connect to Wi-Fi or a hotspot.');
    }

    const roomCode = this.generateRoomCode();
    const room: LocalRoom = {
      roomCode,
      hostName,
      hostAvatar,
      playerCount: 1,
      maxPlayers: 4
    };

    this.localRooms.set(roomCode, room);
    this.isHosting = true;
    this.currentRoomCode = roomCode;

    // Broadcast room availability (in a real implementation, this would use mDNS, WebRTC, or similar)
    this.broadcastRoom(room);

    return roomCode;
  }

  /**
   * Join a local room by code
   */
  async joinRoom(roomCode: string, playerName: string, playerAvatar: string): Promise<LocalRoom | null> {
    const room = this.localRooms.get(roomCode.toUpperCase());
    
    if (!room) {
      return null;
    }

    if (room.playerCount >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    room.playerCount++;
    this.localRooms.set(roomCode.toUpperCase(), room);

    return room;
  }

  /**
   * Stop hosting current room
   */
  stopHosting(): void {
    if (this.currentRoomCode) {
      this.localRooms.delete(this.currentRoomCode);
      this.currentRoomCode = null;
    }
    this.isHosting = false;
  }

  /**
   * Get current room if hosting
   */
  getCurrentRoom(): LocalRoom | null {
    if (!this.currentRoomCode) return null;
    return this.localRooms.get(this.currentRoomCode) || null;
  }

  /**
   * Check if currently hosting
   */
  isCurrentlyHosting(): boolean {
    return this.isHosting;
  }

  /**
   * Broadcast room availability (placeholder for local network discovery)
   * In a real implementation, this would use:
   * - mDNS/Bonjour for local network discovery
   * - WebRTC for peer-to-peer connections
   * - WebSocket server on local network
   */
  private broadcastRoom(room: LocalRoom): void {
    // Placeholder: In a real implementation, this would broadcast via mDNS or similar
    console.log('LocalDiscovery: Broadcasting room', room.roomCode);
  }

  /**
   * Discover available local rooms
   */
  async discoverRooms(): Promise<LocalRoom[]> {
    // In a real implementation, this would scan the local network for available rooms
    // For now, return rooms that are being hosted
    return Array.from(this.localRooms.values());
  }
}

export const localDiscoveryService = new LocalDiscoveryService();
