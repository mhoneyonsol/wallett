import React, { CSSProperties, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { makeStyles } from 'tss-react/mui';
import { useEffectAfterTimeout } from '../utils/utils';
import { Theme } from '@mui/material';

const useStyles = makeStyles()((theme: Theme) => {
  return {
    root: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      padding: theme.spacing(2),
    },
  };
});

interface LoadingIndicatorProps {
  height?: string | number | null;
  delay?: number;
  [key: string]: unknown;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  height = null,
  delay = 500,
  ...rest
}) => {
  const { classes } = useStyles();
  const [visible, setVisible] = useState(false);

  useEffectAfterTimeout(() => setVisible(true), delay);

  const style: CSSProperties = {};
  if (height) {
    style.height = height;
  }

  if (!visible) {
    return height ? <div style={style} /> : null;
  }

  return (
    <div className={classes.root} style={style} {...rest}>
      <CircularProgress />
    </div>
  );
};

export default LoadingIndicator;
