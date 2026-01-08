import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { Capacitor } from '@capacitor/core';

interface UseNativeHardwareOptions {
  view: 'WELCOME' | 'LOBBY' | 'GAME_TABLE' | 'VICTORY' | 'TUTORIAL';
  isModalOpen: boolean;
  onCloseModal?: () => void;
  onExitRoom?: () => void;
}

/**
 * Hook to handle native Android hardware back button behavior
 * - If modal is open: closes the modal
 * - If in a Room (LOBBY or GAME_TABLE): exits the room
 * - If on Home (WELCOME): shows exit confirmation dialog
 */
export const useNativeHardware = ({
  view,
  isModalOpen,
  onCloseModal,
  onExitRoom,
}: UseNativeHardwareOptions) => {
  useEffect(() => {
    // Only set up listener on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const backButtonHandler = App.addListener('backButton', async ({ canGoBack }) => {
      // If a modal is open, close it first
      if (isModalOpen && onCloseModal) {
        onCloseModal();
        return;
      }

      // If user is in a Room (LOBBY or GAME_TABLE), exit the room
      if ((view === 'LOBBY' || view === 'GAME_TABLE') && onExitRoom) {
        onExitRoom();
        return;
      }

      // If user is on Home screen (WELCOME), show exit confirmation
      if (view === 'WELCOME') {
        const { value } = await Dialog.confirm({
          title: 'Exit Thirteen?',
          message: 'Are you sure you want to exit?',
          okButtonTitle: 'Exit',
          cancelButtonTitle: 'Cancel',
        });
        
        if (value) {
          App.exitApp();
        }
      } else {
        // For other views, try to go back in history
        if (canGoBack) {
          window.history.back();
        } else {
          // If can't go back, show exit confirmation
          const { value } = await Dialog.confirm({
            title: 'Exit Thirteen?',
            message: 'Are you sure you want to exit?',
            okButtonTitle: 'Exit',
            cancelButtonTitle: 'Cancel',
          });
          
          if (value) {
            App.exitApp();
          }
        }
      }
    });

    return () => {
      backButtonHandler.remove();
    };
  }, [view, isModalOpen, onCloseModal, onExitRoom]);
};
