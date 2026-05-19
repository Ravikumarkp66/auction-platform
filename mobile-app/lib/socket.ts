import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket'], // Better for React Native
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
