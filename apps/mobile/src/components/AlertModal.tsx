import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type AlertModalButton = {
  onPress?: () => void;
  style?: 'cancel' | 'default' | 'destructive';
  text?: string;
};

type AlertModalRequest = {
  buttons: AlertModalButton[];
  message?: string;
  title: string;
};

type AlertModalContextValue = {
  showAlert: (
    title: string,
    message?: string,
    buttons?: AlertModalButton[],
  ) => void;
};

const AlertModalContext = createContext<AlertModalContextValue | undefined>(
  undefined,
);

const DEFAULT_BUTTONS: AlertModalButton[] = [{ text: '확인' }];

export function AlertModalProvider({ children }: PropsWithChildren) {
  const [request, setRequest] = useState<AlertModalRequest>();

  const showAlert = useCallback(
    (title: string, message?: string, buttons = DEFAULT_BUTTONS) => {
      setRequest({
        buttons: buttons.length > 0 ? buttons : DEFAULT_BUTTONS,
        message,
        title,
      });
    },
    [],
  );

  const contextValue = useMemo(() => ({ showAlert }), [showAlert]);

  const selectButton = useCallback((button: AlertModalButton) => {
    setRequest(undefined);
    button.onPress?.();
  }, []);

  const dismissWithCancel = useCallback(() => {
    if (!request) {
      return;
    }

    const cancelButton = request.buttons.find(
      (button) => button.style === 'cancel',
    );

    setRequest(undefined);
    cancelButton?.onPress?.();
  }, [request]);

  return (
    <AlertModalContext.Provider value={contextValue}>
      {children}
      <Modal
        animationType="fade"
        navigationBarTranslucent
        onRequestClose={dismissWithCancel}
        statusBarTranslucent
        transparent
        visible={Boolean(request)}
      >
        <View accessibilityViewIsModal style={styles.overlay}>
          {request ? (
            <View
              accessibilityLabel={`${request.title}. ${request.message ?? ''}`}
              accessibilityRole="alert"
              style={styles.dialog}
            >
              <View style={styles.copy}>
                <Text style={styles.title}>{request.title}</Text>
                {request.message ? (
                  <Text style={styles.message}>{request.message}</Text>
                ) : null}
              </View>

              <View style={styles.actions}>
                {request.buttons.map((button, index) => (
                  <Pressable
                    accessibilityRole="button"
                    key={`${button.text ?? '확인'}-${index}`}
                    onPress={() => selectButton(button)}
                    style={({ pressed }) => [
                      styles.action,
                      index > 0 && styles.actionDivider,
                      pressed && styles.pressedAction,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionLabel,
                        button.style === 'destructive'
                          ? styles.destructiveLabel
                          : button.style === 'cancel'
                            ? styles.cancelLabel
                            : styles.defaultLabel,
                      ]}
                    >
                      {button.text ?? '확인'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </AlertModalContext.Provider>
  );
}

export function useAlertModal() {
  const context = useContext(AlertModalContext);

  if (!context) {
    throw new Error('useAlertModal must be used within AlertModalProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  dialog: {
    overflow: 'hidden',
    width: '100%',
    maxWidth: 310,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  copy: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    color: '#172033',
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: -0.45,
    lineHeight: 28,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: 'rgba(15, 23, 42, 0.7)',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.35,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    height: 52,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  actionDivider: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(15, 23, 42, 0.08)',
  },
  pressedAction: {
    backgroundColor: '#F8FAFC',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  cancelLabel: {
    color: 'rgba(15, 23, 42, 0.4)',
  },
  defaultLabel: {
    color: '#00C471',
  },
  destructiveLabel: {
    color: '#DE5E56',
  },
});
