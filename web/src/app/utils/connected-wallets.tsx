import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

interface ConnectedWallets {
  [key: string]: string;
}

interface ConnectedWalletsContextValue {
  connectedWallets: ConnectedWallets;
}

interface ConnectedWalletsProviderProps {
  children: ReactNode;
}

const ConnectedWalletsContext = createContext<
  ConnectedWalletsContextValue | undefined
>(undefined);

export const ConnectedWalletsProvider: React.FC<
  ConnectedWalletsProviderProps
> = ({ children }) => {
  const [connectedWallets, setConnectedWallets] = useState({});

  useEffect(() => {
    const updateConnectionAmount = () => {
      chrome.storage.local.get('connectedWallets', (result) => {
        setConnectedWallets(result.connectedWallets || {});
      });
    };
    const listener = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if ('connectedWallets' in changes) {
        updateConnectionAmount();
      }
    };
    updateConnectionAmount();
    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);

  return (
    <ConnectedWalletsContext.Provider value={{ connectedWallets }}>
      {children}
    </ConnectedWalletsContext.Provider>
  );
};

export const useConnectedWallets = () => useContext(ConnectedWalletsContext);
