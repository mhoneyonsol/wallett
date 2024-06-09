import { ReactNode, createContext, useContext, useState } from 'react';

type PageContextType = [string, React.Dispatch<React.SetStateAction<string>>];

const PageContext = createContext<PageContextType>(['wallet', () => {}]);

export const PageProvider = ({ children }: { children: ReactNode }) => {
  const [page, setPage] = useState<string>('wallet');

  return (
    <PageContext.Provider value={[page, setPage]}>
      {children}
    </PageContext.Provider>
  );
};

export const usePage = () => useContext(PageContext);
