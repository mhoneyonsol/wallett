import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ReactNode } from 'react';

interface DialogFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  children: ReactNode;
  [key: string]: unknown;
}

const DialogForm: React.FC<DialogFormProps> = ({
  open,
  onClose,
  onSubmit,
  children,
  ...rest
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('xs'));

  return (
    <Dialog
      open={open}
      PaperProps={{
        component: 'form',
        onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          if (onSubmit) {
            onSubmit();
          }
        },
      }}
      onClose={onClose}
      fullScreen={fullScreen}
      {...rest}
    >
      {children}
    </Dialog>
  );
};

export default DialogForm;
