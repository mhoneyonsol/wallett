import React from 'react';
import { Container, Grid } from '@mui/material';
import BalancesList from '../components/BalancesList';
import { makeStyles } from 'tss-react/mui';
import { useIsExtensionWidth } from '../utils/utils';

const useStyles = makeStyles()((theme) => {
  return {
    container: {
      [theme.breakpoints.down(theme.ext)]: {
        padding: 0,
      },
      [theme.breakpoints.up(theme.ext)]: {
        maxWidth: 'md',
      },
    },
    balancesContainer: {
      [theme.breakpoints.down(theme.ext)]: {
        marginBottom: 24,
      },
    },
  };
});

export default function WalletPage() {
  const classes = useStyles();
  const isExtensionWidth = useIsExtensionWidth();
  return (
    <Container fixed maxWidth="md" className={classes.container}>
      <Grid container spacing={isExtensionWidth ? 0 : 3}>
        <Grid item xs={12} className={classes.balancesContainer}>
          <BalancesList />
        </Grid>
      </Grid>
    </Container>
  );
}
